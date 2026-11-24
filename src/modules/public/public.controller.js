import publicService from './public.service.js';
import { setSuccess, setBadRequest } from '../../core/responseHelper.js';
import logger from '../../core/logger.js';

class PublicController {
    getPublicStatus = async (req, res) => {
        try {
            const query = req.query.query || req.query.account || req.query.clickId;
            const data = await publicService.getPublicStatus(query);
            return setSuccess(res, data);
        } catch (error) {
            logger.error(`public.controller.js << getPublicStatus() << ${error.message}`);
            return setBadRequest(res, { message: error.message });
        }
    };
}

export default new PublicController();

