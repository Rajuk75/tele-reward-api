import payoutService from './payout.service.js';
import { setSuccess, setCreateSuccess, setBadRequest, setServerError } from '../../core/responseHelper.js';
import logger from '../../core/logger.js';

class PayoutController {
    async getPayouts(req, res) {
        try {
            const result = await payoutService.getPayouts(req.query);
            return setSuccess(res, {
                message: 'Payouts fetched successfully',
                ...result
            });
        } catch (error) {
            logger.error(`payout.controller.js << getPayouts << ${error.message}`);
            return setBadRequest(res, { message: error.message });
        }
    }

    async sendPayout(req, res) {
        try {
            const { id } = req.params;
            if (!id) {
                return setBadRequest(res, { message: 'Payout ID is required' });
            }

            const result = await payoutService.sendPayout(id, req.user?._id);

            if (!result.success) {
                return setBadRequest(res, {
                    message: result.message || 'Failed to initiate payout',
                    payout: result.payout
                });
            }

            return setCreateSuccess(res, {
                message: result.message || 'Payout initiated successfully',
                payout: result.payout
            });
        } catch (error) {
            logger.error(`payout.controller.js << sendPayout << ${error.message}`);
            return setBadRequest(res, { message: error.message });
        }
    }

    async handleWebhook(req, res) {
        try {
            const updated = await payoutService.processGatewayWebhook(req.body);
            return setSuccess(res, {
                message: 'Webhook processed successfully',
                payout: updated
            });
        } catch (error) {
            logger.error(`payout.controller.js << handleWebhook << ${error.message}`);
            return setBadRequest(res, { message: error.message });
        }
    }
}

export default new PayoutController();
