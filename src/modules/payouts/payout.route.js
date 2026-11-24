import express from 'express';
import payoutController from './payout.controller.js';
import { checkPermission } from '../../middleware/auth.middleware.js';

const router = express.Router();

router.get(
    '/v1/admin/payouts',
    checkPermission('GET_ALL_PAYOUTS'),
    (req, res) => payoutController.getPayouts(req, res)
);

router.post(
    '/v1/admin/payouts/:id/send',
    checkPermission('SEND_PAYOUT'),
    (req, res) => payoutController.sendPayout(req, res)
);

router.post(
    '/v1/public/payouts/freefokat/webhook',
    (req, res) => payoutController.handleWebhook(req, res)
);

export default router;
