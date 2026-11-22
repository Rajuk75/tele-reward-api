import postbackRepo from '../postback.repo.js';
import logger from '../../../core/logger.js';

// =============================================================================
// STEP 1: VALIDATE INCOMING POSTBACK CRITERIA
// =============================================================================
// Validates click presence, active status of offer & campaign, secret key,
// IP whitelist security, and determines shaving/scrubbing eligibility.
// =============================================================================
export async function validatePostback({ clickId, secret, ip, query = {} }) {
    // =========================================================================
    // 1. VALIDATE CLICK ID PRESENCE
    // =========================================================================
    if (!clickId || !String(clickId).trim()) {
        await postbackRepo.createLog({
            clickId: 'none',
            fullQuery: query,
            ipAddress: ip,
            status: 'click_not_found',
            notes: 'Missing clickId parameter'
        });
        throw new Error('Missing clickId parameter');
    }

    // =========================================================================
    // 2. FETCH TRACKING RECORD WITH POPULATED OFFER & CAMPAIGN
    // =========================================================================
    const tracking = await postbackRepo.findTrackingWithOffer(clickId);
    if (!tracking) {
        await postbackRepo.createLog({
            clickId,
            fullQuery: query,
            ipAddress: ip,
            status: 'click_not_found',
            notes: 'Click not found'
        });
        throw new Error('Click not found');
    }

    const offer = tracking.offerId;
    const campaign = offer?.campaignId;

    // =========================================================================
    // 3. CHECK OFFER & CAMPAIGN ACTIVE STATUS
    // =========================================================================
    if (!offer || offer.isDeleted || offer.status !== 'active' || !offer.isActive ||
        !campaign || campaign.isDeleted || campaign.status !== 'active') {
        await postbackRepo.createLog({
            clickId,
            offerId: offer?._id || null,
            fullQuery: query,
            ipAddress: ip,
            status: 'inactive_offer',
            notes: 'Offer or Campaign is inactive, paused or deleted'
        });
        throw new Error('Offer or Campaign is inactive');
    }

    // =========================================================================
    // 4. VERIFY POSTBACK SECRET KEY (IF CONFIGURED)
    // =========================================================================
    if (offer.postbackSecretKey && secret !== offer.postbackSecretKey) {
        await postbackRepo.createLog({
            clickId,
            offerId: offer._id,
            fullQuery: query,
            ipAddress: ip,
            status: 'invalid_secret',
            notes: 'Secret mismatch'
        });
        throw new Error('Invalid secret key');
    }

    // =========================================================================
    // 5. ENFORCE IP WHITELIST POLICY (IF ENABLED)
    // =========================================================================
    if (campaign.ipWhitelistEnabled) {
        const whitelist = Array.isArray(campaign.ipWhitelist) ? campaign.ipWhitelist : [];
        if (whitelist.length > 0) {
            const cleanIp = (ip || '').trim();
            const isAllowed = whitelist.some(allowed => allowed.trim() === cleanIp);
            if (!isAllowed) {
                await postbackRepo.createLog({
                    clickId,
                    offerId: offer._id,
                    fullQuery: query,
                    ipAddress: ip,
                    status: 'ip_not_whitelisted',
                    notes: `IP ${ip} not in campaign whitelist`
                });
                throw new Error('IP not whitelisted');
            }
        }
    }

    // =========================================================================
    // 6. EVALUATE CAMPAIGN SHAVING / SCRUBBING RATIO
    // =========================================================================
    const ratio = campaign.shaving?.enabled ? (campaign.shaving.ratio || 0) : 0;
    const isScrubbed = ratio > 0 && (Math.random() * 100 < ratio);
    if (isScrubbed) {
        logger.info(`validatePostback.js << [SHAVE SCRUBBED] clickId:${clickId} (Ratio: ${ratio}%)`);
    }

    return { tracking, offer, campaign, isScrubbed };
}
