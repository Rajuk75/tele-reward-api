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
                            totalAdvertiserRevenue: { $sum: '$advertiserAmount' },
                            totalUserPayouts: { $sum: '$userRewardINR' },
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
                    marginPercentage: totalAdv > 0 ? Number(((totalMargin / totalAdv) * 100).toFixed(2)) : 0
                }
            };
        } catch (error) {
            logger.error(`conversion.service.js << getRevenueStats() << ${error.message}`);
            throw error;
        }
    };
    getConversions = async (params = {}) => {
        try {
            const {
                page = 1,
                limit = 15,
                status,
                offerId,
                campaignId,
                search,
                startDate,
                endDate
            } = params;

            const filter = {};

            if (status) filter.status = status;
            if (offerId) filter.offerId = offerId;
            if (campaignId) filter.campaignId = campaignId;

            if (search) {
                filter.$or = [
                    { clickId: { $regex: search, $options: 'i' } },
                    { payoutAccount: { $regex: search, $options: 'i' } }
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

            const [conversions, total] = await Promise.all([
                Tracking.find(filter)
                    .populate('offerId', 'offerName totalPayout firstEventPayout')
                    .populate('campaignId', 'name category')
                    .populate('userId', 'name email phone')
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(Number(limit))
                    .lean(),
                Tracking.countDocuments(filter)
            ]);

            return {
                conversions,
                pagination: {
                    total,
                    page: Number(page),
                    limit: Number(limit),
                    totalPages: Math.ceil(total / Number(limit))
                }
            };
        } catch (error) {
            logger.error(`conversion.service.js << getConversions() << ${error.message}`);
            throw error;
        }
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

