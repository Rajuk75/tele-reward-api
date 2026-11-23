import referralService from './referral.service.js';
import { setSuccess, setCreateSuccess, setBadRequest } from '../../core/responseHelper.js';
import logger from '../../core/logger.js';

class ReferralController {

    // =========================================================================
    // POST /v1/admin/create-new-referral-link
    // =========================================================================
    async createReferral(req, res) {
        try {
            const offerId = req.params.offerId || req.body.offerId || req.query.offerId || null;
            const result = await referralService.createReferral(offerId, req.body);
            return setCreateSuccess(res, { 
                message: 'Referral link created successfully', 
                ...result 
            });
        } catch (error) {
            logger.error(`referral.controller.js << createReferral << ${error.message}`);
            return setBadRequest(res, error.message);
        }
    }

    // =========================================================================
    // GET /v1/admin/get-all-referrals
    // =========================================================================
    async getReferrals(req, res) {
        try {
            const result = await referralService.getReferrals(req.query);
            return setSuccess(res, result);
        } catch (error) {
            logger.error(`referral.controller.js << getReferrals << ${error.message}`);
            return setBadRequest(res, error.message);
        }
    }

    // =========================================================================
    // PUT /v1/admin/referral/:id/update
    // =========================================================================
    async updateReferral(req, res) {
        try {
            const result = await referralService.updateReferral(req.params.id, req.body);
            return setSuccess(res, {
                message: 'Referral link updated successfully',
                referral: result
            });
        } catch (error) {
            logger.error(`referral.controller.js << updateReferral << ${error.message}`);
            return setBadRequest(res, error.message);
        }
    }

    // =========================================================================
    // DELETE /v1/admin/referral/:id/delete
    // =========================================================================
    async deleteReferral(req, res) {
        try {
            const result = await referralService.deleteReferral(req.params.id);
            return setSuccess(res, result);
        } catch (error) {
            logger.error(`referral.controller.js << deleteReferral << ${error.message}`);
            return setBadRequest(res, error.message);
        }
    }
}

export default new ReferralController();
