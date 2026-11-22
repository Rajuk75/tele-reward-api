import mongoose from 'mongoose';
import Tracking from '../tracking/tracking.model.js';
import OfferReferral from '../referrals/offerReferral.model.js';
import Offer from '../offers/offer.model.js';
import Revenue from '../conversions/revenue.model.js';
import PostbackLog from './postbackLog.model.js';
import Payout from '../payouts/payout.model.js';
import { matchMilestone } from '../tracking/milestones.js';

export default function recordMilestone(id, query, ip, scrub) {
    return mongoose.connection.transaction(async session => {
        const click = await Tracking.findById(id).session(session);
        const row = matchMilestone(click.milestones, query);
        if (row.status !== 'pending') {
            return { duplicate: true, event: row.eventKey, status: click.status };
        }
        if (!['clicked', 'partially_completed'].includes(click.status)) throw new Error('Click is closed');

        const now = new Date();
        const scrubbed = scrub();
        const user = scrubbed ? 0 : row.userSharePaise;
        const referrer = scrubbed ? 0 : row.referrerSharePaise;
        row.status = scrubbed ? 'scrubbed' : 'completed';
        row.completedAt = now;
        row.advertiserTxId = query.txid || query.transaction_id || null;
        row.conversionIp = ip;
        click.earnedUserAmountPaise += user;
        click.earnedReferrerAmountPaise += referrer;
        const done = click.milestones.every(item => item.status !== 'pending');
        click.status = !done ? 'partially_completed' :
            click.milestones.every(item => item.status === 'scrubbed') ? 'scrubbed' : 'completed';
        if (done) click.conversionDate = now;
        click.postbackReceived = true;
        click.completedEvent = row.eventName;
        click.amountAwarded = user / 100;
        click.totalAmountAwarded = click.earnedUserAmountPaise / 100;
        click.userRewardINR = click.totalAmountAwarded;
        click.advertiserAmount += row.advertiserPayoutPaise / 100;
        click.completedEvents.push({
            eventId: row.campaignEventId, eventName: row.eventName, order: row.order,
            amountAwarded: user / 100, completedAt: now, advertiserTxId: row.advertiserTxId,
            conversionIp: ip, approvalStatus: scrubbed ? 'scrubbed' : 'auto_approved'
        });
        await click.save({ session });

        // 1. Record Revenue & Margin for Admin
        await Revenue.create([{
            trackingId: id, offerId: click.offerId, campaignId: click.campaignId, userId: click.userId,
            eventName: row.eventKey, advertiserAmount: row.advertiserPayoutPaise / 100,
            userReward: (user + referrer) / 100, margin: (row.advertiserPayoutPaise - user - referrer) / 100,
            status: 'settled', settledAt: now
        }], { session });

        // 2. Generate Payout Records (User & Referrer)
        if (!scrubbed) {
            const payoutsToCreate = [];

            // 2a. Payout for User completing the task
            if (user > 0) {
                payoutsToCreate.push({
                    type: 'offer_completion',
                    trackingId: id,
                    clickId: click.clickId,
                    offerId: click.offerId,
                    userId: click.userId || null,
                    payoutAccount: click.payoutAccount,
                    payoutType: click.payoutType || 'UPI',
                    payoutHolderName: click.payoutHolderName || null,
                    payoutIfsc: click.payoutIfsc || null,
                    amount: user / 100,
                    status: 'unpaid',
                    notes: `Reward for ${row.eventName} event`
                });
            }

            // 2b. Payout for Referrer sharing the deal
            if (click.referralId && referrer > 0) {
                const referralDoc = await OfferReferral.findById(click.referralId).session(session);
                if (referralDoc) {
                    referralDoc.totalEarnings += (referrer / 100);
                    if (click.status === 'completed') {
                        referralDoc.totalConversions += 1;
                    }
                    await referralDoc.save({ session });

                    payoutsToCreate.push({
                        type: 'offer_referral',
                        trackingId: id,
                        clickId: click.clickId,
                        offerId: click.offerId,
                        payoutAccount: referralDoc.referrerAccount,
                        payoutType: referralDoc.referrerType || 'UPI',
                        payoutHolderName: referralDoc.referrerHolderName || null,
                        payoutIfsc: referralDoc.referrerIfsc || null,
                        amount: referrer / 100,
                        status: 'unpaid',
                        notes: `Referral commission for ${row.eventName} (${referralDoc.referralCode})`
                    });
                }
            }

            if (payoutsToCreate.length > 0) {
                await Payout.create(payoutsToCreate, { session });
            }
        }

        // 3. Increment Offer Install Stats
        if (row.eventKey === 'install' && !scrubbed) {
            await Offer.updateOne({ _id: click.offerId }, { $inc: { currentInstalls: 1 } }, { session });
        }

        // 4. Create Postback Log
        await PostbackLog.create([{ clickId: click.clickId, offerId: click.offerId, ipAddress: ip,
            status: 'success', notes: row.status, fullQuery: { event: row.eventKey, txid: row.advertiserTxId }
        }], { session });

        return { event: row.eventKey, status: click.status, amountAwarded: user / 100,
            earnedUserAmountPaise: click.earnedUserAmountPaise, scrubbed };
    });
}
