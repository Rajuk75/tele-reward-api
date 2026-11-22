import { executePostbackPipeline } from './pipeline/postback.pipeline.js';
import postbackRepo from './postback.repo.js';
import logger from '../../core/logger.js';

class PostbackService {

    /**
     * Executes the clean modular postback pipeline
     */
    async handlePostback(clickId, secret, ip, fullQuery = {}) {
        return executePostbackPipeline({
            clickId,
            secret,
            ip,
            query: fullQuery
        });
    }

    /**
     * Admin Postback Logs API
     */
    async getPostbackLogs({ page = 1, limit = 20, status = '', search = '', clickId = '', startDate = '', endDate = '' } = {}) {
        logger.info(`postback.service.js << getPostbackLogs() >>>>>> [FETCH LOGS] page:${page} limit:${limit}`);
        const filter = {};
        if (status) filter.status = status;
        const searchKey = clickId || search;
        if (searchKey) filter.clickId = { $regex: searchKey, $options: 'i' };

        if (startDate || endDate) {
            filter.createdAt = {};
            if (startDate) filter.createdAt.$gte = new Date(startDate);
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                filter.createdAt.$lte = end;
            }
        }

        const skip = (Number(page) - 1) * Number(limit);
        const [logs, total] = await Promise.all([
            postbackRepo.findLogs(filter, { skip, limit: Number(limit) }),
            postbackRepo.countLogs(filter)
        ]);

        return {
            logs,
            pagination: {
                total,
                page: Number(page),
                limit: Number(limit),
                totalPages: Math.ceil(total / Number(limit))
            }
        };
    }
}

export default new PostbackService();
