import mongoose from 'mongoose';
import Offer from './offer.model.js';
import './event.model.js';
import OfferEvent from './offerEvent.model.js';
import { snapshotMilestones } from '../tracking/milestones.js';
import resolveReferral from '../referrals/resolveReferral.js';

import Campaign from '../campaigns/campaign.model.js';
import logger from '../../core/logger.js';
import config from '../../core/config.js';
import { v4 as uuidv4 } from 'uuid';

export function withSelectedEvents(offer) {
    if (offer?.usesOfferEvents) {
        offer.events = offer.selectedEvents || [];
        delete offer.selectedEvents;
    }
    return offer;
}

export const populateSelectedEvents = { path: 'selectedEvents', populate: { path: 'campaignEventId' } };

function getEventFields(events, campaign, existingEvents = []) {
    if (!Array.isArray(events)) throw new Error('Events must be an array');
    const available = new Set(campaign.events.map(String));
    const existingIds = new Map(existingEvents.map(ev => [String(ev.campaignEventId), ev._id]));
    const selected = events.map(ev => {
        const campaignEventId = ev?.campaignEventId?._id ?? ev?.campaignEventId ?? ev?._id;
        if (!available.delete(String(campaignEventId))) {
            throw new Error('Each selected event must belong to the campaign and appear only once');
        }
        const payout = ev.userPayout ?? ev.payout;
        const userPayout = Number(payout);
        if ((typeof payout !== 'number' && typeof payout !== 'string') ||
            String(payout).trim() === '' || !Number.isFinite(userPayout) || userPayout < 0) {
            throw new Error('Each event requires a non-negative user payout');
        }
        return { _id: existingIds.get(String(campaignEventId)), campaignEventId, userPayout };
    });
    return {
        events: selected,
        firstEventPayout: selected[0]?.userPayout ?? 0,
        totalPayout: selected.reduce((sum, ev) => sum + ev.userPayout, 0)
    };
}

class OfferService {
    createOffer = async (data) => {
        try {
            logger.info(`offer.service.js << createOffer() << Creating offer for campaignId: ${data.campaignId}`);
            const {
                campaignId, events, comment, steps, termsAndConditions,
                referTermsAndConditions, jumperEnabled, jumperRatio, jumperUrl,
                priority, status
            } = data;

            if (!campaignId) throw new Error('Please select a campaign');
            const campaign = await Campaign.findOne({ _id: campaignId, isDeleted: false });
            if (!campaign) throw new Error('Campaign not found or deleted');

            const existingOffer = await Offer.findOne({ campaignId, isDeleted: false });
            if (existingOffer) throw new Error('An offer already exists for this campaign');

            const postbackSecretKey = uuidv4();
            const postbackUrl = `${config.BASE_URL}/postback?cid={clickId}&secret=${postbackSecretKey}&event={event}`;

            const fields = getEventFields(events ?? [], campaign);
            if (!fields.events.length) throw new Error('Select at least one campaign milestone');
            const offer = await mongoose.connection.transaction(async session => {
                const [created] = await Offer.create([{
                    campaignId,
                    offerName: campaign.name,
                    category: campaign.category,
                    model: campaign.model,
                    comment: comment || '',
                    steps: steps || '',
                    termsAndConditions: termsAndConditions || '',
                    referTermsAndConditions: referTermsAndConditions || '',
                    usesOfferEvents: true,
                    firstEventPayout: fields.firstEventPayout,
                    totalPayout: fields.totalPayout,
                    status: status || 'active',
                    jumperEnabled: jumperEnabled || false,
                    jumperRatio: jumperRatio || null,
                    jumperUrl: jumperUrl || null,
                    priority: priority || 1,
                    postbackSecretKey,
                    postbackUrl
                }], { session });
                await OfferEvent.insertMany(fields.events.map(e => ({ ...e, offerId: created._id })), { session, ordered: true });
                return created;
            });

            return withSelectedEvents(await Offer.findById(offer._id).populate('campaignId').populate(populateSelectedEvents).lean());
        } catch (error) {
            logger.error(`offer.service.js << createOffer() << ${error.message}`);
            throw error;
        }
    };

    getAllOffers = async ({ page = 1, limit = 15, search = '', status = '', category = '' } = {}) => {
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
                Offer.find(filter)
                    .populate('campaignId', 'name status category model')
                    .populate('events.campaignEventId', 'name eventKey order advertiserPayout')
                    .populate(populateSelectedEvents)
                    .sort({ priority: -1, createdAt: -1 })
                    .skip(skip)
                    .limit(Number(limit))
                    .lean(),
                Offer.countDocuments(filter)
            ]);

            return {
                offers: offers.map(withSelectedEvents),
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
    };

    deleteOffer = async (id) => {
        try {
            const offer = await Offer.findOneAndUpdate(
                { _id: id, isDeleted: false },
                { $set: { isDeleted: true, status: 'inactive' } },
                { new: true }
            );
            if (!offer) throw new Error('Offer not found');
            return { message: 'Offer deleted successfully' };
        } catch (error) {
            logger.error(`offer.service.js << deleteOffer() << ${error.message}`);
            throw error;
        }
    };

    updateOfferStatus = async (id, status) => {
        try {
            const offer = await Offer.findOneAndUpdate(
                { _id: id, isDeleted: false },
                { $set: { status, isActive: status === 'active' } },
                { new: true }
            );
            if (!offer) throw new Error('Offer not found');
            return offer;
        } catch (error) {
            logger.error(`offer.service.js << updateOfferStatus() << ${error.message}`);
            throw error;
        }
    };

    async getPublicOffer(offerId, referralCode) {
        try {
            const offer = await Offer.findById(offerId)
                .populate('events.campaignEventId').populate(populateSelectedEvents)
                .populate('campaignId', 'name category campaignUrl logoUrl imageUrl icon status isDeleted')
                .lean();

            const campaign = offer?.campaignId;
            if (!offer || offer.isDeleted || offer.status !== 'active' || !offer.isActive || !campaign || campaign.isDeleted || campaign.status !== 'active') {
                throw new Error('Offer or Campaign is inactive');
            }

            withSelectedEvents(offer);
            const referral = await resolveReferral(offerId, referralCode);
            const rows = offer.events.length || referral || offer.usesOfferEvents
                ? snapshotMilestones(offer, referral?.referrerPercent) : [];
            return {
                id: offer._id,
                offerName: offer.offerName || offer.campaignId?.name || 'Special Reward Task',
                category: offer.category || offer.campaignId?.category || 'App Task',
                comment: offer.comment,
                steps: offer.steps || '1. Enter your payout UPI or Bank Account Number.\n2. Tap Download & Install the app from Play Store.\n3. Open app and complete registration.',
                termsAndConditions: offer.termsAndConditions || 'Complete the task honestly. Rewards are transferred to your provided UPI/Account upon event verification.',
                rewardINR: rows.length ? rows[0].userSharePaise / 100 : offer.firstEventPayout ?? offer.totalPayout ?? 0,
                totalRewardINR: rows.length ? rows.reduce((sum, r) => sum + r.userSharePaise, 0) / 100 : offer.totalPayout || offer.firstEventPayout || 0,
                icon: offer.campaignId?.imageUrl || offer.campaignId?.icon || offer.campaignId?.logoUrl || null,
            };
        } catch (error) {
            logger.error(`offer.service.js << getPublicOffer() << ${error.message}`);
            throw error;
        }
    }
}

export default new OfferService();

