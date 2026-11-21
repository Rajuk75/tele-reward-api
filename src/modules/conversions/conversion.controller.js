import conversionService from './conversion.service.js';
import { setSuccess, setBadRequest } from '../../core/responseHelper.js';
import logger from '../../core/logger.js';

class ConversionController {
    getConversions = async (req, res) => {
        try {
            const result = await conversionService.getConversions(req.query);
            return setSuccess(res, result);
        } catch (error) {
            logger.error(`conversion.controller.js << getConversions << ${error.message}`);
            return setBadRequest(res, error.message);
        }
    };

    getRevenueStats = async (req, res) => {
        try {
            const result = await conversionService.getRevenueStats();
            return setSuccess(res, result);
        } catch (error) {
            logger.error(`conversion.controller.js << getRevenueStats << ${error.message}`);
            return setBadRequest(res, error.message);
        }
    };

    approveConversion = async (req, res) => {
        try {
            const { adminNote } = req.body;
            const result = await conversionService.updateStatus(req.params.id, 'completed', adminNote);
            return setSuccess(res, result);
        } catch (error) {
            logger.error(`conversion.controller.js << approveConversion << ${error.message}`);
            return setBadRequest(res, error.message);
        }
    };

    rejectConversion = async (req, res) => {
        try {
            const { adminNote } = req.body;
            const result = await conversionService.updateStatus(req.params.id, 'rejected', adminNote);
            return setSuccess(res, result);
        } catch (error) {
            logger.error(`conversion.controller.js << rejectConversion << ${error.message}`);
            return setBadRequest(res, error.message);
        }
    };

    getConversionById = async (req, res) => {
        try {
            const result = await conversionService.getConversionById(req.params.id);
            return setSuccess(res, result);
        } catch (error) {
            logger.error(`conversion.controller.js << getConversionById << ${error.message}`);
            return setBadRequest(res, error.message);
        }
    };

    updateStatus = async (req, res) => {
        try {
            const { status, adminNote } = req.body;
            const result = await conversionService.updateStatus(req.params.id, status, adminNote);
            return setSuccess(res, result);
        } catch (error) {
            logger.error(`conversion.controller.js << updateStatus << ${error.message}`);
            return setBadRequest(res, error.message);
        }
    };
}

export default new ConversionController();

