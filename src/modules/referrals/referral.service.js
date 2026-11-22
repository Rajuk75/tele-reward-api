import mongoose from 'mongoose';
import { randomUUID } from 'crypto';
import referralRepo from './referral.repo.js';
import offerRepo from '../offers/offer.repo.js';
import campaignRepo from '../campaigns/campaign.repo.js';
import { buildReferralUrl } from '../../core/urlBuilder.js';
import logger from '../../core/logger.js';

class ReferralService {

    validateReferralData(offerId, data = {}) {
        if (!offerId || !mongoose.Types.ObjectId.isValid(offerId)) {
            throw new Error('Invalid offer ID');
        }

        const { referrerType = 'UPI', referrerPercent = 40, referrerHolderName } = data;
        const account = typeof data.referrerAccount === 'string' ? data.referrerAccount.trim() : '';

        if (!account) {
            throw new Error('Referrer account is required');
        }

        if (!Number.isFinite(referrerPercent) || referrerPercent < 0 || referrerPercent > 100) {
            throw new Error('referrerPercent must be a number from 0 to 100');
        }

        if (referrerHolderName != null && typeof referrerHolderName !== 'string') {
            throw new Error('Invalid account holder name');
        }

        switch (referrerType) {
            case 'UPI':
                if (!/^[\w.-]+@[a-z\d.-]+$/i.test(account)) throw new Error('Invalid UPI ID');
                break;
            case 'PAYTM':
                if (!/^\d{10}$/.test(account)) throw new Error('Enter a 10-digit Paytm number');
                break;
            case 'BANK':
                if (!/^\d{9,18}$/.test(account) || typeof data.referrerIfsc !== 'string' ||
                    !/^[A-Z]{4}0[A-Z0-9]{6}$/i.test(data.referrerIfsc.trim())) {
                    throw new Error('Enter a valid bank account number and IFSC');
                }
                break;
            default:
                throw new Error('Invalid referrerType');
        }
    }

    async createReferral(offerId, data = {}) {
        const { referrerType = 'UPI', referrerAccount, referrerPercent = 40 } = data;
        try {
            logger.debug(`referral.service.js << createReferral << Offer: ${offerId}`);

            let targetOfferId = offerId;
            if (!targetOfferId) {
                const activeOffers = await offerRepo.findOffers({ status: 'active', isActive: true, isDeleted: false }, { limit: 1 });
                if (!activeOffers || !activeOffers.length) {
                    throw new Error('No active task available to refer at the moment');
                }
                targetOfferId = activeOffers[0]._id;
            }

            this.validateReferralData(targetOfferId, data);

            const offer = await offerRepo.findOfferById(targetOfferId, { populate: false });
            if (!offer || offer.isDeleted || offer.status !== 'active' || !offer.isActive) {
                logger.warn(`referral.service.js << createReferral << Offer unavailable or inactive: ${targetOfferId}`);
                throw new Error('Offer unavailable or inactive');
            }

            const campaign = await campaignRepo.findCampaignById(offer.campaignId, { populate: false });
            if (!campaign || campaign.isDeleted || campaign.status !== 'active') {
                logger.warn(`referral.service.js << createReferral << Campaign unavailable or inactive: ${offer.campaignId}`);
                throw new Error('Campaign unavailable or inactive');
            }

            const referralCode = randomUUID().toLowerCase();
            const shareUrl = buildReferralUrl(referralCode);

            const referral = await referralRepo.createReferral({
                offerId: targetOfferId,
                referralCode,
                referrerType,
                referrerAccount: referrerAccount.trim(),
                referrerPercent,
                referrerIfsc: referrerType === 'BANK' ? data.referrerIfsc?.trim()?.toUpperCase() : null,
                referrerHolderName: referrerType === 'BANK' ? data.referrerHolderName?.trim() : null
            });

            logger.info(`referral.service.js << createReferral << Created referral code: ${referralCode} for offer ${targetOfferId}`);

            return {
                offerId: targetOfferId,
                referralCode,
                shareUrl,
                referrerPercent,
                refereePercent: referral.refereePercent
            };
        } catch (error) {
            logger.error(`referral.service.js << createReferral << ${error.message}`);
            throw error;
        }
    }
}

export default new ReferralService();
