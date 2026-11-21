import payoutRepo from './payout.repo.js';
import logger from '../../core/logger.js';

class PayoutService {

    // ==========================================================================
    // Internal Creation (Used by Postbacks, Referrals, etc.)
    // ==========================================================================

    async createPayout(data) {
        try {
            if (!data) {
                throw new Error('Payout data is required');
            }

            const payoutAccount = (data.payoutAccount || '').trim();
            if (!payoutAccount) {
                throw new Error('Payout account (UPI ID or Bank Account) is required');
            }

            const amount = Number(data.amount);
            if (isNaN(amount) || amount <= 0) {
                throw new Error('A valid payout amount greater than 0 is required');
            }

            const type = data.type || 'offer_completion';
            if (type === 'offer_completion' && !data.trackingId) {
                throw new Error('trackingId is required for offer completion payout');
            }

            const payload = {
                type,
                trackingId: data.trackingId || null,
                clickId: data.clickId || null,
                offerId: data.offerId || null,
                userId: data.userId || null,
                payoutAccount,
                payoutType: (data.payoutType || 'UPI').toUpperCase(),
                payoutHolderName: data.payoutHolderName?.trim() || null,
                payoutIfsc: data.payoutIfsc?.trim() || null,
                amount,
                status: data.status || 'unpaid',
                createdBy: data.createdBy || null,
                notes: data.notes?.trim() || null
            };

            logger.info(`payout.service.js << createPayout() >>>>>> [CREATE] Account:${payload.payoutAccount} | Amount:₹${payload.amount} | Type:${payload.type}`);
            return await payoutRepo.createPayout(payload);
        } catch (error) {
            logger.error(`payout.service.js << createPayout() >>>>>> [ERROR] ${error.message}`);
            throw error;
        }
    }

    // ==========================================================================
    // Admin: List All Payouts with Filtering & Pagination
    // ==========================================================================

    async getPayouts({ page = 1, limit = 20, status = '', type = '', search = '', startDate = '', endDate = '' } = {}) {
        try {
            logger.info(`payout.service.js << getPayouts() >>>>>> [FETCH] page:${page} limit:${limit} status:${status || 'all'}`);

            const filter = {};
            if (status) filter.status = status;
            if (type) filter.type = type;

            if (search) {
                const cleanSearch = search.trim();
                filter.$or = [
                    { payoutAccount: { $regex: cleanSearch, $options: 'i' } },
                    { clickId: { $regex: cleanSearch, $options: 'i' } },
                    { utr: { $regex: cleanSearch, $options: 'i' } }
                ];
            }

            if (startDate || endDate) {
                filter.createdAt = {};
                if (startDate) filter.createdAt.$gte = new Date(startDate);
                if (endDate) {
                    const end = new Date(endDate);
                    end.setHours(23, 59, 59, 999);
                    filter.createdAt.$lte = end;
                }
            }

            const skip = (Number(page) - 1) * Number(limit);
            const [payouts, total] = await Promise.all([
                payoutRepo.findPayouts(filter, { skip, limit: Number(limit) }),
                payoutRepo.countPayouts(filter)
            ]);

            return {
                payouts,
                pagination: {
                    total,
                    page: Number(page),
                    limit: Number(limit),
                    totalPages: Math.ceil(total / Number(limit))
                }
            };
        } catch (error) {
            logger.error(`payout.service.js << getPayouts() >>>>>> [ERROR] ${error.message}`);
            throw error;
        }
    }
}

export default new PayoutService();
