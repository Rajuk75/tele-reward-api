import express from "express";
import authController from "./auth.controller.js";

const router = express.Router();

// Public login routes (Compatible with Adshamper_Panel & API)
router.post(
    "/v1/user/login",
    authController.login
);

router.post(
    "/v1/auth/login",
    authController.login
);

export default router;
