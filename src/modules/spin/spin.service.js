import offerRepo from '../offers/offer.repo.js';
import referralRepo from '../referrals/referral.repo.js';
import logger from '../../core/logger.js';
import {
    getSpinCookieName,
    verifySpinToken,
    signSpinToken,
    pickWeightedSlice,
} from '../../core/spinToken.utility.js';

class SpinService {
    async spinOffer({ offerId, referralCode, cookies = {} } = {}) {
        try {
            let targetOfferId = offerId;
            if (referralCode) {
                const activeReferral = await referralRepo.findReferralByCode(String(referralCode).trim(), targetOfferId);
                if (!activeReferral) throw new Error('Invalid or expired referral link');
                targetOfferId = activeReferral.offerId;
            }

            if (!targetOfferId) throw new Error('No task specified');

            const offer = await offerRepo.findOfferById(targetOfferId);
            const campaign = offer?.campaignId;
            if (!offer || offer.isDeleted || offer.status !== 'active' || !offer.isActive || !campaign || campaign.isDeleted || campaign.status !== 'active') {
                throw new Error('Offer or Campaign is inactive');
            }

            const spin = offer.spinSettings;
            if (!spin?.enabled || !Array.isArray(spin.slices) || spin.slices.length < 2) {
                throw new Error('Spin & Win bonus is not enabled for this offer');
            }

            const cookieName = getSpinCookieName(offer._id);
            const existing = verifySpinToken(cookies?.[cookieName], offer._id);
            if (existing) {
                return {
                    alreadySpun: true,
                    bonus: existing.bonus,
                    sliceIndex: existing.sliceIndex,
                    offerId: offer._id,
                };
            }

            const { bonus, sliceIndex } = pickWeightedSlice(spin.slices);
            const token = signSpinToken({ offerId: offer._id, bonus, sliceIndex });

            return {
                alreadySpun: false,
                bonus,
                sliceIndex,
                offerId: offer._id,
                cookieName,
                token,
            };
        } catch (error) {
            logger.error(`spin.service.js << spinOffer() << ${error.message}`);
            throw error;
        }
    }
}

export default new SpinService();
