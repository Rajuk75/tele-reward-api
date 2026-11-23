import partnerService from './partner.service.js';
import { setSuccess, setCreateSuccess, setBadRequest } from '../../core/responseHelper.js';
import logger from '../../core/logger.js';

class PartnerController {

    // =========================================================================
    // GET /v1/admin/get-all-partners (For Dropdown & List)
    // =========================================================================
    async getAllPartners(req, res) {
        try {
            const result = await partnerService.getAllPartners(req.query);
            return setSuccess(res, result);
        } catch (error) {
            logger.error(`partner.controller.js << getAllPartners << ${error.message}`);
            return setBadRequest(res, error.message);
        }
    }

    // =========================================================================
    // POST /v1/admin/create-new-partner
    // =========================================================================
    async createPartner(req, res) {
        try {
            const partner = await partnerService.createPartner(req.body);
            return setCreateSuccess(res, {
                message: 'Partner registered successfully',
                partner
            });
        } catch (error) {
            logger.error(`partner.controller.js << createPartner << ${error.message}`);
            return setBadRequest(res, error.message);
        }
    }
}

export default new PartnerController();
