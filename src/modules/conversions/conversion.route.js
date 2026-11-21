import express from 'express';
import conversionController from './conversion.controller.js';
import { checkPermission } from '../../middleware/auth.middleware.js';

const router = express.Router();

router.get('/v1/admin/conversions', checkPermission('GET_CAMPAIGN_CONVERSIONS'), conversionController.getConversions);
router.get('/v1/admin/conversions/revenue', checkPermission('GET_CAMPAIGN_CONVERSIONS'), conversionController.getRevenueStats);
router.patch('/v1/admin/conversions/:id/approve', checkPermission('UPDATE_CONVERSION_STATUS'), conversionController.approveConversion);
router.patch('/v1/admin/conversions/:id/reject', checkPermission('UPDATE_CONVERSION_STATUS'), conversionController.rejectConversion);
router.patch('/v1/admin/conversions/:id/status', checkPermission('UPDATE_CONVERSION_STATUS'), conversionController.updateStatus);
router.get('/v1/admin/conversions/:id', checkPermission('GET_CAMPAIGN_CONVERSIONS'), conversionController.getConversionById);

export default router;

