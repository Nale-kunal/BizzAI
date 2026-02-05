/**
 * Idempotency Middleware
 * 
 * Prevents duplicate processing of requests using Redis-based idempotency keys
 * Essential for stateless scaling and ensuring exactly-once semantics
 */

import { createClient } from 'redis';
import crypto from 'crypto';

// Redis client for idempotency
let redisClient;

/**
 * Initialize Redis client
 */
async function initRedis() {
    if (!redisClient) {
        redisClient = createClient({
            url: process.env.REDIS_URL || 'redis://localhost:6379',
            password: process.env.REDIS_PASSWORD
        });

        redisClient.on('error', (err) => console.error('Redis Client Error:', err));
        await redisClient.connect();
    }
    return redisClient;
}

/**
 * Generate idempotency key from request
 */
function generateIdempotencyKey(req) {
    // Use provided key or generate from request
    if (req.headers['idempotency-key']) {
        return req.headers['idempotency-key'];
    }

    // Generate key from method, path, user, and body
    const data = {
        method: req.method,
        path: req.path,
        userId: req.user?._id?.toString(),
        body: req.body
    };

    const hash = crypto
        .createHash('sha256')
        .update(JSON.stringify(data))
        .digest('hex');

    return `idempotency:${hash}`;
}

/**
 * Idempotency middleware
 * 
 * @param {Object} options - Middleware options
 * @param {Number} options.ttl - TTL for idempotency keys in seconds (default: 86400 = 24 hours)
 * @param {Array} options.methods - HTTP methods to apply idempotency (default: ['POST', 'PUT', 'PATCH'])
 */
export function idempotencyMiddleware(options = {}) {
    const {
        ttl = 86400, // 24 hours
        methods = ['POST', 'PUT', 'PATCH']
    } = options;

    return async (req, res, next) => {
        // Skip if method not in list
        if (!methods.includes(req.method)) {
            return next();
        }

        // Skip if explicitly disabled
        if (req.headers['x-skip-idempotency'] === 'true') {
            return next();
        }

        try {
            const client = await initRedis();
            const key = generateIdempotencyKey(req);

            // Check if request already processed
            const cached = await client.get(key);

            if (cached) {
                // Request already processed, return cached response
                const cachedResponse = JSON.parse(cached);

                console.log(`🔄 Idempotent request detected: ${key}`);

                return res
                    .status(cachedResponse.status)
                    .set('X-Idempotency-Hit', 'true')
                    .json(cachedResponse.body);
            }

            // Store original res.json
            const originalJson = res.json.bind(res);

            // Override res.json to cache response
            res.json = function (body) {
                const statusCode = res.statusCode;

                // Only cache successful responses (2xx)
                if (statusCode >= 200 && statusCode < 300) {
                    const responseData = {
                        status: statusCode,
                        body
                    };

                    // Cache response asynchronously (don't block)
                    client
                        .setEx(key, ttl, JSON.stringify(responseData))
                        .catch(err => console.error('Failed to cache idempotency response:', err));

                    console.log(`✅ Cached idempotent response: ${key}`);
                }

                return originalJson(body);
            };

            next();

        } catch (error) {
            console.error('Idempotency middleware error:', error);
            // Continue without idempotency on error
            next();
        }
    };
}

/**
 * Clear idempotency key
 */
export async function clearIdempotencyKey(key) {
    try {
        const client = await initRedis();
        await client.del(key);
        console.log(`🗑️  Cleared idempotency key: ${key}`);
    } catch (error) {
        console.error('Failed to clear idempotency key:', error);
    }
}

/**
 * Graceful shutdown
 */
export async function closeIdempotencyRedis() {
    if (redisClient) {
        await redisClient.quit();
        redisClient = null;
    }
}

export default idempotencyMiddleware;
