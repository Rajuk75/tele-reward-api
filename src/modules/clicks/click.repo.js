import Offer, { populateOfferEvents } from '../offers/offer.model.js';
import Tracking from '../tracking/tracking.model.js';
import mongoose from 'mongoose';
import logger from '../../core/logger.js';

class ClickRepository {
    async listClicks({ filter, date, search, skip, limit }) {
        if (date) filter.clickedAt = date;
        if (search) filter.$or = [{ clickId: search }, { payoutAccount: search }, { ipAddress: search }, { 'urlParams.source': search }];
        const [rows, groups] = await Promise.all([
            Tracking.find(filter).populate('campaignId', 'name category').populate('offerId', 'offerName')
                .populate('userId', 'name email phone').sort({ clickedAt: -1, _id: -1 }).skip(skip).limit(limit).lean(),
            Tracking.aggregate([
                { $match: filter },
                { $group: {
                    _id: null,
                    total: { $sum: 1 },
                    referral: { $sum: { $cond: [{ $ifNull: ['$referralId', false] }, 1, 0] } },
                    completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
                } },
                { $project: { _id: 0, total: 1, referral: 1, completed: 1 } },
            ]),
        ]);
        return { rows, summary: groups[0] ?? { total: 0, referral: 0, completed: 0 } };
    }

    async findByClickId(clickId) {
        const query = mongoose.Types.ObjectId.isValid(clickId)
            ? { $or: [{ clickId }, { _id: clickId }] }
            : { clickId };

        return await Tracking.findOne(query)
            .populate('campaignId', 'name category model')
            .populate('offerId', 'offerName category')
            .populate('userId', 'name email phone')
            .populate('referralId', 'referralCode referrerUserId')
            .lean();
    }

    async findOfferForClick(offerIdOrCode) {
        try {
            if (!offerIdOrCode) return null;
            const filter = mongoose.Types.ObjectId.isValid(offerIdOrCode)
                ? { _id: offerIdOrCode }
                : { offerId: String(offerIdOrCode).trim().toUpperCase() };
            return await Offer.findOne(filter)
                .populate('campaignId')
                .populate(populateOfferEvents)
                .lean();
        } catch (error) {
            logger.error(`click.repo.js << findOfferForClick() << ${error.message}`);
            throw error;
        }
    }

    async findLatestClick(offerId, payoutAccount) {
        try {
            return await Tracking.findOne({ offerId, payoutAccount }).sort({ createdAt: -1 });
        } catch (error) {
            logger.error(`click.repo.js << findLatestClick() << ${error.message}`);
            return null;
        }
    }

    async findRecentClick(offerId, payoutAccount, cooldownSeconds = 15) {
        try {
            const threshold = new Date(Date.now() - cooldownSeconds * 1000);
            return await Tracking.findOne({
                offerId,
                payoutAccount,
                createdAt: { $gte: threshold }
            }).lean();
        } catch (error) {
            logger.error(`click.repo.js << findRecentClick() << ${error.message}`);
            return null;
        }
    }

    async findRecentClickByIp(offerId, ipAddress, cooldownSeconds = 30) {
        try {
            if (!ipAddress) return null;
            const threshold = new Date(Date.now() - cooldownSeconds * 1000);
            return await Tracking.findOne({
                offerId,
                ipAddress,
                createdAt: { $gte: threshold }
            }).lean();
        } catch (error) {
            logger.error(`click.repo.js << findRecentClickByIp() << ${error.message}`);
            return null;
        }
    }

    async createClickRecord(trackingData, session = null) {
        try {
            return await new Tracking(trackingData).save({ session });
        } catch (error) {
            logger.error(`click.repo.js << createClickRecord() << ${error.message}`);
            throw error;
        }
    }
}

export default new ClickRepository();
