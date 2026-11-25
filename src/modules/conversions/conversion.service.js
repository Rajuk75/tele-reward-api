import { reportQuery, pagination } from '../../core/reportQuery.js';
import conversionRepo from './conversion.repo.js';
import Tracking from '../tracking/tracking.model.js';
import Offer from '../offers/offer.model.js';
import Campaign from '../campaigns/campaign.model.js';
import Revenue from './revenue.model.js';
import logger from '../../core/logger.js';

class ConversionService {
    getRevenueStats = async () => {
        try {
            let totalAdv = 0;
            let totalUser = 0;
            let totalMargin = 0;
            let totalConversions = 0;

            const revAgg = await Revenue.aggregate([
                {
                    $group: {
                        _id: null,
                        totalAdvertiserRevenue: { $sum: '$advertiserAmount' },
                        totalUserPayouts: { $sum: '$userReward' },
                        totalMargin: { $sum: '$margin' },
                        count: { $sum: 1 }
                    }
                }
            ]);

            if (revAgg.length > 0) {
                totalAdv = revAgg[0].totalAdvertiserRevenue || 0;
                totalUser = revAgg[0].totalUserPayouts || 0;
                totalMargin = revAgg[0].totalMargin || 0;
                totalConversions = revAgg[0].count || 0;
            } else {
                const trackAgg = await Tracking.aggregate([
                    { $match: { status: 'completed' } },
                    {
                        $group: {
                            _id: null,
                            totalAdvertiserRevenue: { $sum: { $cond: [
                                { $isArray: '$milestones' }, '$advertiserAmount', { $multiply: ['$advertiserAmount', 100] },
                            ] } },
                            totalUserPayouts: { $sum: { $ifNull: ['$earnedUserAmountPaise', { $multiply: ['$userRewardINR', 100] }] } },
                            count: { $sum: 1 }
                        }
                    }
                ]);
                if (trackAgg.length > 0) {
                    totalAdv = trackAgg[0].totalAdvertiserRevenue || 0;
                    totalUser = trackAgg[0].totalUserPayouts || 0;
                    totalMargin = totalAdv - totalUser;
                    totalConversions = trackAgg[0].count || 0;
                }
            }

            return {
                summary: {
                    totalAdvertiserRevenue: totalAdv,
                    totalUserPayouts: totalUser,
                    totalMargin: totalMargin,
                    totalConversions: totalConversions,
                    marginPercentage: totalAdv > 0 ? Number(((totalMargin / totalAdv) * 100).toFixed(2)) : 0,
                    totalAdvertiserRevenueINR: totalAdv / 100,
                    totalUserPayoutsINR: totalUser / 100,
                    totalMarginINR: totalMargin / 100
                }
            };
        } catch (error) {
            logger.error(`conversion.service.js << getRevenueStats() << ${error.message}`);
            throw error;
        }
    };
    getConversions = async params => {
        const query = reportQuery(params);
        const { rows, total } = await conversionRepo.list(query);
        return { conversions: rows, pagination: pagination(query.page, query.limit, total) };
    };

    getConversionById = async (id) => {
        try {
            const conversion = await Tracking.findById(id)
                .populate('offerId')
                .populate('campaignId')
                .populate('userId', 'name email phone')
                .lean();

            if (!conversion) throw new Error('Tracking record not found');
            return conversion;
        } catch (error) {
            logger.error(`conversion.service.js << getConversionById() << ${error.message}`);
            throw error;
        }
    };

    updateStatus = async (id, status, adminNote = '') => {
        try {
            const conversion = await Tracking.findById(id);
            if (!conversion) throw new Error('Tracking record not found');

            if (conversion.milestones?.length && !['rejected', 'fraud', conversion.status].includes(status)) {
                throw new Error('Milestone progress is updated by advertiser postbacks');
            }
            conversion.status = status;
            if (adminNote) conversion.adminNote = adminNote;
            if (status === 'completed' && !conversion.milestones?.length) {
                conversion.conversionDate = new Date();
                conversion.amountAwarded = conversion.userRewardINR;
                conversion.totalAmountAwarded = conversion.userRewardINR;
            }

            await conversion.save();
            return conversion;
        } catch (error) {
            logger.error(`conversion.service.js << updateStatus() << ${error.message}`);
            throw error;
        }
    };
}

export default new ConversionService();

