import express from 'express';
import paymentMethodController from './paymentMethod.controller.js';

const router = express.Router();

// ── Utility Route: Verify IFSC Code & Bank Lookup ──
router.get('/v1/payment-methods/verify-ifsc', paymentMethodController.verifyIfsc);
router.get('/v1/public/verify-ifsc', paymentMethodController.verifyIfsc);

export default router;
