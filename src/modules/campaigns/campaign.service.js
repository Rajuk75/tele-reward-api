import campaignRepo from './campaign.repo.js';
import Campaign from './campaign.model.js';
import CampaignEvent from './campaignEvent.model.js';
import Offer from '../offers/offer.model.js';
import logger from '../../core/logger.js';

class CampaignService {

    async createCampaign(data) {
        try {
            logger.debug(`campaign.service.js << createCampaign() << Incoming payload: ${JSON.stringify(data)}`);

            const { campaign: campaignData, events } = data;

            if (!campaignData) {
                logger.warn('campaign.service.js << createCampaign() << Missing campaign data in request payload');
                throw new Error('Campaign data is required');
            }

            if (!Array.isArray(events) || events.length === 0) {
                logger.warn('campaign.service.js << createCampaign() << Missing or empty events array in request payload');
                throw new Error('Campaign must have at least one event');
            }

            logger.info(`campaign.service.js << createCampaign() << Creating campaign: "${campaignData.name}" with ${events.length} event(s)`);

            const campaign = await campaignRepo.createCampaign(campaignData);
            logger.debug(`campaign.service.js << createCampaign() << Campaign record created: ID ${campaign._id}`);

            const eventDocs = events.map((event, index) => {
                const eventKey = (event.eventKey || event.name || '').trim().toLowerCase();
                if (!eventKey) {
                    logger.warn(`campaign.service.js << createCampaign() << Event at index ${index} missing eventKey and name`);
                    throw new Error('Each event needs an event key or name');
                }

                return {
                    ...event,
                    campaignId: campaign._id,
                    eventKey,
                    advertiserPayout: Number(event.advertiserPayout ?? event.payout ?? 0),
                    order: event.order ?? (index + 1)
                };
            });

            await campaignRepo.createEvents(eventDocs);
            logger.debug(`campaign.service.js << createCampaign() << Created ${eventDocs.length} event doc(s): ${JSON.stringify(eventDocs)}`);

            const result = await campaignRepo.findCampaignById(campaign._id);
            logger.info(`campaign.service.js << createCampaign() << Successfully created campaign "${campaign.name}" (ID: ${campaign._id})`);

            return result;
        } catch (error) {
            logger.error(`campaign.service.js << createCampaign() << ${error.message}`);
            throw error;
        }
    }

    async getAllCampaigns({ page = 1, limit = 15, search = '', status = '', category = '' } = {}) {
        try {
            const filter = { isDeleted: false };
            if (status) filter.status = status;
            if (category) filter.category = category;
            if (search) {
                filter.$or = [
                    { name: { $regex: search, $options: 'i' } },
                    { description: { $regex: search, $options: 'i' } }
                ];
            }

            const skip = (Number(page) - 1) * Number(limit);
            const [campaigns, total] = await Promise.all([
                campaignRepo.findCampaigns(filter, { skip, limit: Number(limit) }),
                campaignRepo.countCampaigns(filter)
            ]);

            return {
                campaigns,
                pagination: {
                    total,
                    page: Number(page),
                    limit: Number(limit),
                    totalPages: Math.ceil(total / Number(limit))
                }
            };
        } catch (error) {
            logger.error(`campaign.service.js << getAllCampaigns() << ${error.message}`);
            throw error;
        }
    }

    async getAvailableCampaigns() {
        try {
            const takenCampaignIds = await Offer.distinct('campaignId', { isDeleted: false });
            return await campaignRepo.findAvailableCampaigns(takenCampaignIds);
        } catch (error) {
            logger.error(`campaign.service.js << getAvailableCampaigns() << ${error.message}`);
            throw error;
        }
    }

    async getCampaignById(id) {
        try {
            const campaign = await campaignRepo.findCampaignById(id);
            if (!campaign) throw new Error('Campaign not found');
            return campaign;
        } catch (error) {
            logger.error(`campaign.service.js << getCampaignById() << ${error.message}`);
            throw error;
        }
    }

    async updateCampaign(id, data) {
        try {
            const { campaign: fields, events } = data;
            const campaign = await Campaign.findOne({ _id: id, isDeleted: false });
            if (!campaign) throw new Error('Campaign not found');

            if (fields) {
                campaign.set(fields);
            }
            if (Array.isArray(events)) {
                await this._syncEvents(campaign._id, events);
            }
            await campaign.save();

            return await campaignRepo.findCampaignById(id);
        } catch (error) {
            logger.error(`campaign.service.js << updateCampaign() << ${error.message}`);
            throw error;
        }
    }

    async deleteCampaign(id) {
        try {
            await campaignRepo.softDeleteCampaign(id);
            return { message: 'Campaign and linked offers deleted successfully' };
        } catch (error) {
            logger.error(`campaign.service.js << deleteCampaign() << ${error.message}`);
            throw error;
        }
    }

    async _syncEvents(campaignId, events) {
        const keys = events.map(e => (e.eventKey || e.name || '').trim().toLowerCase());
        if (keys.includes('') || new Set(keys).size !== keys.length) {
            throw new Error('Each milestone needs a distinct event key');
        }

        const retained = events.filter(e => e._id).map(e => String(e._id));
        await CampaignEvent.updateMany(
            { campaignId, isDeleted: false, _id: { $nin: retained } },
            { $set: { isDeleted: true } }
        );

        for (const [index, e] of events.entries()) {
            const doc = e._id
                ? await CampaignEvent.findOne({ campaignId, isDeleted: false, _id: e._id })
                : new CampaignEvent();

            if (!doc) throw new Error('Unknown campaign milestone');

            doc.set({
                ...e,
                eventKey: keys[index],
                campaignId,
                advertiserPayout: Number(e.advertiserPayout ?? e.payout ?? 0),
                order: e.order ?? (index + 1)
            });

            await doc.save();
        }
    }
}

export default new CampaignService();
