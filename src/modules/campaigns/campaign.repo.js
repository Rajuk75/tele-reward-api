import Campaign from './campaign.model.js';
import CampaignEvent from './campaignEvent.model.js';
import Offer from '../offers/offer.model.js';
import logger from '../../core/logger.js';

class CampaignRepository {
    async createCampaign(data) {
        try {
            return await Campaign.create(data);
        } catch (error) {
            logger.error(`campaign.repo.js << createCampaign() << ${error.message}`);
            throw error;
        }
    }

    async createEvents(events) {
        try {
            return await CampaignEvent.insertMany(events);
        } catch (error) {
            logger.error(`campaign.repo.js << createEvents() << ${error.message}`);
            throw error;
        }
    }

    async findCampaignById(id, { populate = true } = {}) {
        try {
            const query = Campaign.findOne({ _id: id, isDeleted: false });
            if (populate) query.populate('events');
            return await query;
        } catch (error) {
            logger.error(`campaign.repo.js << findCampaignById() << ${error.message}`);
            throw error;
        }
    }

    async findCampaigns(filter = {}, { skip = 0, limit = 15, sort = { createdAt: -1 } } = {}) {
        try {
            return await Campaign.find(filter)
                .populate('events')
                .sort(sort)
                .skip(skip)
                .limit(limit);
        } catch (error) {
            logger.error(`campaign.repo.js << findCampaigns() << ${error.message}`);
            throw error;
        }
    }

    async countCampaigns(filter = {}) {
        try {
            return await Campaign.countDocuments(filter);
        } catch (error) {
            logger.error(`campaign.repo.js << countCampaigns() << ${error.message}`);
            throw error;
        }
    }

    async findAvailableCampaigns(takenCampaignIds = []) {
        try {
            return await Campaign.find({
                status: 'active',
                isDeleted: false,
                _id: { $nin: takenCampaignIds }
            })
                .select('_id name')
                .populate('events')
                .lean();
        } catch (error) {
            logger.error(`campaign.repo.js << findAvailableCampaigns() << ${error.message}`);
            throw error;
        }
    }

    async softDeleteCampaign(id) {
        try {
            const campaign = await Campaign.findOneAndUpdate(
                { _id: id, isDeleted: false },
                { $set: { isDeleted: true, status: 'inactive' } },
                { new: true }
            );

            if (!campaign) throw new Error('Campaign not found');

            await Promise.all([
                Offer.updateMany({ campaignId: id }, { $set: { isDeleted: true, status: 'inactive' } }),
                CampaignEvent.updateMany({ campaignId: id }, { $set: { isDeleted: true } })
            ]);

            return campaign;
        } catch (error) {
            logger.error(`campaign.repo.js << softDeleteCampaign() << ${error.message}`);
            throw error;
        }
    }
}

export default new CampaignRepository();
