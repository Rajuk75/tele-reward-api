import express from 'express';
import dashboardController from './dashboard.controller.js';
import { checkPermission } from '../../middleware/auth.middleware.js';

const router = express.Router();

router.get('/v1/admin/dashboard/stats', checkPermission('VIEW_DASHBOARD'), dashboardController.getDashboardStats);

export default router;

