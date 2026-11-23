import OfferReferral from './offerReferral.model.js';
import logger from '../../core/logger.js';

class ReferralRepository {

    async createReferral(data, session = null) {
        try {
            return await new OfferReferral(data).save(session ? { session } : undefined);
        } catch (error) {
            logger.error(`referral.repo.js << createReferral() << ${error.message}`);
            throw error;
        }
    }

    async findReferralByCode(referralCode, offerId = null, session = null) {
        try {
            const filter = {
                referralCode: referralCode?.trim()?.toLowerCase(),
                status: 'active'
            };
            if (offerId) filter.offerId = offerId;
            const query = OfferReferral.findOne(filter);
            if (session) query.session(session);
            return await query;
        } catch (error) {
            logger.error(`referral.repo.js << findReferralByCode() << ${error.message}`);
            throw error;
        }
    }

    async findReferralById(id, session = null) {
        try {
            const query = OfferReferral.findById(id);
            if (session) query.session(session);
            return await query;
        } catch (error) {
            logger.error(`referral.repo.js << findReferralById() << ${error.message}`);
            throw error;
        }
    }

    async findReferrals(filter = {}, { skip = 0, limit = 20, sort = { createdAt: -1 } } = {}) {
        try {
            return await OfferReferral.find(filter)
                .populate({
                    path: 'offerId',
                    select: 'offerName category campaignId',
                    populate: { path: 'campaignId', select: 'name category' }
                })
                .populate({
                    path: 'partnerId',
                    select: 'name email phone category channelOrPageUrl'
                })
                .sort(sort)
                .skip(skip)
                .limit(limit)
                .lean();
        } catch (error) {
            logger.error(`referral.repo.js << findReferrals() << ${error.message}`);
            throw error;
        }
    }

    async countReferrals(filter = {}) {
        try {
            return await OfferReferral.countDocuments(filter);
        } catch (error) {
            logger.error(`referral.repo.js << countReferrals() << ${error.message}`);
            throw error;
        }
    }

    async updateReferral(id, updateData) {
        try {
            return await OfferReferral.findByIdAndUpdate(id, { $set: updateData }, { new: true });
        } catch (error) {
            logger.error(`referral.repo.js << updateReferral() << ${error.message}`);
            throw error;
        }
    }

    async deleteReferral(id) {
        try {
            return await OfferReferral.findByIdAndDelete(id);
        } catch (error) {
            logger.error(`referral.repo.js << deleteReferral() << ${error.message}`);
            throw error;
        }
    }

    async incrementStats(id, { clicks = 0, conversions = 0, earnings = 0 } = {}, session = null) {
        try {
            const inc = {};
            if (clicks) inc.totalClicks = clicks;
            if (conversions) inc.totalConversions = conversions;
            if (earnings) inc.totalEarnings = earnings;

            const options = session ? { session, new: true } : { new: true };
            return await OfferReferral.findByIdAndUpdate(id, { $inc: inc }, options);
        } catch (error) {
            logger.error(`referral.repo.js << incrementStats() << ${error.message}`);
            throw error;
        }
    }
}

export default new ReferralRepository();
