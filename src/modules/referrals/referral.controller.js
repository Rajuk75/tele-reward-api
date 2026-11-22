import referralService from './referral.service.js';
import { setCreateSuccess, setBadRequest } from '../../core/responseHelper.js';
import logger from '../../core/logger.js';

class ReferralController {
    createReferral = async (req, res) => {
        try {
            const offerId = req.params.offerId || req.body.offerId || req.query.offerId || null;
            const result = await referralService.createReferral(offerId, req.body);
            return setCreateSuccess(res, { 
                message: 'Referral created successfully', 
                ...result 
            });
        } catch (error) {
            logger.error(`referral.controller.js << createReferral << ${error.message}`);
            return setBadRequest(res, error.message);
        }
    };
}

export default new ReferralController();
