import { v4 as uuidv4 } from 'uuid';
import mongoose from 'mongoose';
import crypto from 'crypto';
import referralRepo from '../referrals/referral.repo.js';
import { snapshotMilestones } from '../tracking/milestones.js';
import clickRepo from './click.repo.js';
import { buildTrackingUrl } from '../../core/urlBuilder.js';
import logger from '../../core/logger.js';

/**
 * Resolves final destination: Traffic Jumper vs Campaign URL
 */
function resolveDestinationUrl(offer, campaign, payoutAccount) {
    if (offer.jumperEnabled && offer.jumperRatio && offer.jumperUrl) {
        const hash = crypto.createHash('md5').update(`${payoutAccount}-${offer._id}`).digest('hex').slice(0, 8);
        if (parseInt(hash, 16) % 100 < offer.jumperRatio) {
            return offer.jumperUrl;
        }
    }
    return campaign.campaignUrl;
}

/**
 * Validates and resolves spin bonus amount against offer settings.
 * Anti-Tamper: Throws error if bonus is unauthorized or tampered.
 */
function resolveSpinBonus(rawBonus, offer) {
    const rawSpinBonus = (rawBonus !== undefined && rawBonus !== null && rawBonus !== '')
        ? Number(rawBonus)
        : 0;

    if (rawSpinBonus <= 0) {
        return { bonusPaise: 0, isUsed: false };
    }

    const isSpinEnabled = offer.spinSettings?.enabled === true;
    const allowedSlices = (offer.spinSettings?.slices || []).map(Number);

    if (!isSpinEnabled) {
        logger.warn(`click.service.js << rejected spin bonus ₹${rawSpinBonus} - spin feature disabled for offer ${offer._id}`);
        throw new Error('Spin & Win bonus is not enabled for this offer.');
    }

    if (!Number.isFinite(rawSpinBonus) || !allowedSlices.includes(rawSpinBonus)) {
        logger.warn(`click.service.js << Security Alert: Tampered spin bonus ₹${rawSpinBonus} rejected for offer ${offer._id}! Allowed slices: [${allowedSlices.join(', ')}]`);
        throw new Error('Invalid or unauthorized spin bonus amount.');
    }

    return {
        bonusPaise: Math.round(rawSpinBonus * 100),
        isUsed: true
    };
}

class ClickService {

