import Tracking from '../tracking/tracking.model.js';

class ConversionRepository {
    async list({ filter, date, search, skip, limit }) {
        const evidence = [
            { 'completedEvents.0': { $exists: true } }, { conversionDate: { $type: 'date' } },
            { postbackReceived: true }, { milestones: { $elemMatch: { status: { $in: ['completed', 'scrubbed'] } } } },
            { status: { $in: ['completed', 'partially_completed', 'pending_approval', 'scrubbed'] } },
        ];
        const match = { ...filter, $or: evidence };
        if (search) match.$and = [{ $or: [{ clickId: search }, { payoutAccount: search }, { 'completedEvents.eventName': search }, { 'milestones.eventKey': search }] }];
        const [result] = await Tracking.aggregate([
            { $match: match },
            { $set: { reportedAt: { $ifNull: [
                { $max: ['$conversionDate', { $max: '$completedEvents.completedAt' }, { $max: '$milestones.completedAt' }] },
                '$updatedAt',
            ] } } },
            ...(date ? [{ $match: { reportedAt: date } }] : []),
            { $facet: { count: [{ $count: 'total' }], rows: [{ $sort: { reportedAt: -1, _id: -1 } }, { $skip: skip }, { $limit: limit }] } },
        ]);
        const rows = await Tracking.populate(result.rows, [
            { path: 'offerId', select: 'offerName category' }, { path: 'campaignId', select: 'name category' },
            { path: 'userId', select: 'name email phone' },
        ]);
        return { rows, total: result.count[0]?.total || 0 };
    }
}

export default new ConversionRepository();
