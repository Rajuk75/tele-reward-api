import campaignService from './campaign.service.js';
import { setSuccess, setBadRequest, setCreateSuccess } from '../../core/responseHelper.js';
import logger from '../../core/logger.js';

class CampaignController {
    createCampaign = async (req, res) => {
        try {
            const result = await campaignService.createCampaign(req.body);
            return setCreateSuccess(res, result);
        } catch (error) {
            logger.error(`campaign.controller.js << createCampaign << ${error.message}`);
            return setBadRequest(res, error.message);
        }
    };

    getAllCampaigns = async (req, res) => {
        try {
            const result = await campaignService.getAllCampaigns(req.query);
            return setSuccess(res, result);
        } catch (error) {
            logger.error(`campaign.controller.js << getAllCampaigns << ${error.message}`);
            return setBadRequest(res, error.message);
        }
    };

    getAvailableCampaigns = async (req, res) => {
        try {
            const campaigns = await campaignService.getAvailableCampaigns();
            return setSuccess(res, { campaigns });
        } catch (error) {
            logger.error(`campaign.controller.js << getAvailableCampaigns << ${error.message}`);
            return setBadRequest(res, error.message);
        }
    };

    getCampaignById = async (req, res) => {
        try {
            const result = await campaignService.getCampaignById(req.params.id);
            return setSuccess(res, result);
        } catch (error) {
            logger.error(`campaign.controller.js << getCampaignById << ${error.message}`);
            return setBadRequest(res, error.message);
        }
    };

    updateCampaign = async (req, res) => {
        try {
            const result = await campaignService.updateCampaign(req.params.id, req.body);
            return setSuccess(res, result);
        } catch (error) {
            logger.error(`campaign.controller.js << updateCampaign << ${error.message}`);
            return setBadRequest(res, error.message);
        }
    };

    deleteCampaign = async (req, res) => {
        try {
            const result = await campaignService.deleteCampaign(req.params.id);
            return setSuccess(res, result);
        } catch (error) {
            logger.error(`campaign.controller.js << deleteCampaign << ${error.message}`);
            return setBadRequest(res, error.message);
        }
    };
}

export default new CampaignController();

