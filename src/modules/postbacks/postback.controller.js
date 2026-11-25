import postbackService from './postback.service.js';
import { setSuccess, setBadRequest } from '../../core/responseHelper.js';
import logger from '../../core/logger.js';

class PostbackController {
    async handlePostback(req, res) {
        try {
            const clickId = req.query.cid || req.query.click_id || req.query.clickId;
            const secret = req.query.secret;
            const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress;

            const result = await postbackService.handlePostback(clickId, secret, ip, req.query);
            return res.status(200).json({ 
                status: 'OK', 
                message: 'Postback processed successfully', 
                data: result 
            });
        } catch (error) {
            logger.error(`postback.controller.js << handlePostback << ${error.message}`);
            if (error.message?.includes('already completed')) {
                return res.status(200).json({ status: 'DUPLICATE', message: error.message });
            }
            const databaseError = error.name?.startsWith('Mongo');
            return res.status(databaseError ? 503 : 400).json({ status: 'ERROR', message: databaseError ? 'Please retry the postback' : error.message });
        }
    }

    async getOverview(req, res) {
        try {
            return setSuccess(res, await postbackService.getOverview());
        } catch (error) {
            logger.error(`postback.controller.js << getOverview << ${error.message}`);
            return res.status(500).json({ message: 'Unable to load postback overview' });
        }
    }

    async getPostbackLogs(req, res) {
        try {
            const result = await postbackService.getPostbackLogs(req.query);
            return setSuccess(res, result);
        } catch (error) {
            logger.error(`postback.controller.js << getPostbackLogs << ${error.message}`);
            return setBadRequest(res, error.message);
        }
    }
}

export default new PostbackController();
