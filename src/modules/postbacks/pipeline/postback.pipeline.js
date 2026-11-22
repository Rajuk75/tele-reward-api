import { validatePostback } from './1.validatePostback.js';
import { resolveEvent } from './2.resolveEvent.js';
import { settlePostback } from './3.settlePostback.js';
import { postbackEvents, POSTBACK_EVENTS } from '../events/postback.events.js';
import postbackRepo from '../postback.repo.js';
import logger from '../../../core/logger.js';

// =============================================================================
// POSTBACK EXECUTION PIPELINE ORCHESTRATOR
// =============================================================================
// Chains Step 1 (Validation) -> Step 2 (Resolution) -> Step 3 (Settlement)
// Handles audit logging on failures/duplicates & emits async side-effect events.
// =============================================================================
export async function executePostbackPipeline({ clickId, secret, ip, query = {} }) {
    logger.info(`postback.pipeline.js << executePostbackPipeline() [STARTED] clickId:${clickId}`);

    // =========================================================================
    // STEP 1: VALIDATE CRITERIA (IP WHITELIST, SECRET KEY, STATUS, SHAVING)
    // =========================================================================
    const { tracking, offer, campaign, isScrubbed } = await validatePostback({ clickId, secret, ip, query });

    try {
        // =====================================================================
        // STEP 2: RESOLVE OFFER EVENT & DUPLICATE CHECK
        // =====================================================================
        const matchedEvent = resolveEvent({ tracking, query });

        // =====================================================================
        // STEP 3: ATOMIC SETTLEMENT (TRACKING + PAYOUTS + REVENUE + AUDIT LOG)
        // =====================================================================
        const result = await settlePostback({
            trackingId: tracking._id,
            matchedEvent,
            query,
            ip,
            isScrubbed
        });

        // =====================================================================
        // STEP 4: ASYNC EVENT BUS EMISSION (TELEGRAM BOT / SMS / WEBHOOKS)
        // =====================================================================
        try {
            postbackEvents.emit(POSTBACK_EVENTS.CONVERSION_SETTLED, result);
        } catch (eventErr) {
            logger.error(`postback.pipeline.js << Event Emission Error: ${eventErr.message}`);
        }

        logger.info(`postback.pipeline.js << [SETTLED] clickId:${clickId} | Event:${result.event} | Status:${result.clickStatus}`);
        return result;

    } catch (error) {
        // =====================================================================
        // STEP 5: AUDIT LOGGING FOR DUPLICATES & PIPELINE ERRORS
        // =====================================================================
        const isDuplicate = error.message?.includes('already completed');
        await postbackRepo.createLog({
            clickId,
            offerId: offer._id,
            ipAddress: ip,
            status: isDuplicate ? 'duplicate' : 'error',
            notes: error.message,
            fullQuery: query
        });
        throw error;
    }
}
