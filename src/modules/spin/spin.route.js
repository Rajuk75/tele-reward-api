import express from 'express';
import spinController from './spin.controller.js';
import { clickRateLimiter } from '../../middleware/rateLimiter.js';

const router = express.Router();

// ── Public Spin & Win APIs (No Auth Required, Rate Limited) ──
router.post('/v1/public/offers/:offerId/spin', clickRateLimiter, spinController.spinOffer);
router.post('/v1/public/spin', clickRateLimiter, spinController.spinOffer);

export default router;
