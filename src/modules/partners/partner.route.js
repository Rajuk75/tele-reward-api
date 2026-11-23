import express from 'express';
import partnerController from './partner.controller.js';
import { checkPermission } from '../../middleware/auth.middleware.js';

const router = express.Router();

router.get(
    '/v1/admin/get-all-partners',
    checkPermission('GET_ALL_REFERRALS'),
    (req, res) => partnerController.getAllPartners(req, res)
);

router.post(
    '/v1/admin/create-new-partner',
    checkPermission('CREATE_REFERRAL'),
    (req, res) => partnerController.createPartner(req, res)
);

export default router;
