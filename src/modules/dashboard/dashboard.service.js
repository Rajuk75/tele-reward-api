import Campaign from '../campaigns/campaign.model.js';
import Offer from '../offers/offer.model.js';
import Tracking from '../tracking/tracking.model.js';
import Revenue from '../conversions/revenue.model.js';
import User from '../users/user.model.js';
import logger from '../../core/logger.js';

class DashboardService {
    getStats = async () => {
        try {
            const startOfMonth = new Date();
            startOfMonth.setDate(1);
            startOfMonth.setHours(0, 0, 0, 0);

            const [
                totalCampaigns,
                activeOffers,
                totalClicks,
                completedConversions,
                revenueData,
                totalUsers
            ] = await Promise.all([
                Campaign.countDocuments({ isDeleted: false }),
                Offer.countDocuments({ status: 'active', isDeleted: false }),
                Tracking.countDocuments({}),
                Tracking.countDocuments({ status: 'completed' }),
                Revenue.aggregate([
                    { $match: { status: 'settled' } },
                    { $group: { _id: null, totalAdv: { $sum: '$advertiserAmount' }, totalUser: { $sum: '$userReward' } } }
                ]),
                User.countDocuments({ isDeleted: false })
            ]);

            const totalRevenue = revenueData[0]?.totalAdv || 0;
            const totalUserPayouts = revenueData[0]?.totalUser || 0;

            return {
                totalCampaigns,
                activeOffers,
                totalClicks,
                completedConversions,
                totalRevenue,
                totalUserPayouts,
                totalUsers
            };
        } catch (error) {
            logger.error(`dashboard.service.js << getStats << ${error.message}`);
            throw error;
        }
    };
}

export default new DashboardService();

