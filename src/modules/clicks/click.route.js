import express from 'express';
import clickController from './click.controller.js';
import { clickRateLimiter } from '../../middleware/rateLimiter.js';

import { checkPermission } from '../../middleware/auth.middleware.js';

const router = express.Router();
router.get('/v1/admin/clicks', checkPermission('GET_TRACKING_CLICKS'), clickController.listClicks);


// ── Public Click Generation (Protected by Token Bucket Rate Limiter) ──
router.post('/v1/public/offers/:offerId/click', clickRateLimiter, (req, res) => clickController.createClick(req, res));
router.post('/v1/public/clicks', clickRateLimiter, (req, res) => clickController.createClick(req, res));

export default router;
