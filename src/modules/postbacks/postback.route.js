import express from 'express';
import postbackController from './postback.controller.js';
import { checkPermission } from '../../middleware/auth.middleware.js';

const router = express.Router();

// ── S2S Postback Callbacks (No Auth Required) ──
router.get('/postback', (req, res) => postbackController.handlePostback(req, res));
router.get('/v1/offer/callback/postback', (req, res) => postbackController.handlePostback(req, res));

// ── Admin Logs ──
router.get('/v1/admin/postbacks', checkPermission('GET_POSTBACK_LOGS'), (req, res) => postbackController.getPostbackLogs(req, res));
router.get('/v1/admin/postbacks/overview', checkPermission('GET_POSTBACK_LOGS'), (req, res) => postbackController.getOverview(req, res));
router.get('/v1/admin/postback/logs', checkPermission('GET_POSTBACK_LOGS'), (req, res) => postbackController.getPostbackLogs(req, res));

export default router;

