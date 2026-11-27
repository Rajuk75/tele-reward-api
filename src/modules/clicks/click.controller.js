import clickService from './click.service.js';
import { setSuccess, setBadRequest } from '../../core/responseHelper.js';
import logger from '../../core/logger.js';

class ClickController {
    async listClicks(req, res) {
        try { return setSuccess(res, await clickService.listClicks(req.query)); }
        catch (error) { return setBadRequest(res, error.message); }
    }

    async getClickById(req, res) {
        try { return setSuccess(res, await clickService.getClickById(req.params.clickId)); }
        catch (error) { return setBadRequest(res, error.message); }
    }

    async createClick(req, res) {
        try {
            const offerId = req.params?.offerId || req.body?.offerId;
            const referralCode = req.body?.referralCode || req.body?.referral_code || req.query?.ref;

            // 1. Task Link Validation
            if (!offerId && !referralCode) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Invalid task link'
                });
            }

            // 2. Payout Account Validation (UPI / Bank)
            const payoutAccount = (req.body?.payoutAccount || '').trim();
            if (!payoutAccount) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Please enter your Bank Account Number or UPI ID to receive reward'
                });
            }

            const payoutType = (req.body?.payoutType || 'UPI').toUpperCase();
            if (payoutType === 'BANK' && !/^[0-9]{9,18}$/.test(payoutAccount)) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Bank Account Number must be between 9 and 18 digits'
                });
            }

            const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress;
            const userAgent = req.headers['user-agent'] || '';

            logger.debug(`click.controller.js << createClick << incoming:`, { offerId, referralCode, payoutAccount });

            const result = await clickService.generateClick(offerId, {
                ...req.body,
                payoutAccount,
                payoutType,
                referralCode
            }, { ip, userAgent, cookies: req.cookies || {} });

            return setSuccess(res, result);
        } catch (error) {
            logger.error(`click.controller.js << createClick << ${error.message}`);
            return res.status(400).json({
                status: 'error',
                message: error.message || 'Invalid task link'
            });
        }
    }
}

export default new ClickController();
