import userService from "./user.service.js";
import {
    setSuccess,
    setCreateSuccess,
    setBadRequest,
    setServerError
} from "../../core/responseHelper.js";
import logger from "../../core/logger.js";

class UserController {
    async createAdmin(req, res) {
        try {
            logger.debug("user.controller.js >>> createAdmin() >>> Payload:", { email: req.body?.email, name: req.body?.name });

            const { name, email, password } = req.body || {};
            if (!name || !email || !password) {
                logger.warn("user.controller.js >>> createAdmin() >>> Missing required fields");
                return setBadRequest(res, { message: "name, email and password are required" });
            }

            const admin = await userService.createAdmin(req.body);
            logger.info(`user.controller.js >>> createAdmin() >>> Admin created successfully: ${admin?.email}`);
            return setCreateSuccess(res, {
                message: "Admin created successfully",
                admin
            });
        } catch (error) {
            logger.error(`user.controller.js >>> createAdmin() >>> Error: ${error.message}`);
            return setServerError(res, { message: error.message });
        }
    }

    async getAllUsers(req, res) {
        try {
            logger.debug("user.controller.js >>> getAllUsers() >>> Query filters:", req.query);

            const result = await userService.getAllUsers(req.query);
            logger.info(`user.controller.js >>> getAllUsers() >>> Fetched ${result.users?.length || 0} users (Total: ${result.pagination?.total || 0})`);
            return setSuccess(res, {
                message: "Users fetched successfully",
                ...result
            });
        } catch (error) {
            logger.error(`user.controller.js >>> getAllUsers() >>> Error: ${error.message}`);
            return setServerError(res, { message: error.message });
        }
    }

    async searchUsers(req, res) {
        try {
            const { q } = req.query;
            logger.debug(`user.controller.js >>> searchUsers() >>> Query parameter: ${q}`);

            const users = await userService.searchUsers(q);
            logger.info(`user.controller.js >>> searchUsers() >>> Found ${users?.length || 0} matched users`);
            return setSuccess(res, {
                message: "Users fetched successfully",
                users
            });
        } catch (error) {
            logger.error(`user.controller.js >>> searchUsers() >>> Error: ${error.message}`);
            return setServerError(res, { message: error.message });
        }
    }

    async deleteUser(req, res) {
        try {
            const id = req.params.userId || req.params.id;
            logger.info(`user.controller.js >>> deleteUser() >>> Deleting user: ${id}`);

            if (!id) {
                logger.warn("user.controller.js >>> deleteUser() >>> Missing user ID");
                return setBadRequest(res, { message: "User ID is required" });
            }

            const deleted = await userService.deleteUser(id);
            logger.info(`user.controller.js >>> deleteUser() >>> User deleted successfully: ${id}`);
            return setSuccess(res, {
                message: "User deleted successfully",
                user: deleted
            });
        } catch (error) {
            logger.error(`user.controller.js >>> deleteUser() >>> Error: ${error.message}`);
            return setServerError(res, { message: error.message });
        }
    }
}

export default new UserController();
