/**
 * Task API Client
 * Handles URL parsing, intelligent traffic source detection, and backend HTTP calls.
 */
const TaskAPI = {
    /**
     * Extracts Offer ID from the URL path (/task/:offerId) or query string (?offerId=)
     */
    extractOfferIdFromUrl() {
        const pathSegments = window.location.pathname.split('/').filter(Boolean);
        if (pathSegments[0] === 'task' && pathSegments[1]) {
            return pathSegments[1];
        }
        const queryParams = new URLSearchParams(window.location.search);
        const queryOfferId = queryParams.get('offerId');
        if (queryOfferId) return queryOfferId;

        if (pathSegments[pathSegments.length - 1] === 'task') return null;

        return pathSegments[pathSegments.length - 1] || null;
    },

    /**
     * Automatically detects where the user came from:
     * - URL parameter (?source= / ?utm_source=)
     * - Telegram Mini App runtime
     * - In-App Browser User-Agent (WhatsApp, Telegram, Instagram, Facebook, YouTube)
     * - Standard Mobile or Desktop Browser
     */
    detectTrafficSource() {
        const queryParams = new URLSearchParams(window.location.search);
        const customSource = queryParams.get('source') || queryParams.get('utm_source') || queryParams.get('src');
        if (customSource && customSource.trim()) {
            return customSource.trim().toLowerCase();
        }

        // Native Telegram Mini App
        if (window.Telegram?.WebApp?.initData) {
            return 'telegram_miniapp';
        }

        const userAgent = (navigator.userAgent || '').toLowerCase();
        const referrer = (document.referrer || '').toLowerCase();

        // In-App Webviews
        if (userAgent.includes('whatsapp') || referrer.includes('whatsapp.com')) {
            return 'whatsapp';
        }
        if (userAgent.includes('telegram') || referrer.includes('t.me') || referrer.includes('telegram.org')) {
            return 'telegram';
        }
        if (userAgent.includes('instagram') || referrer.includes('instagram.com')) {
            return 'instagram';
        }
        if (userAgent.includes('fban') || userAgent.includes('fbav') || referrer.includes('facebook.com')) {
            return 'facebook';
        }
        if (referrer.includes('youtube.com') || referrer.includes('youtu.be')) {
            return 'youtube';
        }

        // Standard Browser (Mobile vs Desktop)
        const isMobileDevice = /android|iphone|ipad|ipod|mobile/i.test(userAgent);
        return isMobileDevice ? 'mobile_browser' : 'desktop_browser';
    },

    /**
     * Fetch public offer details from backend
     * Supports both direct /v1/public/offers/:offerId and referral /v1/public/task?ref=:refCode
     */
    async fetchPublicOfferDetails(offerId) {
        const ref = new URLSearchParams(window.location.search).get('ref');
        if (!offerId && !ref) {
            throw new Error('No task specified. Please open a valid offer link.');
        }

        const endpoint = offerId
            ? `/v1/public/offers/${offerId}${ref ? '?ref=' + encodeURIComponent(ref) : ''}`
            : `/v1/public/task?ref=${encodeURIComponent(ref)}`;

        const response = await fetch(endpoint);
        const responseJson = await response.json();

        if (!response.ok || !responseJson.data) {
            throw new Error(responseJson.data || responseJson.message || 'Unable to load offer details');
        }

        return responseJson.data;
    },

    /**
     * Generate Click & Destination Tracking URL
     * POST /v1/public/offers/:offerId/click
     */
    async generateTaskClick(offerId, payoutPayload) {
        if (!offerId) {
            throw new Error('Missing task identifier. Please refresh the page.');
        }

        const ref = new URLSearchParams(window.location.search).get('ref');
        const response = await fetch(`/v1/public/offers/${offerId}/click`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ...payoutPayload,
                referralCode: ref || undefined
            })
        });

        const responseJson = await response.json();
        if (!response.ok) {
            throw new Error(responseJson.data || responseJson.message || 'Failed to start task');
        }

        return responseJson.data;
    },

    /**
     * Verify Bank IFSC Code
     * GET /v1/public/verify-ifsc?ifscCode=...
     */
    async verifyIfscCode(ifscCode) {
        if (!ifscCode) {
            throw new Error('IFSC code is required');
        }

        const response = await fetch(`/v1/public/verify-ifsc?ifscCode=${encodeURIComponent(ifscCode.trim())}`);
        const responseJson = await response.json();

        if (!response.ok || !responseJson.data) {
            const errorMsg = responseJson.data?.message || responseJson.message || 'Invalid IFSC Code';
            throw new Error(errorMsg);
        }

        return responseJson.data.data;
    },

    /**
     * Verify UPI ID & App/Bank Lookup
     * GET /v1/public/verify-upi?vpa=...
     */
    async verifyUpiId(vpa) {
        if (!vpa) {
            throw new Error('UPI ID is required');
        }

        const response = await fetch(`/v1/public/verify-upi?vpa=${encodeURIComponent(vpa.trim())}`);
        const responseJson = await response.json();

        if (!response.ok || !responseJson.data) {
            const errorMsg = responseJson.data?.message || responseJson.message || 'Invalid UPI ID';
            throw new Error(errorMsg);
        }

        return responseJson.data.data;
    }
};

window.TaskAPI = TaskAPI;
