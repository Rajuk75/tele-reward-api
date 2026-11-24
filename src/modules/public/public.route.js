import express from 'express';
import publicController from './public.controller.js';

const router = express.Router();

// ── Public APIs (No Auth Required) ──
router.get('/v1/public/tracking/status', publicController.getPublicStatus);

export default router;

