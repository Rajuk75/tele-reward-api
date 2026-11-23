import express from 'express';
import paymentMethodController from './paymentMethod.controller.js';
import { upiVerifyRateLimiter } from '../../middleware/rateLimiter.js';

const router = express.Router();

// ── Utility Route: Verify IFSC Code & Bank Lookup ──
router.get('/v1/payment-methods/verify-ifsc', paymentMethodController.verifyIfsc);
router.get('/v1/public/verify-ifsc', paymentMethodController.verifyIfsc);

// ── Utility Route: Verify UPI ID & App/Bank Lookup ──
router.get('/v1/payment-methods/verify-upi', upiVerifyRateLimiter, paymentMethodController.verifyUpi);
router.get('/v1/public/verify-upi', upiVerifyRateLimiter, paymentMethodController.verifyUpi);

export default router;
