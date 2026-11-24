import express from 'express';
import offerController from './offer.controller.js';
import { checkPermission } from '../../middleware/auth.middleware.js';

const router = express.Router();

router.post('/v1/admin/offers', checkPermission('CREATE_OFFER'), offerController.createOffer);
router.get('/v1/admin/offers', checkPermission('GET_ALL_OFFERS'), offerController.getAllOffers);
router.get('/v1/admin/offers/:offerId', checkPermission('GET_ALL_OFFERS'), offerController.getOfferById);
router.delete('/v1/admin/offers/:offerId', checkPermission('DELETE_OFFER'), offerController.deleteOffer);
router.put('/v1/admin/offers/:offerId', checkPermission('UPDATE_OFFER'), offerController.updateOffer);
router.patch('/v1/admin/offers/:offerId/status', checkPermission('UPDATE_OFFER'), offerController.updateOfferStatus);

// ── Public Offer & Task APIs (No Auth Required) ──
router.get('/v1/public/task', offerController.getPublicOffer);
router.get('/v1/public/offers/:offerId', offerController.getPublicOffer);

export default router;

