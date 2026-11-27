import Offer from '../offers/offer.model.js';
import Tracking from '../tracking/tracking.model.js';
import Campaign from '../campaigns/campaign.model.js';
import logger from '../../core/logger.js';

class PublicService {
    getPublicStatus = async (searchQuery) => {
        try {
            const query = (searchQuery || '').trim();
            if (!query) {
                throw new Error('Please enter your Account Number, UPI ID, or Click ID');
            }

            const records = await Tracking.find({
                $or: [
                    { clickId: query },
                    { payoutAccount: query },
                    { payoutAccount: query.toLowerCase() }
                ]
            })
            .populate('offerId', 'offerName totalPayout firstEventPayout category')
            .populate('campaignId', 'name category imageUrl')
            .sort({ createdAt: -1 })
            .limit(30)
            .lean();

            return records.map(rec => {
                let displayStatus = 'In Progress';
                let statusBadge = 'warning';
                let statusMessage = 'Offer started. Complete app install and open.';

                switch (rec.status) {
                    case 'clicked':
                    case 'pending':
                        displayStatus = rec.milestones ? 'Clicked' : 'Pending Install';
                        statusBadge = 'warning';
                        statusMessage = 'Link opened. Awaiting advertiser confirmation.';
                        break;
                    case 'partially_completed':
                        displayStatus = 'Partially Completed';
                        statusBadge = 'info';
                        statusMessage = 'Some milestones have been processed.';
                        break;
                    case 'in_progress':
                        displayStatus = 'In Progress';
                        statusBadge = 'info';
                        statusMessage = 'App install detected. Finishing task requirements.';
                        break;
                    case 'pending_approval':
                    case 'pending_review':
                        displayStatus = 'Under Review';
                        statusBadge = 'info';
                        statusMessage = 'Task completed! Payout is under review by team.';
                        break;
                    case 'completed':
                        displayStatus = 'Completed';
                        statusBadge = 'success';
                        statusMessage = 'All required milestones have been processed.';
                        break;
                    case 'rejected':
                    case 'fraud':
                        displayStatus = 'Rejected';
                        statusBadge = 'danger';
                        statusMessage = rec.adminNote || 'Terms were not met or duplicate install detected.';
                        break;
                    default:
                        displayStatus = rec.status;
                }

                return {
                    clickId: rec.clickId,
                    maxUserEarningPaise: rec.maxUserEarningPaise,
                    earnedUserAmountPaise: rec.earnedUserAmountPaise,
                    milestones: rec.milestones?.map(({ eventKey, eventName, status, userSharePaise }) => ({ eventKey, eventName, status, userSharePaise })),
                    icon: rec.campaignId?.imageUrl || null,
                    offerName: rec.campaignId?.name || rec.offerId?.offerName || 'Special Task',
                    category: rec.campaignId?.category || rec.offerId?.category || 'App Task',
                    payoutAccount: rec.payoutAccount,
                    rewardAmount: rec.milestones ? rec.earnedUserAmountPaise / 100 : rec.amountAwarded || rec.userRewardINR || 0,
                    status: displayStatus,
                    statusBadge,
                    statusMessage,
                    createdAt: rec.createdAt,
                    conversionDate: rec.conversionDate || null
                };
            });
        } catch (error) {
            logger.error(`public.service.js << getPublicStatus() << ${error.message}`);
            throw error;
        }
    };
}

export default new PublicService();
