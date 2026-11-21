import express from 'express';
import campaignController from './campaign.controller.js';
import { checkPermission } from '../../middleware/auth.middleware.js';

const router = express.Router();

router.post('/v1/admin/campaigns', checkPermission('CREATE_CAMPAIGN'), campaignController.createCampaign);
router.get('/v1/admin/campaigns', checkPermission('GET_ALL_CAMPAIGNS'), campaignController.getAllCampaigns);
router.get('/v1/admin/campaigns/available', checkPermission('GET_ALL_CAMPAIGNS'), campaignController.getAvailableCampaigns);
router.get('/v1/admin/campaigns/:id', checkPermission('GET_ALL_CAMPAIGNS'), campaignController.getCampaignById);
router.put('/v1/admin/campaigns/:id', checkPermission('UPDATE_CAMPAIGN'), campaignController.updateCampaign);
router.delete('/v1/admin/campaigns/:id', checkPermission('DELETE_CAMPAIGN'), campaignController.deleteCampaign);

export default router;

