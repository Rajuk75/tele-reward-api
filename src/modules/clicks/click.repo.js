import Offer, { populateOfferEvents } from '../offers/offer.model.js';
import Tracking from '../tracking/tracking.model.js';
import mongoose from 'mongoose';
import logger from '../../core/logger.js';

class ClickRepository {
    async findOfferForClick(offerId) {
        try {
            if (!offerId || !mongoose.Types.ObjectId.isValid(offerId)) return null;
            return await Offer.findById(offerId)
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
