import Payout from './payout.model.js';
import logger from '../../core/logger.js';

class PayoutRepository {
    async createPayout(data) {
        try {
            return await Payout.create(data);
        } catch (error) {
            logger.error(`payout.repo.js << createPayout() >>>>>> [ERROR] ${error.message}`);
            throw error;
        }
    }

    async findPayouts(filter = {}, { skip = 0, limit = 20, sort = { createdAt: -1 } } = {}) {
        try {
            return await Payout.find(filter)
                .populate('offerId', 'offerName category')
                .populate('createdBy', 'name email')
                .populate('updatedBy', 'name email')
                .sort(sort)
                .skip(skip)
                .limit(limit)
                .lean();
        } catch (error) {
            logger.error(`payout.repo.js << findPayouts() >>>>>> [ERROR] ${error.message}`);
            throw error;
        }
    }

    async countPayouts(filter = {}) {
        try {
            return await Payout.countDocuments(filter);
        } catch (error) {
            logger.error(`payout.repo.js << countPayouts() >>>>>> [ERROR] ${error.message}`);
            throw error;
        }
    }
}

export default new PayoutRepository();
