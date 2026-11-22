import express from 'express';
import clickController from './click.controller.js';

const router = express.Router();

// ── Public Click Generation (No Auth Required) ──
router.post('/v1/public/offers/:offerId/click', (req, res) => clickController.createClick(req, res));
router.post('/v1/public/clicks', (req, res) => clickController.createClick(req, res));

export default router;
