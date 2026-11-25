import Campaign from '../campaigns/campaign.model.js';
import Offer from '../offers/offer.model.js';
import Tracking from '../tracking/tracking.model.js';
import Revenue from '../conversions/revenue.model.js';
import Payout from '../payouts/payout.model.js';
import User from '../users/user.model.js';
import logger from '../../core/logger.js';

class DashboardService {
    getStats = async () => {
        try {
            const now = new Date();
            const fourteenDaysAgo = new Date(now);
            fourteenDaysAgo.setUTCDate(fourteenDaysAgo.getUTCDate() - 13);
            fourteenDaysAgo.setUTCHours(0, 0, 0, 0);

            const [
                totalCampaigns,
                activeOffers,
                pausedOffers,
                totalClicks,
                completedConversions,
                pendingConversions,
                revenueData,
                totalUsers,
                payoutStatusStats,
                clickStatusStats,
                offerCategoryStats,
                dailyClicksAgg,
                dailyRevenueAgg,
                topOffersAgg,
                recentTracking
            ] = await Promise.all([
                Campaign.countDocuments({ isDeleted: false }),
                Offer.countDocuments({ status: 'active', isDeleted: false }),
                Offer.countDocuments({ status: { $in: ['paused', 'inactive'] }, isDeleted: false }),
                Tracking.countDocuments({}),
                Tracking.countDocuments({ status: 'completed' }),
                Tracking.countDocuments({ status: { $in: ['pending', 'pending_approval', 'pending_proof'] } }),
                Revenue.aggregate([
                    { $match: { status: { $in: ['settled', 'pending'] } } },
                    {
                        $group: {
                            _id: null,
                            totalAdv: { $sum: '$advertiserAmount' },
                            totalUser: { $sum: '$userReward' },
                            totalMargin: { $sum: '$margin' }
                        }
                    }
                ]),
                User.countDocuments({ isDeleted: false }),
                Payout.aggregate([
                    {
                        $group: {
                            _id: '$status',
                            count: { $sum: 1 },
                            amountPaise: { $sum: '$amountPaise' }
                        }
                    }
                ]),
                Tracking.aggregate([
                    {
                        $group: {
                            _id: '$status',
                            count: { $sum: 1 }
                        }
                    }
                ]),
                Offer.aggregate([
                    { $match: { isDeleted: false } },
                    {
                        $group: {
                            _id: { $ifNull: ['$category', 'General'] },
                            count: { $sum: 1 }
                        }
                    }
                ]),
                Tracking.aggregate([
                    { $match: { createdAt: { $gte: fourteenDaysAgo } } },
                    {
                        $group: {
                            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                            clicks: { $sum: 1 },
                            conversions: {
                                $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
                            }
                        }
                    },
                    { $sort: { _id: 1 } }
                ]),
                Revenue.aggregate([
                    { $match: { createdAt: { $gte: fourteenDaysAgo }, status: { $ne: 'reversed' } } },
                    {
                        $group: {
                            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                            revenuePaise: { $sum: '$advertiserAmount' },
                            payoutPaise: { $sum: '$userReward' },
                            marginPaise: { $sum: '$margin' }
                        }
                    },
                    { $sort: { _id: 1 } }
                ]),
                Tracking.aggregate([
                    { $match: { offerId: { $ne: null } } },
                    {
                        $group: {
                            _id: '$offerId',
                            clicks: { $sum: 1 },
                            conversions: {
                                $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
                            }
                        }
                    },
                    { $sort: { conversions: -1, clicks: -1 } },
                    { $limit: 5 },
                    {
                        $lookup: {
                            from: 'offers',
                            localField: '_id',
                            foreignField: '_id',
                            as: 'offer'
                        }
                    },
                    { $unwind: { path: '$offer', preserveNullAndEmptyArrays: true } },
                    {
                        $project: {
                            name: { $ifNull: ['$offer.offerName', 'Unknown Offer'] },
                            clicks: 1,
                            conversions: 1
                        }
                    }
                ]),
                Tracking.find({})
                    .sort({ createdAt: -1 })
                    .limit(6)
                    .populate('offerId', 'offerName')
                    .select('payoutAccount payoutType status earnedUserAmountPaise createdAt offerId')
                    .lean()
            ]);

            const totalRevenue = revenueData[0]?.totalAdv || 0;
            const totalUserPayouts = revenueData[0]?.totalUser || 0;
            const totalMargin = revenueData[0]?.totalMargin || (totalRevenue - totalUserPayouts);

            const unpaidPayout = payoutStatusStats.find(p => p._id === 'unpaid') || { count: 0, amountPaise: 0 };
            const paidPayout = payoutStatusStats.find(p => p._id === 'paid') || { count: 0, amountPaise: 0 };

            // Build contiguous 14-day series
            const clicksMap = new Map(dailyClicksAgg.map(d => [d._id, d]));
            const revMap = new Map(dailyRevenueAgg.map(d => [d._id, d]));
            const dailyTrend = [];
            for (let i = 0; i < 14; i++) {
                const d = new Date(fourteenDaysAgo);
                d.setUTCDate(fourteenDaysAgo.getUTCDate() + i);
                const key = d.toISOString().slice(0, 10);
                const c = clicksMap.get(key) || { clicks: 0, conversions: 0 };
                const r = revMap.get(key) || { revenuePaise: 0, payoutPaise: 0, marginPaise: 0 };
                dailyTrend.push({
                    day: key,
                    clicks: c.clicks,
                    conversions: c.conversions,
                    revenue: Math.round(r.revenuePaise / 100),
                    payouts: Math.round(r.payoutPaise / 100),
                    margin: Math.round(r.marginPaise / 100)
                });
            }

            return {
                totalCampaigns,
                activeOffers,
                pausedOffers,
                totalClicks,
                completedConversions,
                pendingConversions,
                totalRevenue,
                totalUserPayouts,
                totalMargin,
                totalRevenueINR: totalRevenue / 100,
                totalUserPayoutsINR: totalUserPayouts / 100,
                totalMarginINR: totalMargin / 100,
                pendingPayoutsAmount: unpaidPayout.amountPaise,
                pendingPayoutsCount: unpaidPayout.count,
                paidPayoutsAmount: paidPayout.amountPaise,
                paidPayoutsCount: paidPayout.count,
                totalUsers,
                payoutStatusStats,
                clickStatusStats,
                offerCategoryStats,
                dailyTrend,
                topOffers: topOffersAgg,
                recentActivity: recentTracking.map(item => ({
                    id: item._id,
                    account: item.payoutAccount || 'Anonymous',
                    payoutType: item.payoutType || 'UPI',
                    offerName: item.offerId?.offerName || 'Direct Task',
                    amountPaise: item.earnedUserAmountPaise || 0,
                    status: item.status || 'clicked',
                    createdAt: item.createdAt
                }))
            };
        } catch (error) {
            logger.error(`dashboard.service.js << getStats << ${error.message}`);
            throw error;
        }
    };
}

export default new DashboardService();
