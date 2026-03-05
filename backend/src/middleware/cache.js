import { logger } from "../utils/logger.js";

const store = new Map();

/**
 * Evict all entries whose TTL has expired.
 * Runs periodically to prevent unbounded memory growth.
 */
const evictExpired = () => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now > entry.expiresAt) store.delete(key);
  }
};

// Sweep every 2 minutes
setInterval(evictExpired, 120_000).unref();

/**
 * Invalidate all cached entries whose key starts with a given prefix.
 * Call this after write operations (create / update / delete).
 * @param {string} prefix
 */
export const invalidateCache = (prefix) => {
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key);
  }
};

/**
 * In-memory response cache middleware.
 * Only caches successful GET responses (2xx).
 *
 * @param {number} ttlSeconds - Cache lifetime in seconds (default 60)
 */
export const cacheMiddleware =
  (ttlSeconds = 60) =>
  (req, res, next) => {
    if (req.method !== "GET") return next();

    const key = req.originalUrl;
    const cached = store.get(key);

    if (cached && Date.now() <= cached.expiresAt) {
      res.setHeader("X-Cache", "HIT");
      return res.json(cached.body);
    }

    // Intercept res.json to store the response before sending
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        store.set(key, { body, expiresAt: Date.now() + ttlSeconds * 1000 });
        logger.debug(`[CACHE] SET ${key} ttl=${ttlSeconds}s`);
      }
      res.setHeader("X-Cache", "MISS");
      return originalJson(body);
    };

    next();
  };
