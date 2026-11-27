import mongoose from 'mongoose';
import offerService from './offer.service.js';
import { setSuccess, setBadRequest, setCreateSuccess } from '../../core/responseHelper.js';
import logger from '../../core/logger.js';

class OfferController {
    createOffer = async (req, res) => {
        try {
            const result = await offerService.createOffer(req.body);
            return setCreateSuccess(res, result);
        } catch (error) {
            logger.error(`offer.controller.js << createOffer << ${error.message}`);
            return setBadRequest(res, error.message);
        }
    };

    getAllOffers = async (req, res) => {
        try {
            const result = await offerService.getAllOffers(req.query);
            return setSuccess(res, result);
        } catch (error) {
            logger.error(`offer.controller.js << getAllOffers << ${error.message}`);
            return setBadRequest(res, error.message);
        }
    };

    getOfferById = async (req, res) => {
        try {
            const offerId = req.params.offerId || req.params.id;
            const result = await offerService.getOfferById(offerId);
            return setSuccess(res, result);
        } catch (error) {
            logger.error(`offer.controller.js << getOfferById << ${error.message}`);
            return setBadRequest(res, error.message);
        }
    };

    deleteOffer = async (req, res) => {
        try {
            const result = await offerService.deleteOffer(req.params.offerId || req.params.id);
            return setSuccess(res, result);
        } catch (error) {
            logger.error(`offer.controller.js << deleteOffer << ${error.message}`);
            return setBadRequest(res, error.message);
        }
    };

    updateOfferStatus = async (req, res) => {
        try {
            const result = await offerService.updateOfferStatus(req.params.offerId || req.params.id, req.body.status);
            return setSuccess(res, result);
        } catch (error) {
            logger.error(`offer.controller.js << updateOfferStatus << ${error.message}`);
            return setBadRequest(res, error.message);
        }
    };

    updateOffer = async (req, res) => {
        try {
            const offerId = req.params.offerId || req.params.id;
            const result = await offerService.updateOffer(offerId, req.body);
            return setSuccess(res, result);
        } catch (error) {
            logger.error(`offer.controller.js << updateOffer << ${error.message}`);
            return setBadRequest(res, error.message);
        }
    };

    getPublicOffer = async (req, res) => {
        try {
            const offerId = req.params.offerId || req.query.offerId;
            const referralCode = req.query.ref;
            if (!offerId && !referralCode) {
                return setBadRequest(res, {message:'No task or referral specified'});
            }
            if (offerId && !/^[a-zA-Z0-9_-]{4,32}$/.test(offerId)) {
                return setBadRequest(res, 'Invalid Offer ID format');
            }
            const data = await offerService.getPublicOffer({
                offerId,
                referralCode,
                cookies: req.cookies || {}
            });
            return setSuccess(res, data);
        } catch (error) {
            logger.error(`offer.controller.js << getPublicOffer << ${error.message}`);
            return setBadRequest(res, error.message);
        }
    };
}

export default new OfferController();

