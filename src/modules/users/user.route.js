import express from "express";
import userController from "./user.controller.js";
import { checkPermission } from "../../middleware/auth.middleware.js";

const router = express.Router();

// Create Admin / User
router.post(
    "/v1/user/create-admin",
    checkPermission("CREATE_ADMIN"),
    (req, res) => userController.createAdmin(req, res)
);

// Get All Users (with pagination & search)
router.get(
    "/v1/user/get-all-users",
    checkPermission("GET_ALL_USERS"),
    (req, res) => userController.getAllUsers(req, res)
);

// Search Users
router.get(
    "/v1/admin/user/search",
    checkPermission("GET_ALL_USERS"),
    (req, res) => userController.searchUsers(req, res)
);

// Delete User
router.delete(
    "/v1/admin/users/:userId",
    checkPermission("DELETE_USER"),
    (req, res) => userController.deleteUser(req, res)
);

export default router;
