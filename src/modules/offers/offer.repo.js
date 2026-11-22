import Offer, { populateOfferEvents } from './offer.model.js';
import OfferEvent from './offerEvent.model.js';
import logger from '../../core/logger.js';

class OfferRepository {
    async createOffer(data, session) {
        try {
            return await new Offer(data).save({ session });
        } catch (error) {
            logger.error(`offer.repo.js << createOffer() << ${error.message}`);
            throw error;
        }
    }

    async createOfferEvents(events, session) {
        try {
            return await OfferEvent.insertMany(events, { ordered: true, session });
        } catch (error) {
            logger.error(`offer.repo.js << createOfferEvents() << ${error.message}`);
            throw error;
        }
    }

    async findOfferById(id, { populate = true } = {}) {
        try {
            const query = Offer.findOne({ _id: id, isDeleted: false });
            if (populate) {
                query.populate('campaignId').populate(populateOfferEvents);
            }
            return await query.lean();
        } catch (error) {
            logger.error(`offer.repo.js << findOfferById() << ${error.message}`);
            throw error;
        }
    }

    async findOffers(filter = {}, { skip = 0, limit = 15, sort = { priority: -1, createdAt: -1 } } = {}) {
        try {
            const offers = await Offer.find(filter)
                .populate('campaignId', 'name status category model')
                .populate(populateOfferEvents)
                .sort(sort)
                .skip(skip)
                .limit(limit)
                .lean();
            return offers.map(offer => {
                const events = Array.isArray(offer.events) ? offer.events : [];
                return {
                    ...offer,
                    totalPayout: events.reduce((sum, event) => sum + (event.userPayout || 0), 0),
                    totalCap: events.reduce((sum, event) => sum + (event.campaignEventId?.cap || 0), 0)
                };
            });
        } catch (error) {
            logger.error(`offer.repo.js << findOffers() << ${error.message}`);
            throw error;
        }
    }

    async countOffers(filter = {}) {
        try {
            return await Offer.countDocuments(filter);
        } catch (error) {
            logger.error(`offer.repo.js << countOffers() << ${error.message}`);
            throw error;
        }
    }

    async softDeleteOffer(id) {
        try {
            const offer = await Offer.findOneAndUpdate(
                { _id: id, isDeleted: false },
                { $set: { isDeleted: true, status: 'inactive', isActive: false } },
                { new: true }
            );
            if (!offer) throw new Error('Offer not found');
            return offer;
        } catch (error) {
            logger.error(`offer.repo.js << softDeleteOffer() << ${error.message}`);
            throw error;
        }
    }

    async updateOfferStatus(id, status) {
        try {
            const offer = await Offer.findOneAndUpdate(
                { _id: id, isDeleted: false },
                { $set: { status, isActive: status === 'active' } },
                { new: true }
            );
            if (!offer) throw new Error('Offer not found');
            return offer;
        } catch (error) {
            logger.error(`offer.repo.js << updateOfferStatus() << ${error.message}`);
            throw error;
        }
    }
}

export default new OfferRepository();
