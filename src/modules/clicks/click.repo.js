import Offer, { populateOfferEvents } from '../offers/offer.model.js';
import Tracking from '../tracking/tracking.model.js';
import logger from '../../core/logger.js';

class ClickRepository {
    async findOfferForClick(offerId) {
        try {
            return await Offer.findById(offerId)
                .populate('campaignId')
                .populate(populateOfferEvents).lean();
        } catch (error) {
            logger.error(`click.repo.js << findOfferForClick() << ${error.message}`);
            throw error;
        }
    }

    async findCompletedClick(offerId, payoutAccount) {
        try {
            return await Tracking.findOne({
                offerId,
                payoutAccount,
                status: 'completed'
            });
        } catch (error) {
            logger.error(`click.repo.js << findCompletedClick() << ${error.message}`);
            throw error;
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
