import mongoose from 'mongoose';
import Tracking from '../../tracking/tracking.model.js';
import OfferReferral from '../../referrals/offerReferral.model.js';
import Offer from '../../offers/offer.model.js';
import Revenue from '../../conversions/revenue.model.js';
import PostbackLog from '../postbackLog.model.js';
import Payout from '../../payouts/payout.model.js';

// =============================================================================
// STEP 3: ATOMIC POSTBACK SETTLEMENT PIPELINE
// =============================================================================
// Handles state transitions, financial calculations, payout distributions,
// and concurrent ledger writes within an isolated MongoDB transaction session.
// =============================================================================
export async function settlePostback({ trackingId, matchedEvent, row, query, ip, isScrubbed }) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // =====================================================================
        // 1. FETCH TRACKING DOCUMENT & LOCATE TARGET EVENT
        // =====================================================================
        const click = await Tracking.findById(trackingId).session(session);
        if (!click) throw new Error('Click tracking record not found');

        const activeEvent = matchedEvent || row;
        const targetEvent = click.milestones.find(
            m => String(m.campaignEventId) === String(activeEvent.campaignEventId)
        );
        if (!targetEvent) throw new Error('Target event not found in tracking record');

        if (targetEvent.status !== 'pending') {
            throw new Error(`Event [${targetEvent.eventKey}] already completed`);
        }

        const now = new Date();
        const userRewardPaise = isScrubbed ? 0 : targetEvent.userSharePaise;
        const referrerRewardPaise = isScrubbed ? 0 : targetEvent.referrerSharePaise;

        // =====================================================================
        // 2. IN-MEMORY TRACKING DOCUMENT MUTATIONS (STORED IN PAISE)
        // =====================================================================
        targetEvent.status = isScrubbed ? 'scrubbed' : 'completed';
        targetEvent.completedAt = now;
        targetEvent.advertiserTxId = query.txid || query.transaction_id || null;
        targetEvent.conversionIp = ip;

        click.earnedUserAmountPaise = (click.earnedUserAmountPaise || 0) + userRewardPaise;
        click.earnedReferrerAmountPaise = (click.earnedReferrerAmountPaise || 0) + referrerRewardPaise;

        const allMilestonesDone = click.milestones.every(item => item.status !== 'pending');
        click.status = !allMilestonesDone
            ? 'partially_completed'
            : (click.milestones.every(m => m.status === 'scrubbed') ? 'scrubbed' : 'completed');

        if (allMilestonesDone) click.conversionDate = now;
        click.postbackReceived = true;
        click.amountAwarded = userRewardPaise;
        click.totalAmountAwarded = click.earnedUserAmountPaise;
        click.advertiserAmount = (click.advertiserAmount || 0) + targetEvent.advertiserPayoutPaise;

        click.completedEvents.push({
            eventId: targetEvent.campaignEventId,
            eventName: targetEvent.eventName,
            order: targetEvent.order,
            amountAwarded: userRewardPaise,
            completedAt: now,
            advertiserTxId: targetEvent.advertiserTxId,
            conversionIp: ip,
            approvalStatus: isScrubbed ? 'scrubbed' : 'auto_approved'
        });

        // =====================================================================
        // 3. FETCH REFERRAL DOCUMENT (IF REFERRAL CONVERSION EXISTS)
        // =====================================================================
        let referralDoc = null;
        if (!isScrubbed && click.referralId && referrerRewardPaise > 0) {
            referralDoc = await OfferReferral.findById(click.referralId).lean().session(session);
        }

        // =====================================================================
        // 4. PREPARE & CREATE PAYOUT DOCUMENTS (AMOUNTS IN PAISE)
        // =====================================================================
        let createdPayouts = [];
        if (!isScrubbed) {
            const payoutsToCreate = [];

            // User Payout (Task Completion + Spin Bonus merged into a single transfer)
            if (userRewardPaise > 0) {
                let totalUserPayoutPaise = userRewardPaise;
                let payoutNotes = `Reward for ${targetEvent.eventName} event`;

                // If user won a spin bonus and it is not paid yet, bundle into this event payout
                if (click.spinReward?.bonusPaise > 0 && !click.spinReward?.isPaid) {
                    totalUserPayoutPaise += click.spinReward.bonusPaise;
                    click.spinReward.isPaid = true;
                    click.spinReward.paidAt = now;
                    payoutNotes += ` (Includes ₹${(click.spinReward.bonusPaise / 100).toFixed(2)} Lucky Spin Bonus)`;
                }

                payoutsToCreate.push({
                    type: 'offer_completion',
                    trackingId,
                    clickId: click.clickId,
                    offerId: click.offerId,
                    eventName: targetEvent.eventKey,
                    userId: click.userId || null,
                    payoutAccount: click.payoutAccount,
                    payoutType: click.payoutType || 'UPI',
                    payoutHolderName: click.payoutHolderName || null,
                    payoutIfsc: click.payoutIfsc || null,
                    amount: totalUserPayoutPaise,
                    status: 'unpaid',
                    notes: payoutNotes
                });
            }

            // Referrer Payout (Referral Commission)
            if (referralDoc) {
                payoutsToCreate.push({
                    type: 'offer_referral',
                    trackingId,
                    clickId: click.clickId,
                    offerId: click.offerId,
                    eventName: targetEvent.eventKey,
                    payoutAccount: referralDoc.referrerAccount,
                    payoutType: referralDoc.referrerType || 'UPI',
                    payoutHolderName: referralDoc.referrerHolderName || null,
                    payoutIfsc: referralDoc.referrerIfsc || null,
                    amount: referrerRewardPaise,
                    status: 'unpaid',
                    notes: `Referral commission for ${targetEvent.eventName} (${referralDoc.referralCode})`
                });
            }

            if (payoutsToCreate.length > 0) {
                createdPayouts = await Payout.create(payoutsToCreate, { session, ordered: true });
            }
        }

        // =====================================================================
        // 5. ATOMIC STATS INCREMENTS (OFFER REFERRAL & OFFER INSTALLS)
        // =====================================================================
        if (referralDoc) {
            const incFields = { totalEarnings: referrerRewardPaise };
            if (click.status === 'completed') incFields.totalConversions = 1;
            await OfferReferral.updateOne({ _id: click.referralId }, { $inc: incFields }, { session });
        }

        const isFirstInstallEvent = !isScrubbed && (targetEvent.order === 1 || targetEvent.eventKey.toLowerCase().includes('install'));
        if (isFirstInstallEvent) {
            await Offer.updateOne({ _id: click.offerId }, { $inc: { currentInstalls: 1 } }, { session });
        }

        // =====================================================================
        // 6. CONCURRENT CORE DATABASE WRITES (ATOMIC PROMISE.ALL)
        // =====================================================================
        const [savedClick, [createdRevenue], [createdPostbackLog]] = await Promise.all([
            click.save({ session }),
            Revenue.create([{
                trackingId,
                offerId: click.offerId,
                campaignId: click.campaignId,
                userId: click.userId || null,
                eventName: targetEvent.eventKey,
                advertiserAmount: targetEvent.advertiserPayoutPaise,
                userReward: userRewardPaise + referrerRewardPaise,
                margin: targetEvent.advertiserPayoutPaise - userRewardPaise - referrerRewardPaise,
                status: 'settled',
                settledAt: now
            }], { session }),
            PostbackLog.create([{
                clickId: click.clickId,
                offerId: click.offerId,
                ipAddress: ip,
                status: isScrubbed ? 'scrubbed' : 'success',
                notes: `Event [${targetEvent.eventKey}] processed with status [${targetEvent.status}]`,
                fullQuery: query
            }], { session })
        ]);

        // =====================================================================
        // 7. COMMIT ATOMIC TRANSACTION SESSION
        // =====================================================================
        await session.commitTransaction();

        return {
            status: 'SUCCESS',
            event: targetEvent.eventKey,
            eventName: targetEvent.eventName,
            clickStatus: click.status,
            userRewardPaise,
            referrerRewardPaise,
            userRewardINR: userRewardPaise / 100,
            referrerRewardINR: referrerRewardPaise / 100,
            earnedUserAmountPaise: click.earnedUserAmountPaise,
            earnedUserAmountINR: click.earnedUserAmountPaise / 100,
            scrubbed: isScrubbed,
            tracking: click,
            payouts: createdPayouts,
            referralDoc
        };
    } catch (error) {
        // =====================================================================
        // 8. ABORT TRANSACTION ON FAILURE
        // =====================================================================
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
}
