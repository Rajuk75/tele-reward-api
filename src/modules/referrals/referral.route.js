import express from 'express';
import referralController from './referral.controller.js';

const router = express.Router();

router.post('/v1/public/referrals', referralController.createReferral);
router.post('/v1/public/offers/:offerId/referrals', referralController.createReferral);

export default router;

