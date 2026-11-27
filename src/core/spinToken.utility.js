import crypto from 'crypto';
import config from './config.js';

const SPIN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function getSecret() {
    return config.JWT_SECRET || 'adshamper_spin_fallback_secret';
}

export function getSpinCookieName(offerId) {
    return `spin_${String(offerId)}`;
}

export function getSpinCookieOptions() {
    return {
        httpOnly: true,
        sameSite: 'lax',
        secure: config.STAGE === 'production',
        maxAge: SPIN_TTL_MS,
        path: '/',
    };
}

function signPayload(encodedPayload) {
    return crypto
        .createHmac('sha256', getSecret())
        .update(encodedPayload)
        .digest('base64url');
}

export function signSpinToken({ offerId, bonus, sliceIndex }) {
    const payload = {
        offerId: String(offerId),
        bonus: Number(bonus) || 0,
        sliceIndex: Number(sliceIndex) || 0,
        exp: Date.now() + SPIN_TTL_MS,
    };
    const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
    const signature = signPayload(encoded);
    return `${encoded}.${signature}`;
}

export function verifySpinToken(token, expectedOfferId) {
    if (!token || typeof token !== 'string' || !token.includes('.')) return null;

    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const [encoded, providedSig] = parts;

    const expectedSig = signPayload(encoded);
    const sigBufA = Buffer.from(providedSig, 'utf8');
    const sigBufB = Buffer.from(expectedSig, 'utf8');
    if (sigBufA.length !== sigBufB.length || !crypto.timingSafeEqual(sigBufA, sigBufB)) {
        return null;
    }

    try {
        const parsed = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
        if (!parsed || String(parsed.offerId) !== String(expectedOfferId)) return null;
        if (!parsed.exp || Date.now() > parsed.exp) return null;
        return {
            bonus: Number(parsed.bonus) || 0,
            sliceIndex: Number(parsed.sliceIndex) || 0,
        };
    } catch {
        return null;
    }
}

/**
 * Server-side weighted slice selection:
 * - 75% Chance: Lowest bonus amount
 * - 20% Chance: 2nd lowest bonus amount
 * - 5% Chance: Higher bonus amount
 */
export function pickWeightedSlice(slices = []) {
    const valid = slices.map((val, idx) => ({ value: Number(val), originalIdx: idx }));
    if (valid.length === 0) return { bonus: 0, sliceIndex: 0 };
    if (valid.length === 1) return { bonus: valid[0].value, sliceIndex: 0 };

    const sorted = [...valid].sort((a, b) => a.value - b.value);
    const minAmount = sorted[0].value;
    const lowestSlices = sorted.filter((s) => s.value === minAmount);
    const otherSlices = sorted.filter((s) => s.value > minAmount);

    const roll = crypto.randomInt(0, 100);

    if (roll < 75 || otherSlices.length === 0) {
        const chosen = lowestSlices[crypto.randomInt(0, lowestSlices.length)];
        return { bonus: chosen.value, sliceIndex: chosen.originalIdx };
    }

    if (roll < 95) {
        return { bonus: otherSlices[0].value, sliceIndex: otherSlices[0].originalIdx };
    }

    const highSlices = otherSlices.slice(1);
    const chosen = highSlices.length
        ? highSlices[crypto.randomInt(0, highSlices.length)]
        : otherSlices[0];
    return { bonus: chosen.value, sliceIndex: chosen.originalIdx };
}
