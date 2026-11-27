import mongoose from 'mongoose';
import { randomInt } from 'crypto';
import referralRepo from './referral.repo.js';
import Partner from '../partners/partner.model.js';
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

            if (!offerId || !mongoose.Types.ObjectId.isValid(offerId)) {
                throw new Error('Valid offer ID is required');
            }

            this.validateReferralData(offerId, data);

            const offer = await offerRepo.findOfferById(offerId, { populate: false });
            if (!offer || offer.isDeleted || offer.status !== 'active' || !offer.isActive) {
                logger.warn(`referral.service.js << createReferral << Offer unavailable or inactive: ${offerId}`);
                throw new Error('Offer unavailable or inactive');
            }

            const campaign = await campaignRepo.findCampaignById(offer.campaignId, { populate: false });
            if (!campaign || campaign.isDeleted || campaign.status !== 'active') {
                logger.warn(`referral.service.js << createReferral << Campaign unavailable or inactive: ${offer.campaignId}`);
                throw new Error('Campaign unavailable or inactive');
            }

            // Verify Partner presence (Compulsory)
            const partnerId = data.partnerId;
            if (!partnerId || !mongoose.Types.ObjectId.isValid(partnerId)) {
                throw new Error('Valid partner ID is required to create a referral link');
            }

            const partner = await Partner.findById(partnerId);
            if (!partner) throw new Error('Selected partner does not exist');
            if (partner.status !== 'active') throw new Error('Selected partner is inactive or blocked');

            const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
            let referralCode = '';
            for (let i = 0; i < 7; i++) {
                referralCode += chars[randomInt(0, chars.length)];
            }
            const shareUrl = buildReferralUrl(referralCode);

            const referral = await referralRepo.createReferral({
                offerId,
                partnerId: partner._id,
                referralCode,
                referrerType,
                referrerAccount: referrerAccount.trim(),
                referrerPercent,
                referrerIfsc: referrerType === 'BANK' ? data.referrerIfsc?.trim()?.toUpperCase() : null,
                referrerHolderName: referrerType === 'BANK' ? data.referrerHolderName?.trim() : null
            });

            logger.info(`referral.service.js << createReferral << Created referral code: ${referralCode} for offer ${offerId}`);

            return {
                id: referral._id,
                offerId,
                partnerId: referral.partnerId,
                partner: {
                    id: partner._id,
                    name: partner.name,
                    email: partner.email,
                    phone: partner.phone,
                    category: partner.category
                },
                referralCode,
                shareUrl,
                referrerType,
                referrerAccount: referral.referrerAccount,
                referrerPercent,
                refereePercent: referral.refereePercent,
                status: referral.status,
                createdAt: referral.createdAt
            };
        } catch (error) {
            logger.error(`referral.service.js << createReferral << ${error.message}`);
            throw error;
        }
    }

    async getReferrals({ page = 1, limit = 20, status = '', search = '', offerId = '' } = {}) {
        try {
            const filter = {};
            if (status) filter.status = status;
            if (offerId && mongoose.Types.ObjectId.isValid(offerId)) filter.offerId = offerId;

            if (search) {
                const cleanSearch = search.trim();
                const matchingPartners = await Partner.find({
                    $or: [
                        { name: { $regex: cleanSearch, $options: 'i' } },
                        { email: { $regex: cleanSearch, $options: 'i' } },
                        { phone: { $regex: cleanSearch, $options: 'i' } }
                    ]
                }).select('_id').lean();
                const partnerIds = matchingPartners.map(p => p._id);

                filter.$or = [
                    { referralCode: { $regex: cleanSearch, $options: 'i' } },
                    { referrerAccount: { $regex: cleanSearch, $options: 'i' } },
                    ...(partnerIds.length > 0 ? [{ partnerId: { $in: partnerIds } }] : [])
                ];
            }

            const skip = (Number(page) - 1) * Number(limit);
            const [referrals, total] = await Promise.all([
                referralRepo.findReferrals(filter, { skip, limit: Number(limit) }),
                referralRepo.countReferrals(filter)
            ]);

            const mapped = referrals.map(ref => ({
                id: ref._id,
                referralCode: ref.referralCode,
                shareUrl: buildReferralUrl(ref.referralCode),
                offer: ref.offerId,
                partner: ref.partnerId,
                referrerAccount: ref.referrerAccount,
                referrerType: ref.referrerType,
                referrerPercent: ref.referrerPercent,
                totalClicks: ref.totalClicks || 0,
                totalConversions: ref.totalConversions || 0,
                status: ref.status,
                createdAt: ref.createdAt
            }));

            return {
                referrals: mapped,
                pagination: {
                    total,
                    page: Number(page),
                    limit: Number(limit),
                    totalPages: Math.ceil(total / Number(limit))
                }
            };
        } catch (error) {
            logger.error(`referral.service.js << getReferrals << ${error.message}`);
            throw error;
        }
    }

    async updateReferral(id, data = {}) {
        try {
            if (!id || !mongoose.Types.ObjectId.isValid(id)) {
                throw new Error('Valid referral ID is required');
            }

            const allowed = {};
            if (data.status && ['active', 'paused', 'expired'].includes(data.status)) {
                allowed.status = data.status;
            }
            if (Number.isFinite(data.referrerPercent) && data.referrerPercent >= 0 && data.referrerPercent <= 100) {
                allowed.referrerPercent = data.referrerPercent;
            }
            if (data.referrerAccount && typeof data.referrerAccount === 'string') {
                allowed.referrerAccount = data.referrerAccount.trim();
            }
            if (data.referrerType && ['UPI', 'BANK', 'PAYTM'].includes(data.referrerType)) {
                allowed.referrerType = data.referrerType;
            }
            if (data.partnerName !== undefined) allowed.partnerName = data.partnerName?.trim() || null;
            if (data.partnerPhone !== undefined) allowed.partnerPhone = data.partnerPhone?.trim() || null;

            const updated = await referralRepo.updateReferral(id, allowed);
            if (!updated) throw new Error('Referral record not found');
            return updated;
        } catch (error) {
            logger.error(`referral.service.js << updateReferral << ${error.message}`);
            throw error;
        }
    }

    async deleteReferral(id) {
        try {
            if (!id || !mongoose.Types.ObjectId.isValid(id)) {
                throw new Error('Valid referral ID is required');
            }
            const deleted = await referralRepo.deleteReferral(id);
            if (!deleted) throw new Error('Referral record not found');
            return { message: 'Referral link deleted successfully', id };
        } catch (error) {
            logger.error(`referral.service.js << deleteReferral << ${error.message}`);
            throw error;
        }
    }
}

export default new ReferralService();
