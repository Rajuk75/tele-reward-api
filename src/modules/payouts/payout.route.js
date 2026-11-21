import express from 'express';
import payoutController from './payout.controller.js';
import { protect } from '../../middleware/auth.middleware.js';

const router = express.Router();

// ── Admin Payouts List ──
router.get('/v1/admin/payouts', protect, (req, res) => payoutController.getPayouts(req, res));

export default router;
