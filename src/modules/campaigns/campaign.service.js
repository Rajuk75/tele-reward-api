import Campaign from './campaign.model.js';
import CampaignEvent from './campaignEvent.model.js';
import Offer from '../offers/offer.model.js';
import logger from '../../core/logger.js';

async function saveEvents(campaign, events, session) {
    const keys = events.map(e => (e.eventKey || e.name || '').trim().toLowerCase());
    if (keys.includes('') || new Set(keys).size !== keys.length) throw new Error('Each milestone needs a distinct event key');
    const saved = [];
    const retained = new Set(events.filter(e => e._id).map(e => String(e._id)));
    await CampaignEvent.updateMany({ campaignId: campaign._id, _id: { $in: campaign.events.filter(id => !retained.has(String(id))) } },
        { $set: { isDeleted: true } }, { session });
    for (const [index, e] of events.entries()) {
        const doc = e._id ? await CampaignEvent.findOne({ _id: e._id, campaignId: campaign._id, isDeleted: false }).session(session) : new CampaignEvent();
        if (!doc) throw new Error('Unknown campaign milestone');
        doc.set({ ...e, eventKey: keys[index], campaignId: campaign._id,
            advertiserPayout: Number(e.advertiserPayout ?? e.payout ?? 0), order: e.order ?? index + 1 });
        saved.push(await doc.save({ session }));
    }
    campaign.events = saved.map(e => e._id);
    campaign.totalAdvertiserPayout = saved.reduce((sum, e) => sum + e.advertiserPayout, 0);
}

class CampaignService {
    createCampaign = async (data) => {
        try {
            logger.info(`campaign.service.js << createCampaign() << Creating campaign: ${data.name}`);
            const { events, ...campaignData } = data;

            const campaign = await Campaign.db.transaction(async session => {
                const doc = new Campaign({ ...campaignData, events: [] });
                await saveEvents(doc, events ?? [], session);
                return doc.save({ session });
            });
            return await Campaign.findById(campaign._id).populate('events');
        } catch (error) {
            logger.error(`campaign.service.js << createCampaign() << ${error.message}`);
            throw error;
        }
    };

    getAllCampaigns = async ({ page = 1, limit = 15, search = '', status = '', category = '' } = {}) => {
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
                Campaign.find(filter)
                    .populate('events')
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(Number(limit))
                    .lean(),
                Campaign.countDocuments(filter)
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
    };

    getAvailableCampaigns = async () => {
        try {
            const takenCampaignIds = await Offer.distinct('campaignId', { isDeleted: false });
            const campaigns = await Campaign.find({
                status: 'active',
                isDeleted: false,
                _id: { $nin: takenCampaignIds }
            }).select('_id name events').populate('events').lean();
            return campaigns;
        } catch (error) {
            logger.error(`campaign.service.js << getAvailableCampaigns() << ${error.message}`);
            throw error;
        }
    };

    getCampaignById = async (id) => {
        try {
            const campaign = await Campaign.findOne({ _id: id, isDeleted: false }).populate('events');
            if (!campaign) throw new Error('Campaign not found');
            return campaign;
        } catch (error) {
            logger.error(`campaign.service.js << getCampaignById() << ${error.message}`);
            throw error;
        }
    };

    updateCampaign = async (id, data) => {
        try {
            const { events, ...fields } = data;
            await Campaign.db.transaction(async session => {
                const campaign = await Campaign.findOne({ _id: id, isDeleted: false }).session(session);
                if (!campaign) throw new Error('Campaign not found');
                campaign.set(fields);
                if (events !== undefined) await saveEvents(campaign, events, session);
                await campaign.save({ session });
            });
            return Campaign.findById(id).populate('events');
        } catch (error) {
            logger.error(`campaign.service.js << updateCampaign() << ${error.message}`);
            throw error;
        }
    };

    deleteCampaign = async (id) => {
        try {
            const campaign = await Campaign.findOneAndUpdate(
                { _id: id, isDeleted: false },
                { $set: { isDeleted: true, status: 'inactive' } },
                { new: true }
            );
            if (!campaign) throw new Error('Campaign not found');

            // Cascade delete linked offer & events
            await Offer.updateMany({ campaignId: id }, { $set: { isDeleted: true, status: 'inactive' } });
            await CampaignEvent.updateMany({ campaignId: id }, { $set: { isDeleted: true } });

            return { message: 'Campaign and linked offers deleted successfully' };
        } catch (error) {
            logger.error(`campaign.service.js << deleteCampaign() << ${error.message}`);
            throw error;
        }
    };
}

export default new CampaignService();