    /**
     * Unified Click Handler for both Direct and Referral Clicks
     */
    async generateClick(offerId, data = {}, reqMeta = {}) {
        // 1. Resolve Offer & Referral
        const referralCode = data.referralCode || data.referral_code || data.ref;
        let referral = null;
        let targetOfferId = offerId;

        if (referralCode) {
            referral = await referralRepo.findReferralByCode(String(referralCode).trim());
            if (!referral) throw new Error('Invalid or expired task link');
            targetOfferId = referral.offerId;
        }

        const offer = await clickRepo.findOfferForClick(targetOfferId);
        const campaign = offer?.campaignId;
        if (!offer || !offer.isActive || offer.status !== 'active' || offer.isDeleted ||
            !campaign || campaign.status !== 'active' || campaign.isDeleted) {
            throw new Error('This task is currently unavailable or expired');
        }

        const { payoutAccount, payoutType = 'UPI', payoutHolderName, payoutIfsc, source = 'telegram' } = data;
        logger.debug(`click.service.js << generateClick << offer:${targetOfferId}, ref:${referralCode || 'none'}, payout:${payoutAccount}`);

        // 2. Resolve Destination URL
        const destinationUrl = resolveDestinationUrl(offer, campaign, payoutAccount);
        logger.debug(`click.service.js << destinationUrl: ${destinationUrl}`);

        // 3. Check Existing Click (Duplicate Check vs Smooth Resume)
        const existingClick = await clickRepo.findLatestClick(offer._id, payoutAccount);
        if (existingClick) {
            if (existingClick.status === 'completed' && offer.oneUpiOneTime !== false) {
                throw new Error(`This payout account (${payoutAccount}) has already completed this offer!`);
            }
            if (existingClick.status === 'clicked' || existingClick.status === 'partially_completed') {
                logger.info(`click.service.js << resumed clickId:${existingClick.clickId}`);
                const redirectUrl = buildTrackingUrl(destinationUrl, {
                    clickId: existingClick.clickId,
                    campaignId: campaign._id,
                    offerId: offer._id,
                    deviceId: existingClick.clickId,
                    ipAddress: reqMeta.ip,
                    source,
                    p1: payoutAccount
                });

                return {
                    clickId: existingClick.clickId,
                    redirectUrl,
                    offerName: campaign.name || offer.offerName || 'Reward Task',
                    payoutAccount,
                    rewardINR: existingClick.maxUserEarningPaise / 100,
                    maxUserEarningPaise: existingClick.maxUserEarningPaise
                };
            }
        }

        // 4. Anti-Fraud: Same IP cooldown block
        if (campaign.sameClickIpBlock && reqMeta.ip) {
            const recentIpClick = await clickRepo.findRecentClickByIp(offer._id, reqMeta.ip, 30);
            if (recentIpClick) {
                throw new Error('Multiple clicks from the same IP address are restricted. Please try again later.');
            }
        }

        // 5. Snapshot Milestones (0% for direct, chosen % for referral)
        const referrerPercent = referral?.referrerPercent || 0;
        const milestones = snapshotMilestones(offer, referrerPercent);
        const maxUserEarningPaise = milestones.reduce((sum, m) => sum + m.userSharePaise, 0);
        logger.debug(`click.service.js << snapshotted ${milestones.length} milestones, maxUserReward: ₹${maxUserEarningPaise / 100}`);
        const clickId = uuidv4();

        // 6. Spin Bonus Anti-Tamper & Whitelist Validation
        const spinReward = resolveSpinBonus(data.spinBonus, offer);

        // 7. Persist Tracking Record
        const record = {
            clickId,
            offerId: offer._id,
            campaignId: campaign._id,
            payoutAccount,
            payoutType: payoutType.toUpperCase(),
            payoutHolderName: payoutHolderName?.trim() || null,
            payoutIfsc: payoutIfsc?.trim() || null,
            referralId: referral?._id || null,
            appliedReferrerPercent: referrerPercent,
            milestones,
            maxUserEarningPaise,
            spinReward: {
                bonusPaise: spinReward.bonusPaise,
                isUsed: spinReward.isUsed,
                isPaid: false,
                paidAt: null
            },
            earnedUserAmountPaise: 0,
            earnedReferrerAmountPaise: 0,
            advertiserAmount: 0,
            status: 'clicked',
            ipAddress: reqMeta.ip || null,
            deviceDetails: { brand: 'Web/Telegram', userAgent: reqMeta.userAgent || null },
            clickedAt: new Date(),
            urlParams: { source, p1: payoutAccount }
        };

        if (referral) {
            await mongoose.connection.transaction(async session => {
                await clickRepo.createClickRecord(record, session);
                await referralRepo.incrementStats(referral._id, { clicks: 1 }, session);
            });
        } else {
            await clickRepo.createClickRecord(record);
        }

        const redirectUrl = buildTrackingUrl(destinationUrl, {
            clickId,
            campaignId: campaign._id,
            offerId: offer._id,
            deviceId: clickId,
            ipAddress: reqMeta.ip,
            source,
            p1: payoutAccount
        });

        logger.info(`click.service.js << created new clickId:${clickId}`);

        return {
            clickId,
            redirectUrl,
            offerName: campaign.name || offer.offerName || 'Reward Task',
            payoutAccount,
            rewardINR: maxUserEarningPaise / 100,
            maxUserEarningPaise
        };
    }
}

export default new ClickService();
