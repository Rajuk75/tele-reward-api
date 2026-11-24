import { EventEmitter } from 'events';
import payoutService from '../../payouts/payout.service.js';
import logger from '../../../core/logger.js';

// =============================================================================
// POSTBACK EVENT TYPES
// =============================================================================

export const POSTBACK_EVENTS = {
    CONVERSION_SETTLED: 'postback:conversion_settled'
};

// =============================================================================
// POSTBACK EVENT BUS INSTANCE
// =============================================================================

export const postbackEvents = new EventEmitter();

// =============================================================================
// DEFAULT ERROR BOUNDARY
// =============================================================================

postbackEvents.on('error', (err) => {
    logger.error(`postback.events.js << PostbackEvent Error: ${err.message}`);
});

// =============================================================================
// BACKGROUND AUTO-PAYOUT LISTENER (USER + REFERRER PAYOUTS)
// =============================================================================

postbackEvents.on(POSTBACK_EVENTS.CONVERSION_SETTLED, async (result) => {
    try {
        if (!Array.isArray(result?.payouts) || result.payouts.length === 0) {
            return;
        }

        logger.info(`postback.events.js << [AUTO-PAYOUT LISTENER] Processing ${result.payouts.length} payout(s) in background`);

        for (const payout of result.payouts) {
            try {
                await payoutService.triggerAutoPayoutIfEligible(payout._id);
            } catch (payoutErr) {
                logger.error(`postback.events.js << Auto-payout error for ID:${payout._id}: ${payoutErr.message}`);
            }
        }
    } catch (err) {
        logger.error(`postback.events.js << CONVERSION_SETTLED listener error: ${err.message}`);
    }
});
