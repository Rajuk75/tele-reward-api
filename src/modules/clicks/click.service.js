import { v4 as uuidv4 } from 'uuid';
import mongoose from 'mongoose';
import resolveReferral from '../referrals/resolveReferral.js';
import { snapshotMilestones } from '../tracking/milestones.js';
import OfferEvent from '../offers/offerEvent.model.js';
import crypto from 'crypto';
import clickRepo from './click.repo.js';
import { buildTrackingUrl } from '../../core/urlBuilder.js';
import logger from '../../core/logger.js';

class ClickService {
    async generateClick(offerId, data, reqMeta = {}) {
        try {
            const payoutAccount = (data.payoutAccount || '').trim();
            if (!payoutAccount) {
                throw new Error('Please enter your Bank Account Number or UPI ID to receive reward');
            }

            if ((data.payoutType || '').toUpperCase() === 'BANK') {
                if (!/^[0-9]{9,18}$/.test(payoutAccount)) {
                    throw new Error('Bank Account Number must be between 9 and 18 digits');
                }
            }

            const [offer, alreadyCompleted] = await Promise.all([
                clickRepo.findOfferForClick(offerId),
                clickRepo.findCompletedClick(offerId, payoutAccount)
            ]);

            // Validate both offer & campaign are active and not deleted
            const campaign = offer?.campaignId;
            if (!offer || offer.isDeleted || offer.status !== 'active' || !offer.isActive || !campaign || campaign.isDeleted || campaign.status !== 'active') {
                throw new Error('Offer or Campaign is inactive');
            }

            if (alreadyCompleted) {
                throw new Error(`This payout account (${payoutAccount}) has already completed this offer!`);
            }

            const userRewardINR = offer.firstEventPayout ?? offer.totalPayout ?? 0;
            const advertiserAmount = offer.events?.[0]?.campaignEventId?.advertiserPayout || 0;
            const defaultUrl = offer.campaignUrl || campaign?.campaignUrl || '';
            const destinationUrl = this._resolveDestinationUrl(offer, payoutAccount, defaultUrl);

            const clickId = uuidv4();
            const now = new Date();

            const record = {
                clickId,
                offerId: offer._id,
                campaignId: campaign?._id || null,
                payoutAccount,
                payoutType: (data.payoutType || 'UPI').toUpperCase(),
                payoutHolderName: data.payoutHolderName?.trim() || null,
                payoutIfsc: data.payoutIfsc?.trim() || null,
                status: 'clicked',
                ipAddress: reqMeta.ip || null,
                deviceDetails: { brand: 'Web/Telegram', userAgent: reqMeta.userAgent || null },
                userRewardINR,
                advertiserAmount,
                clickedAt: now,
                urlParams: { source: data.source || 'telegram', p1: payoutAccount }
            };
            if (offer.usesOfferEvents || offer.events.length || data.referralCode !== undefined) {
                await mongoose.connection.transaction(async session => {
                    const referral = await resolveReferral(offer._id, data.referralCode, session);
                    const percent = referral?.referrerPercent ?? 0;
                    const milestones = snapshotMilestones(offer, percent);
                    if (!offer.usesOfferEvents) {
                        // Preserve existing embedded IDs as links for clicks on older offers.
                        await OfferEvent.bulkWrite(offer.events.filter(e => e.campaignEventId).map(e => ({
                            updateOne: { filter: { _id: e._id }, update: { $setOnInsert: {
                                offerId: offer._id, campaignEventId: e.campaignEventId._id, userPayout: e.userPayout
                            } }, upsert: true }
                        })), { session });
                    }
                    Object.assign(record, {
                        referralId: referral?._id ?? null, appliedReferrerPercent: percent, milestones,
                        maxUserEarningPaise: milestones.reduce((sum, m) => sum + m.userSharePaise, 0),
                        earnedUserAmountPaise: 0, earnedReferrerAmountPaise: 0, advertiserAmount: 0, userRewardINR: 0
                    });
                    await clickRepo.createClickRecord(record, session);
                    if (referral) {
                        referral.totalClicks++;
                        await referral.save({ session });
                    }
                });
            } else {
                await clickRepo.createClickRecord(record);
            }

            // Final destination URL with replaced macros
            const destUrl = buildTrackingUrl(destinationUrl, {
                clickId,
                campaignId: campaign?._id,
                offerId: offer?._id,
                deviceId: clickId,
                ipAddress: reqMeta.ip,
                source: data.source || 'telegram',
                p1: payoutAccount,
            });

            logger.info(`click.service.js << generateClick() << clickId:${clickId} destUrl:${destUrl}`);

            return {
                clickId,
                redirectUrl: destUrl || destinationUrl,
                offerName: campaign?.name || offer?.offerName || 'Reward Task',
                payoutAccount,
                rewardINR: record.milestones ? record.maxUserEarningPaise / 100 : userRewardINR,
                maxUserEarningPaise: record.maxUserEarningPaise
            };
        } catch (error) {
            logger.error(`click.service.js << generateClick() << ${error.message}`);
            throw error;
        }
    }

    _resolveDestinationUrl(offer, payoutAccount, defaultUrl) {
        if (!offer.jumperEnabled || !offer.jumperRatio || !offer.jumperUrl) {
            return defaultUrl;
        }
        const bucket = parseInt(crypto.createHash('md5').update(`${payoutAccount}-${offer._id}`).digest('hex').slice(0, 8), 16) % 100;
        return bucket < offer.jumperRatio ? offer.jumperUrl : defaultUrl;
    }
}

export default new ClickService();
