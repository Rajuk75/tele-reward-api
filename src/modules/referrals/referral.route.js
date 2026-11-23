import express from 'express';
import referralController from './referral.controller.js';
import { checkPermission } from '../../middleware/auth.middleware.js';

const router = express.Router();

// =============================================================================
// ADMIN REFERRAL MANAGEMENT (PROTECTED WITH RBAC PERMISSIONS)
// =============================================================================
router.post(
    '/v1/admin/create-new-referral-link',
    checkPermission('CREATE_REFERRAL'),
    (req, res) => referralController.createReferral(req, res)
);

router.get(
    '/v1/admin/get-all-referrals',
    checkPermission('GET_ALL_REFERRALS'),
    (req, res) => referralController.getReferrals(req, res)
);

router.put(
    '/v1/admin/referral/:id/update',
    checkPermission('UPDATE_REFERRAL'),
    (req, res) => referralController.updateReferral(req, res)
);

router.delete(
    '/v1/admin/referral/:id/delete',
    checkPermission('DELETE_REFERRAL'),
    (req, res) => referralController.deleteReferral(req, res)
);

export default router;

