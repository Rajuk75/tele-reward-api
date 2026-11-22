import { matchOfferEvent } from '../../tracking/milestones.js';

// =============================================================================
// STEP 2: RESOLVE OFFER EVENT & DUPLICATE VALIDATION
// =============================================================================
// Matches incoming postback query to specific offer milestone event and
// guards against duplicate conversions and closed tracking records.
// =============================================================================
export function resolveEvent({ tracking, query }) {
    // =========================================================================
    // 1. VERIFY CONFIGURED MILESTONE EVENTS
    // =========================================================================
    if (!tracking.milestones || tracking.milestones.length === 0) {
        throw new Error('No events configured for this click tracking');
    }

    // =========================================================================
    // 2. MATCH EVENT USING 5-LEVEL RESOLUTION LOGIC
    // =========================================================================
    const matchedEvent = matchOfferEvent(tracking.milestones, query);

    // =========================================================================
    // 3. DUPLICATE CHECK: ENSURE EVENT IS IN PENDING STATE
    // =========================================================================
    if (matchedEvent.status !== 'pending') {
        throw new Error(`Event [${matchedEvent.eventKey}] already completed`);
    }

    // =========================================================================
    // 4. CLICK STATUS CHECK: MUST BE OPEN (CLICKED OR PARTIALLY_COMPLETED)
    // =========================================================================
    if (!(tracking.status === 'clicked' || tracking.status === 'partially_completed')) {
        throw new Error(`Click is already closed with status: ${tracking.status}`);
    }

    return matchedEvent;
}

// Backward-compatible alias
export const resolveMilestone = resolveEvent;
export const resolveOfferEvent = resolveEvent;
