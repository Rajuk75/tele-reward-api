import logger from './logger.js';
import config from './config.js';
/**
 * urlBuilder.js — Campaign URL Token Replacement
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Affiliate/advertiser tracking URLs contain macro tokens that must be
 * replaced with real values before the user is redirected.
 *
 * Example input:
 *   https://track.affpartner.com/go?cid={click_id}&uid={user_id}&src={source}&p1={p1}&gaid={gaid}
 *
 * Example output:
 *   https://track.affpartner.com/go?cid=b4f9e3d2-...&uid=664abc...&src=google&p1=banner_v2&gaid=xxxxxxxx-...
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * SUPPORTED TOKENS
 * ─────────────────────────────────────────────────────────────────────────────
 *
 *  Core (always available):
 *    {click_id}    → unique click UUID (from Tracking.clickId)
 *    {campaign_id} → Campaign._id (MongoDB ObjectId as string)
 *    {offer_id}    → Offer._id
 *    {user_id}     → User._id
 *    {timestamp}   → Unix timestamp at redirect time (ms)
 *
 *  Device / network (from click request):
 *    {device_id}   → Android/iOS device identifier
 *    {ip}          → User's IP address at click time
 *    {gaid}        → Google Advertising ID  (Android)
 *
 *  Traffic source (from click request):
 *    {source}      → Traffic source label  e.g. "google", "facebook"
 *
 *  Custom params (from click request — passed through from app):
 *    {p1} … {p6}   → Arbitrary key-value slots for any extra data
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * UNKNOWN TOKENS
 * ─────────────────────────────────────────────────────────────────────────────
 *  Any token not in the list above is left as-is in the URL so that the
 *  advertiser's own system can still process it on their side.
 *  Example: {aff_sub} might be a token the advertiser adds for their own use.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * @param {string} templateUrl - Campaign URL string containing {tokens}
 * @param {object} ctx         - Context object with token values
 * @returns {string}           - Final URL with all known tokens replaced
 */
export function buildTrackingUrl(templateUrl, ctx = {}) {
    if (!templateUrl || typeof templateUrl !== 'string') return templateUrl;

    /**
     * Token map: each key is the exact string that appears in the template URL,
     * and the value is a function that returns the replacement string.
     * Functions receive ctx so they can fall back gracefully when a value
     * is missing (empty string instead of "undefined").
     */
    const TOKEN_MAP = {
        // ── Core ──────────────────────────────────────────────────────────────
        '{click_id}':    (c) => c.clickId    || '',
        '{clickId}':     (c) => c.clickId    || '',
        '{clickid}':     (c) => c.clickId    || '',
        '{cid}':         (c) => c.clickId    || '',
        '{campaign_id}': (c) => c.campaignId  ? String(c.campaignId) : '',
        '{campaignId}': (c) => c.campaignId  ? String(c.campaignId) : '',
        '{offer_id}':    (c) => c.offerId     ? String(c.offerId)    : '',
        '{offerId}':    (c) => c.offerId     ? String(c.offerId)    : '',
        '{user_id}':     (c) => c.userId      ? String(c.userId)     : '',
        '{timestamp}':   ()  => String(Date.now()),

        // ── Device / network ──────────────────────────────────────────────────
        '{device_id}':   (c) => c.deviceId   || '',
        '{ip}':          (c) => c.ipAddress  || '',
        '{gaid}':        (c) => c.gaid        || '',

        // ── Traffic source ────────────────────────────────────────────────────
        '{source}':      (c) => c.source      || '',

        // ── Custom pass-through params ────────────────────────────────────────
        '{p1}':          (c) => c.p1 || '',
        '{p2}':          (c) => c.p2 || '',
        '{p3}':          (c) => c.p3 || '',
        '{p4}':          (c) => c.p4 || '',
        '{p5}':          (c) => c.p5 || '',
        '{p6}':          (c) => c.p6 || '',
    };

    let url = templateUrl;

    for (const [token, resolver] of Object.entries(TOKEN_MAP)) {
        // Use replaceAll (or global regex) so a token used multiple times
        // is replaced everywhere, not just at its first occurrence.
        const value = resolver(ctx);
        url = url.split(token).join(encodeURIComponent(value));
    }

    return url;
}

/**
 * extractClickParams
 * ─────────────────────────────────────────────────────────────────────────────
 * Picks only the URL macro params from an Express req.body / req.query object.
 * Call this in the click controller to get a clean params object that can be
 * stored on the Tracking record and replayed at redirect time.
 *
 * @param {object} source - req.body or req.query
 * @returns {object}      - { deviceId, gaid, source, p1 … p6 }
 */
export function extractClickParams(source = {}) {
    logger.info(`🚀 [EXTRACT] Raw source: ${JSON.stringify(source, null, 2)}`);
    return {
        deviceId: source.deviceId || null,
        gaid:     source.gaid     || null,
        source:   source.source   || null,
        p1:       source.p1       || null,
        p2:       source.p2       || null,
        p3:       source.p3       || null,
        p4:       source.p4       || null,
        p5:       source.p5       || null,
        p6:       source.p6       || null,
    };
}

/**
 * buildPostbackUrl
 * Generates the inbound S2S postback URL template for an offer.
 *
 * @param {string} secretKey - Unique postback secret key for the offer
 * @returns {string} - Full postback URL template
 */
export function buildPostbackUrl(secretKey) {
    return `${config.BASE_URL}/postback?cid={clickId}&secret=${secretKey}&event={event}`;
}

/**
 * buildReferralUrl
 * Generates the public task referral share URL without exposing the internal offerId.
 *
 * @param {string} referralCode - Generated referral code
 * @returns {string} - Full referral share URL (/task?ref=xyz)
 */
export function buildReferralUrl(referralCode) {
    const code = typeof referralCode === 'string' ? referralCode : arguments[1];
    return `${config.BASE_URL}/task?ref=${code}`;
}

/**
 * buildOfferTaskUrl
 * Generates the short public task URL using the 6-char offerId (falling back to _id).
 */
export function buildOfferTaskUrl(offer) {
    const code = offer?.offerId || offer?._id;
    return code ? `${config.BASE_URL.replace(/\/+$/, '')}/task/${code}` : null;
}


