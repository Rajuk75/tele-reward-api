import dashboardService from './dashboard.service.js';
import { setSuccess, setBadRequest } from '../../core/responseHelper.js';
import logger from '../../core/logger.js';

class DashboardController {
    getDashboardStats = async (req, res) => {
        try {
            const data = await dashboardService.getStats();
            return setSuccess(res, data);
        } catch (error) {
            logger.error(`dashboard.controller.js << getDashboardStats << ${error.message}`);
            return setBadRequest(res, error.message);
        }
    };
}

export default new DashboardController();

