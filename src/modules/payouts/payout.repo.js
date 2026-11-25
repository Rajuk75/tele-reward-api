import Payout from './payout.model.js';
import logger from '../../core/logger.js';

class PayoutRepository {
    async findById(id) {
        try {
            return await Payout.findById(id)
                .populate('offerId', 'offerName category')
                .populate('createdBy', 'name email')
                .populate('updatedBy', 'name email');
        } catch (error) {
            logger.error(`payout.repo.js << findById() >>>>>> [ERROR] ${error.message}`);
            throw error;
        }
    }

    async findByPayoutTransactionId(payoutTransactionId) {
        try {
            return await Payout.findOne({ payoutTransactionId });
        } catch (error) {
            logger.error(`payout.repo.js << findByPayoutTransactionId() >>>>>> [ERROR] ${error.message}`);
            throw error;
        }
    }

    async updatePayout(id, updateData) {
        try {
            return await Payout.findByIdAndUpdate(id, { $set: updateData }, { new: true });
        } catch (error) {
            logger.error(`payout.repo.js << updatePayout() >>>>>> [ERROR] ${error.message}`);
            throw error;
        }
    }

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
            return await Payout.find(filter).select('-payoutResponse')
                .populate('userId', 'name email phone')
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

    async summarize(filter) {
        return Payout.aggregate([{ $match: filter }, { $group: { _id: '$status', count: { $sum: 1 }, amountPaise: { $sum: '$amount' } } }]);
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
