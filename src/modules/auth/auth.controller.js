import authService from "./auth.service.js";
import { setSuccess, setBadRequest, setNotAuthorized, setForbidden } from "../../core/responseHelper.js";
import logger from "../../core/logger.js";

class AuthController {
    login = async (req, res) => {
        try {
            const userData = req.body.user || req.body;
            const result = await authService.login(userData);
            return setSuccess(res, result);
        } catch (error) {
            logger.error(`auth.controller.js << login() << ${error.message}`);
            if (error.statusCode === 401) {
                return setNotAuthorized(res, error.message);
            }
            if (error.statusCode === 403) {
                return setForbidden(res, error.message);
            }
            return setBadRequest(res, error.message);
        }
    };
}

export default new AuthController();
