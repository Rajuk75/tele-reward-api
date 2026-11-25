import { executePostbackPipeline } from './pipeline/postback.pipeline.js';
import postbackRepo from './postback.repo.js';
import { reportQuery } from '../../core/reportQuery.js';
import logger from '../../core/logger.js';

class PostbackService {
    async getOverview() {
        const end = new Date();
        end.setUTCHours(24, 0, 0, 0);
        const dayMs = 86400000;
        const start = new Date(end.getTime() - 7 * dayMs);
        const days = Array.from({ length: 7 }, (_, i) => ({
            day: new Date(start.getTime() + i * dayMs).toISOString().slice(0, 10), count: 0,
        }));
        const statuses = new Map();
        for (const { _id, count } of await postbackRepo.overview(start, end)) {
            const status = _id.status || 'unknown';
            statuses.set(status, (statuses.get(status) || 0) + count);
            days.find(item => item.day === _id.day).count += count;
        }
        return { days, statuses: Object.fromEntries(statuses) };
    }

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
        const { filter, search: pattern, date, skip } = reportQuery({ page, limit, status, search: clickId || search, startDate, endDate });
        if (pattern) filter.clickId = pattern;
        if (date) filter.createdAt = date;
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
