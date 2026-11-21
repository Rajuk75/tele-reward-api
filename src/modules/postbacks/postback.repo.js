import Tracking from '../tracking/tracking.model.js';
import Offer from '../offers/offer.model.js';
import Revenue from '../conversions/revenue.model.js';
import PostbackLog from './postbackLog.model.js';
import logger from '../../core/logger.js';

class PostbackRepository {
    async findTrackingWithOffer(clickId) {
        try {
            return await Tracking.findOne({ clickId }).populate({
                path: 'offerId',
                select: '+postbackSecretKey',
                populate: [
                    { path: 'campaignId' },
                    { path: 'events.campaignEventId' }
                ]
            });
        } catch (error) {
            logger.error(`postback.repo.js << findTrackingWithOffer() >>>>>> [ERROR] ${error.message}`);
            throw error;
        }
    }

    async updateTracking(trackingId, fields) {
        try {
            return await Tracking.updateOne({ _id: trackingId }, { $set: fields });
        } catch (error) {
            logger.error(`postback.repo.js << updateTracking() >>>>>> [ERROR] ${error.message}`);
            throw error;
        }
    }

    async createRevenue(data) {
        try {
            return await Revenue.create(data);
        } catch (error) {
            logger.error(`postback.repo.js << createRevenue() >>>>>> [ERROR] ${error.message}`);
            throw error;
        }
    }

    async incrementOfferInstalls(offerId) {
        try {
            return await Offer.updateOne({ _id: offerId }, { $inc: { currentInstalls: 1 } });
        } catch (error) {
            logger.error(`postback.repo.js << incrementOfferInstalls() >>>>>> [ERROR] ${error.message}`);
            throw error;
        }
    }

    async createLog(data) {
        try {
            return await PostbackLog.create(data);
        } catch (error) {
            logger.error(`postback.repo.js << createLog() >>>>>> [ERROR] ${error.message}`);
            throw error;
        }
    }

    async findLogs(filter = {}, { skip = 0, limit = 20 } = {}) {
        try {
            return await PostbackLog.find(filter)
                .populate('offerId', 'offerName category')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean();
        } catch (error) {
            logger.error(`postback.repo.js << findLogs() >>>>>> [ERROR] ${error.message}`);
            throw error;
        }
    }

    async countLogs(filter = {}) {
        try {
            return await PostbackLog.countDocuments(filter);
        } catch (error) {
            logger.error(`postback.repo.js << countLogs() >>>>>> [ERROR] ${error.message}`);
            throw error;
        }
    }
}

export default new PostbackRepository();
