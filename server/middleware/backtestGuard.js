/**
 * BACKTEST GUARD MIDDLEWARE (backtestGuard.js)
 * 
 * Implements two production-grade system design capabilities:
 * 1. Redis-backed sliding-window Rate Limiter (60 requests per minute per IP)
 *    using an atomic Lua script to prevent the "Rate Limiter Lockout" vulnerability.
 * 2. Redis-backed request Deduplication lock (SHA-256 parameter hashing)
 *    scoped per user (via userId) to avoid redundant concurrent simulation runs.
 * 
 * Safe Fallbacks:
 * If Redis is disconnected/offline, all checks are gracefully bypassed,
 * ensuring zero disruption to the core business logic.
 */

import crypto from 'crypto';
import { getRedisClient } from '../services/marketDataService.js';

// Lua script to atomically run sliding window rate limiter check
const LUA_SLIDING_WINDOW = `
  local key = KEYS[1]
  local now = tonumber(ARGV[1])
  local window = tonumber(ARGV[2])
  local limit = tonumber(ARGV[3])
  local member = ARGV[4]

  -- Clean up expired requests
  redis.call('zremrangebyscore', key, 0, now - window)
  
  -- Count active requests in window
  local current_requests = redis.call('zcard', key)

  if current_requests < limit then
    -- Allowed: Add to ZSET and refresh expiration (TTL window + 5s buffer)
    redis.call('zadd', key, now, member)
    redis.call('expire', key, math.ceil(window / 1000) + 5)
    return 1
  else
    -- Blocked: Do not add to ZSET (prevents rate limiter lockout)
    return 0
  end
`;

/**
 * rateLimiter - Redis sliding-window rate limiting middleware.
 * Limits to 60 requests per minute per IP address.
 */
export async function rateLimiter(req, res, next) {
  const redisClient = getRedisClient();

  // Graceful fallback if Redis is down
  if (!redisClient) {
    return next();
  }

  try {
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const rateKey = `ratelimit:${ip}`;
    const now = Date.now();
    const windowMs = 60000; // 1 minute window
    const limit = 60; // 60 requests limit
    const member = `${now}-${crypto.randomUUID()}`;

    // Execute atomic Lua script
    const allowed = await redisClient.eval(LUA_SLIDING_WINDOW, {
      keys: [rateKey],
      arguments: [now.toString(), windowMs.toString(), limit.toString(), member]
    });

    if (allowed === 0) {
      console.warn(`[RateLimit] Exceeded for IP: ${ip}`);
      return res.status(429).json({
        error: 'Too Many Requests',
        message: 'You have exceeded the rate limit of 60 requests per minute. Please try again later.'
      });
    }

    next();
  } catch (err) {
    console.error('[RateLimit] Error executing check, bypassing rate limit:', err.message);
    next(); // Fallback to proceed if rate limit command execution fails
  }
}

/**
 * deduplicator - Redis-backed lock middleware to prevent duplicate simulation requests.
 * Hashes incoming backtest parameters (scoped per user) and locks execution for 120 seconds maximum.
 */
export async function deduplicator(req, res, next) {
  const redisClient = getRedisClient();

  // Graceful fallback if Redis is down
  if (!redisClient) {
    return next();
  }

  try {
    const { code, stocks, startDate, endDate, initialCapital } = req.body;
    const userId = req.user?.userId || 'anonymous';

    // Build unique identifier payload from backtest parameters, scoped per user
    const payload = JSON.stringify({
      userId,
      code: code || '',
      stocks: Array.isArray(stocks) ? [...stocks].sort() : [],
      startDate: startDate || '',
      endDate: endDate || '',
      initialCapital: initialCapital || 0
    });

    // Create unique SHA-256 hash of the parameters
    const paramHash = crypto.createHash('sha256').update(payload).digest('hex');
    const lockKey = `lock:backtest:${paramHash}`;

    // Attempt to acquire lock: Set key if not exists (NX) with a safe short expiration of 30 seconds (EX)
    const lockAcquired = await redisClient.set(lockKey, 'processing', {
      NX: true,
      EX: 30
    });

    if (!lockAcquired) {
      console.log(`[Deduplication] Prevented duplicate request for hash: ${paramHash}`);
      return res.status(409).json({
        error: 'Conflict',
        message: 'A duplicate backtest request with the exact same parameters is already in progress. Please wait for it to complete.'
      });
    }

    console.log(`[Deduplication] Acquired lock: ${lockKey}`);

    // Start heartbeat to renew lock TTL every 10 seconds while processing is active
    const heartbeatInterval = setInterval(async () => {
      try {
        const client = getRedisClient();
        if (client) {
          await client.expire(lockKey, 30);
          console.log(`[Deduplication] Extended lock TTL for: ${lockKey}`);
        }
      } catch (err) {
        console.error('[Deduplication] Error renewing lock TTL:', err.message);
      }
    }, 10000);

    // Ensure the lock is released when response is finished or connection closed
    let released = false;
    const releaseLock = async () => {
      if (released) return;
      released = true;
      clearInterval(heartbeatInterval);
      try {
        const client = getRedisClient();
        if (client) {
          await client.del(lockKey);
          console.log(`[Deduplication] Released lock: ${lockKey}`);
        }
      } catch (err) {
        console.error('[Deduplication] Error releasing lock:', err.message);
      }
    };

    res.on('finish', releaseLock);
    res.on('close', releaseLock);

    next();
  } catch (err) {
    console.error('[Deduplication] Error executing lock, bypassing deduplication:', err.message);
    next(); // Fallback to proceed if locking fails
  }
}
