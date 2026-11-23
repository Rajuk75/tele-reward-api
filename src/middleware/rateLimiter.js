import logger from '../core/logger.js';

/**
 * Token Bucket Rate Limiter
 * 
 * Algorithm:
 * - Each client has a bucket with a maximum `capacity` of tokens.
 * - Tokens are continuously refilled at `refillRate` tokens per second.
 * - Each incoming request consumes 1 token.
 * - If tokens >= 1: request is permitted.
 * - If tokens < 1: request is throttled with HTTP 429 Too Many Requests.
 * - Stale buckets are pruned periodically to prevent memory leaks.
 */
export function createTokenBucketLimiter({
    capacity = 10,
    fillPerMinute = 15,
    refillPerSecond = null,
    message = 'Too many requests. Please slow down and try again shortly.',
    keyGenerator = null,
    cleanupIntervalMs = 5 * 60 * 1000 // 5 minutes
} = {}) {
    const buckets = new Map();
    const rate = refillPerSecond !== null ? refillPerSecond : (fillPerMinute / 60);

    const defaultKeyGen = (req) => {
        const forwarded = req.headers['x-forwarded-for'];
        if (forwarded) {
            return forwarded.split(',')[0].trim();
        }
        return req.socket?.remoteAddress || req.ip || 'global_unknown';
    };

    const getKey = keyGenerator || defaultKeyGen;

    // Periodic cleanup of fully refilled and idle buckets to avoid memory accumulation
    const cleanupTimer = setInterval(() => {
        const now = Date.now();
        const fullRefillDurationMs = (capacity / rate) * 1000;

        for (const [key, bucket] of buckets.entries()) {
            if (now - bucket.lastRefillTime > fullRefillDurationMs && bucket.tokens >= capacity) {
                buckets.delete(key);
            }
        }
    }, cleanupIntervalMs);

    // Ensure timer does not prevent graceful node shutdown
    if (cleanupTimer.unref) {
        cleanupTimer.unref();
    }

    return function tokenBucketMiddleware(req, res, next) {
        const key = getKey(req);
        const now = Date.now();

        let bucket = buckets.get(key);
        if (!bucket) {
            bucket = {
                tokens: capacity,
                lastRefillTime: now
            };
            buckets.set(key, bucket);
        } else {
            // Calculate refilled tokens based on time elapsed
            const elapsedSeconds = (now - bucket.lastRefillTime) / 1000;
            bucket.tokens = Math.min(capacity, bucket.tokens + elapsedSeconds * rate);
            bucket.lastRefillTime = now;
        }

        // Check if sufficient tokens exist
        if (bucket.tokens >= 1) {
            bucket.tokens -= 1;

            res.setHeader('X-RateLimit-Limit', capacity);
            res.setHeader('X-RateLimit-Remaining', Math.floor(bucket.tokens));
            return next();
        }

        // Throttled: calculate seconds until at least 1 token is available
        const retryAfterSeconds = Math.max(1, Math.ceil((1 - bucket.tokens) / rate));
        res.setHeader('Retry-After', retryAfterSeconds);
        res.setHeader('X-RateLimit-Limit', capacity);
        res.setHeader('X-RateLimit-Remaining', 0);

        logger.warn(`rateLimiter << Throttled request from [${key}] on ${req.originalUrl || req.url}. Retry after ${retryAfterSeconds}s`);

        return res.status(429).json({
            status: 'error',
            message,
            retryAfter: retryAfterSeconds
        });
    };
}

// ── Pre-configured Production Limiters ──

/**
 * Click Rate Limiter:
 * - Capacity: 5 tokens burst
 * - Refill: 15 tokens per minute (~1 token every 4 seconds)
 */
export const clickRateLimiter = createTokenBucketLimiter({
    capacity: 5,
    fillPerMinute: 15,
    message: 'Too many click attempts. Please wait a few seconds before continuing.'
});

/**
 * UPI Verification Rate Limiter:
 * - Capacity: 8 tokens burst
 * - Refill: 20 tokens per minute
 */
export const upiVerifyRateLimiter = createTokenBucketLimiter({
    capacity: 8,
    fillPerMinute: 20,
    message: 'Too many verification requests. Please wait a moment.'
});
