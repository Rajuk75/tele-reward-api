import { settlePostback } from './pipeline/3.settlePostback.js';
import { resolveEvent } from './pipeline/2.resolveEvent.js';
import Tracking from '../tracking/tracking.model.js';

/**
 * Backward-compatible wrapper for settlePostback
 */
export default async function recordMilestone(trackingId, query, ip, isScrubbed = false) {
    const tracking = await Tracking.findById(trackingId);
    if (!tracking) throw new Error('Click tracking record not found');

    const matchedEvent = resolveEvent({ tracking, query });

    return settlePostback({
        trackingId,
        matchedEvent,
        query,
        ip,
        isScrubbed: typeof isScrubbed === 'function' ? isScrubbed() : Boolean(isScrubbed)
    });
}
