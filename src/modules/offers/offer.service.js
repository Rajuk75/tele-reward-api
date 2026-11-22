import mongoose from 'mongoose';
import offerRepo from './offer.repo.js';
import Campaign from '../campaigns/campaign.model.js';
import CampaignEvent from '../campaigns/campaignEvent.model.js';
import { snapshotMilestones } from '../tracking/milestones.js';
import referralRepo from '../referrals/referral.repo.js';
import resolveReferral from '../referrals/resolveReferral.js';
import logger from '../../core/logger.js';
import { buildPostbackUrl } from '../../core/urlBuilder.js';
import { v4 as uuidv4 } from 'uuid';

class OfferService {

    async createOffer({ offer, events }) {
        if (!offer?.campaignId) throw new Error('Please select a campaign');
        if (!Array.isArray(events) || !events.length) throw new Error('Select at least one campaign event');

        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const campaign = await Campaign.findOne({ _id: offer.campaignId, isDeleted: false }).session(session);
            if (!campaign) throw new Error('Campaign not found');

            const ids = events.map(event => event.campaignEventId);
            const count = await CampaignEvent.countDocuments({ _id: { $in: ids }, campaignId: campaign._id, status: 'active', isDeleted: false }).session(session);

            if (count !== ids.length) {
                throw new Error('Select each active event from this campaign only once');
            }

            const postbackSecretKey = uuidv4();
            const createdOffer = await offerRepo.createOffer({
                ...offer,
                campaignId: campaign._id,
                offerName: offer.offerName?.trim() || campaign.name,
                category: campaign.category,
                model: campaign.model,
                postbackSecretKey,
                postbackUrl: buildPostbackUrl(postbackSecretKey)
            }, session);

            await offerRepo.createOfferEvents(events.map(({ campaignEventId, userPayout }) => ({
                offerId: createdOffer._id,
                campaignEventId,
                userPayout
            })), session);

            await session.commitTransaction();

            return await offerRepo.findOfferById(createdOffer._id);
        } catch (error) {
            await session.abortTransaction();
            logger.error(`offer.service.js << createOffer() << ${error.message}`);
            throw error;
        } finally {
            session.endSession();
        }
    }

    async getAllOffers({ page = 1, limit = 15, search = '', status = '', category = '' } = {}) {
        try {
            const filter = { isDeleted: false };
            if (status) filter.status = status;
            if (category) filter.category = category;
            if (search) {
                const escapedSearch = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                filter.$or = [
                    { offerName: { $regex: escapedSearch, $options: 'i' } },
                    { comment: { $regex: escapedSearch, $options: 'i' } }
                ];
            }

            const skip = (Number(page) - 1) * Number(limit);
            const [offers, total] = await Promise.all([
                offerRepo.findOffers(filter, { skip, limit: Number(limit) }),
                offerRepo.countOffers(filter)
            ]);

            return {
                offers,
                pagination: {
                    total,
                    page: Number(page),
                    limit: Number(limit),
                    totalPages: Math.ceil(total / Number(limit))
                }
            };
        } catch (error) {
            logger.error(`offer.service.js << getAllOffers() << ${error.message}`);
            throw error;
        }
    }

    async deleteOffer(id) {
        try {
            await offerRepo.softDeleteOffer(id);
            return { message: 'Offer deleted successfully' };
        } catch (error) {
            logger.error(`offer.service.js << deleteOffer() << ${error.message}`);
            throw error;
        }
    }

    async updateOfferStatus(id, status) {
        try {
            const offer = await offerRepo.updateOfferStatus(id, status);
            return offer;
        } catch (error) {
            logger.error(`offer.service.js << updateOfferStatus() << ${error.message}`);
            throw error;
        }
    }

    async getPublicOffer(arg1, arg2) {
        const { offerId, referralCode } = (typeof arg1 === 'object' && arg1 !== null)
            ? arg1
            : { offerId: arg1, referralCode: arg2 };

        try {
            let targetOfferId = offerId;
            let referrerPercent = 0;
            let activeReferral = null;

            if (referralCode) {
                activeReferral = await referralRepo.findReferralByCode(referralCode, targetOfferId);
                if (!activeReferral) {
                    throw new Error('Invalid or expired referral link');
                }
                targetOfferId = activeReferral.offerId;
                referrerPercent = activeReferral.referrerPercent || 0;
            }

            if (!targetOfferId) {
                throw new Error('Invalid task link. No task or referral specified.');
            }

            const offer = await offerRepo.findOfferById(targetOfferId);
            const campaign = offer?.campaignId;

            if (!offer || offer.isDeleted || offer.status !== 'active' || !offer.isActive || !campaign || campaign.isDeleted || campaign.status !== 'active') {
                throw new Error('Offer or Campaign is inactive');
            }

            const rows = snapshotMilestones(offer, referrerPercent);

            return {
                id: offer._id,
                offerName: offer.offerName || campaign?.name || 'Special Reward Task',
                category: offer.category || campaign?.category || 'App Task',
                comment: offer.comment,
                steps: offer.steps || '1. Enter your payout UPI or Bank Account Number.\n2. Tap Download & Install the app from Play Store.\n3. Open app and complete registration.',
                termsAndConditions: offer.termsAndConditions || 'Complete the task honestly. Rewards are transferred to your provided UPI/Account upon event verification.',
                rewardINR: rows[0].userSharePaise / 100,
                totalRewardINR: rows.reduce((sum, r) => sum + r.userSharePaise, 0) / 100,
                icon: campaign?.imageUrl || campaign?.icon || campaign?.logoUrl || null,
                referralCode: activeReferral?.referralCode || null
            };
        } catch (error) {
            logger.error(`offer.service.js << getPublicOffer() << ${error.message}`);
            throw error;
        }
    }
}

export default new OfferService();
