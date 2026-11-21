import mongoose from 'mongoose';
import clickService from './click.service.js';
import { setSuccess, setBadRequest } from '../../core/responseHelper.js';
import logger from '../../core/logger.js';

class ClickController {
    async createClick(req, res) {
        try {
            const { offerId } = req.params;
            if (!mongoose.Types.ObjectId.isValid(offerId)) {
                return setBadRequest(res, 'Invalid Offer ID format');
            }

            const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress;
            const userAgent = req.headers['user-agent'] || '';

            const result = await clickService.generateClick(offerId, { ...req.body, referralCode: req.body?.referralCode ?? req.query.ref }, { ip, userAgent });
            return setSuccess(res, result);
        } catch (error) {
            logger.error(`click.controller.js << createClick << ${error.message}`);
            return setBadRequest(res, error.message);
        }
    }
}

export default new ClickController();
