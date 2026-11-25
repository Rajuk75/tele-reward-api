import mongoose from 'mongoose';

function positiveInteger(value, fallback, max) {
    const number = Number(value ?? fallback);
    if (!Number.isSafeInteger(number) || number < 1 || number > max) throw new Error('Invalid page or page size');
    return number;
}

export function reportQuery(params = {}) {
    const page = positiveInteger(params.page, 1, 1000000);
    const limit = positiveInteger(params.limit, 15, 100);
    const filter = {};
    for (const key of ['campaignId', 'offerId', 'userId']) {
        if (params[key]) {
            if (!mongoose.isObjectIdOrHexString(params[key])) throw new Error(`Invalid ${key}`);
            filter[key] = new mongoose.Types.ObjectId(params[key]);
        }
    }
    if (params.status) {
        if (typeof params.status !== 'string') throw new Error('Invalid status');
        filter.status = params.status;
    }
    let search;
    if (params.search) {
        if (typeof params.search !== 'string' || params.search.length > 200) throw new Error('Invalid search text');
        search = new RegExp(params.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    }
    const date = {};
    for (const [key, operator] of [['startDate', '$gte'], ['endDate', '$lte']]) {
        if (params[key]) {
            const input = params[key];
            if (typeof input !== 'string') throw new Error('Invalid date filter');
            const timestamp = new Date(input);
            if (!Number.isFinite(timestamp.getTime())) throw new Error('Invalid date filter');
            if (key === 'endDate' && /^\d{4}-\d{2}-\d{2}$/.test(input)) timestamp.setUTCHours(23, 59, 59, 999);
            date[operator] = timestamp;
        }
    }
    if (date.$gte > date.$lte) throw new Error('End date must follow start date');
    return { page, limit, skip: (page - 1) * limit, filter, search, date: Object.keys(date).length ? date : null };
}

export function pagination(page, limit, total) {
    return { page, limit, total, totalPages: Math.ceil(total / limit) };
}
