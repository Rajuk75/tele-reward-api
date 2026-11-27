import mongoose from 'mongoose';
import spinService from './spin.service.js';
import { setSuccess, setBadRequest } from '../../core/responseHelper.js';
import { getSpinCookieOptions } from '../../core/spinToken.utility.js';
import logger from '../../core/logger.js';

class SpinController {
    spinOffer = async (req, res) => {
        try {
            const offerId = req.params.offerId || req.body?.offerId || req.query?.offerId;
            const referralCode = req.query?.ref || req.body?.referralCode;

            if (!offerId && !referralCode) {
                return setBadRequest(res, 'No task or referral specified');
            }
            if (offerId && !/^[a-zA-Z0-9_-]{4,32}$/.test(offerId)) {
                return setBadRequest(res, 'Invalid Offer ID format');
            }

            const result = await spinService.spinOffer({
                offerId,
                referralCode,
                cookies: req.cookies || {},
            });

            if (result.token && result.cookieName) {
                res.cookie(result.cookieName, result.token, getSpinCookieOptions());
            }

            return setSuccess(res, {
                alreadySpun: result.alreadySpun,
                bonus: result.bonus,
                sliceIndex: result.sliceIndex,
            });
        } catch (error) {
            logger.error(`spin.controller.js << spinOffer << ${error.message}`);
            return setBadRequest(res, error.message);
        }
    };
}

export default new SpinController();
