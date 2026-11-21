import payoutService from './payout.service.js';
import { setSuccess, setBadRequest } from '../../core/responseHelper.js';
import logger from '../../core/logger.js';

class PayoutController {
    async getPayouts(req, res) {
        try {
            const result = await payoutService.getPayouts(req.query);
            return setSuccess(res, result);
        } catch (error) {
            logger.error(`payout.controller.js << getPayouts << ${error.message}`);
            return setBadRequest(res, error.message);
        }
    }
}

export default new PayoutController();
