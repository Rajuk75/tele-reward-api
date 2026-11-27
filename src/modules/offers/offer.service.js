import mongoose from 'mongoose';
import offerRepo from './offer.repo.js';
import OfferEvent from './offerEvent.model.js';
import Campaign from '../campaigns/campaign.model.js';
import CampaignEvent from '../campaigns/campaignEvent.model.js';
import { snapshotMilestones } from '../tracking/milestones.js';
import referralRepo from '../referrals/referral.repo.js';
import resolveReferral from '../referrals/resolveReferral.js';
import logger from '../../core/logger.js';
import { buildPostbackUrl, buildOfferTaskUrl } from '../../core/urlBuilder.js';
import { getSpinCookieName, verifySpinToken } from '../../core/spinToken.utility.js';
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
            const journeySteps = Array.isArray(offer.journeySteps)
                ? offer.journeySteps.map(s => String(s).trim()).filter(Boolean)
                : typeof offer.journeySteps === 'string'
                    ? offer.journeySteps.split(',').map(s => s.trim()).filter(Boolean)
                    : [];

            const createdOffer = await offerRepo.createOffer({
                ...offer,
                journeySteps,
                isActive: (offer.status ?? 'active') === 'active',
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

    async getOfferById(id) {
        try {
            const offer = await offerRepo.findOfferById(id, { populate: true, includePostback: true });
            if (!offer) throw new Error('Offer not found');
            const events = Array.isArray(offer.events) ? offer.events : [];
            return {
                ...offer,
                taskUrl: buildOfferTaskUrl(offer),
                totalPayout: events.reduce((sum, event) => sum + (event.userPayout || 0), 0),
                totalCap: events.reduce((sum, event) => sum + (event.campaignEventId?.cap || 0), 0)
            };
        } catch (error) {
            logger.error(`offer.service.js << getOfferById() << ${error.message}`);
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

    async updateOffer(id, { offer, events, ...restData } = {}) {
        const existingOffer = await offerRepo.findOfferById(id, { populate: false });
        if (!existingOffer) throw new Error('Offer not found');

        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const rawOffer = offer || restData;
            const updatePayload = {};

            if (rawOffer.offerName !== undefined) updatePayload.offerName = rawOffer.offerName.trim();
            if (rawOffer.comment !== undefined) updatePayload.comment = rawOffer.comment;
            if (rawOffer.steps !== undefined) updatePayload.steps = rawOffer.steps;
            if (rawOffer.journeySteps !== undefined) {
                updatePayload.journeySteps = Array.isArray(rawOffer.journeySteps)
                    ? rawOffer.journeySteps.map(s => String(s).trim()).filter(Boolean)
                    : typeof rawOffer.journeySteps === 'string'
                        ? rawOffer.journeySteps.split(',').map(s => s.trim()).filter(Boolean)
                        : [];
            }
            if (rawOffer.termsAndConditions !== undefined) updatePayload.termsAndConditions = rawOffer.termsAndConditions;
            if (rawOffer.referTermsAndConditions !== undefined) updatePayload.referTermsAndConditions = rawOffer.referTermsAndConditions;
            if (rawOffer.status !== undefined) {
                updatePayload.status = rawOffer.status;
                updatePayload.isActive = rawOffer.status === 'active';
            }
            if (rawOffer.oneUpiOneTime !== undefined) updatePayload.oneUpiOneTime = rawOffer.oneUpiOneTime;
            if (rawOffer.offerDisplay !== undefined) updatePayload.offerDisplay = rawOffer.offerDisplay;
            if (rawOffer.priority !== undefined) updatePayload.priority = Number(rawOffer.priority) || 1;
            if (rawOffer.background !== undefined) updatePayload.background = rawOffer.background;
            if (rawOffer.backgroundImage !== undefined) updatePayload.backgroundImage = rawOffer.backgroundImage;
            if (rawOffer.jumperEnabled !== undefined) updatePayload.jumperEnabled = rawOffer.jumperEnabled;
            if (rawOffer.jumperRatio !== undefined) updatePayload.jumperRatio = rawOffer.jumperRatio;
            if (rawOffer.jumperUrl !== undefined) updatePayload.jumperUrl = rawOffer.jumperUrl;
            if (rawOffer.inputs !== undefined) updatePayload.inputs = rawOffer.inputs;

            if (rawOffer.spinSettings !== undefined) {
                updatePayload.spinSettings = {
                    enabled: !!rawOffer.spinSettings?.enabled,
                    slices: Array.isArray(rawOffer.spinSettings?.slices) ? rawOffer.spinSettings.slices : [5, 10, 15, 20, 25]
                };
            }

            if (Object.keys(updatePayload).length > 0) {
                await offerRepo.updateOffer(id, updatePayload, session);
            }

            if (events !== undefined) {
                if (!Array.isArray(events) || !events.length) throw new Error('Select at least one campaign event');
                const ids = events.map(event => event?.campaignEventId);
                if (ids.some(value => !mongoose.isObjectIdOrHexString(value)) || new Set(ids.map(String)).size !== ids.length) {
                    throw new Error('Select each campaign event only once');
                }
                if (events.some(({ userPayout }) => !['number', 'string'].includes(typeof userPayout)
                    || String(userPayout).trim() === '' || !Number.isFinite(Number(userPayout)) || Number(userPayout) < 0)) {
                    throw new Error('Enter a non-negative user payout for each event');
                }
                const linked = await OfferEvent.find({ offerId: id }).distinct('campaignEventId').session(session);
                const eligible = await CampaignEvent.countDocuments({
                    _id: { $in: ids }, campaignId: existingOffer.campaignId,
                    $or: [{ status: 'active', isDeleted: false }, { _id: { $in: linked } }],
                }).session(session);
                if (eligible !== ids.length) throw new Error('Select eligible events from the linked campaign');

                // Keep the link IDs used by tracking snapshots when adjusting payouts.
                await OfferEvent.deleteMany({ offerId: id, campaignEventId: { $nin: ids } }).session(session);
                await OfferEvent.bulkWrite(events.map(({ campaignEventId, userPayout }) => ({
                    updateOne: {
                        filter: { offerId: id, campaignEventId },
                        update: { $set: { userPayout: Number(userPayout) } },
                        upsert: true,
                    },
                })), { session });
            }

            await session.commitTransaction();
            return await this.getOfferById(id);
        } catch (error) {
            if (session.inTransaction()) await session.abortTransaction();
            logger.error(`offer.service.js << updateOffer() << ${error.message}`);
            throw error;
        } finally {
            session.endSession();
        }
    }

    async getPublicOffer(arg1, arg2) {
        const { offerId, referralCode, cookies = {} } = (typeof arg1 === 'object' && arg1 !== null)
            ? arg1
            : { offerId: arg1, referralCode: arg2, cookies: {} };

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
            const spinToken = cookies?.[getSpinCookieName(offer._id)];
            const verifiedSpin = verifySpinToken(spinToken, offer._id);

            const journeySteps = Array.isArray(offer.journeySteps) && offer.journeySteps.length > 0
                ? offer.journeySteps
                : ['Click', ...(Array.isArray(offer.events) ? offer.events.map(e => e.campaignEventId?.name).filter(Boolean) : [])];

            return {
                id: offer._id,
                offerCode: offer.offerId,
                offerName: offer.offerName || campaign?.name || 'Special Reward Task',
                category: offer.category || campaign?.category || 'App Task',
                comment: offer.comment,
                steps: offer.steps || '1. Enter your payout UPI or Bank Account Number.\n2. Tap Download & Install the app from Play Store.\n3. Open app and complete registration.',
                journeySteps,
                termsAndConditions: offer.termsAndConditions || 'Complete the task honestly. Rewards are transferred to your provided UPI/Account upon event verification.',
                rewardINR: rows[0].userSharePaise / 100,
                totalRewardINR: rows.reduce((sum, r) => sum + r.userSharePaise, 0) / 100,
                icon: campaign?.imageUrl || campaign?.icon || campaign?.logoUrl || null,
                referralCode: activeReferral?.referralCode || null,
                spinSettings: offer.spinSettings || { enabled: false, slices: [] },
                spinStatus: verifiedSpin
                    ? { alreadySpun: true, bonus: verifiedSpin.bonus, sliceIndex: verifiedSpin.sliceIndex }
                    : { alreadySpun: false, bonus: 0, sliceIndex: null }
            };
        } catch (error) {
            logger.error(`offer.service.js << getPublicOffer() << ${error.message}`);
            throw error;
        }
    }
}

export default new OfferService();
