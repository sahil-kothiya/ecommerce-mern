import { logger } from "../utils/logger.js";
import {
  getCachedResponse,
  setCachedResponse,
  invalidateCacheByPrefix,
} from "../utils/requestCache.js";

/**
 * Invalidate all cached entries whose key starts with a given prefix.
 * Call this after write operations (create / update / delete).
 * @param {string} prefix
 */
export const invalidateCache = (prefix) => {
  void invalidateCacheByPrefix(prefix).catch((error) => {
    logger.warn(
      `[CACHE] invalidate failed for prefix=${prefix}: ${error.message}`,
    );
  });
};

/**
 * In-memory response cache middleware.
 * Only caches successful GET responses (2xx).
 *
 * @param {number} ttlSeconds - Cache lifetime in seconds (default 60)
 */
export const cacheMiddleware =
  (ttlSeconds = 60) =>
  async (req, res, next) => {
    if (req.method !== "GET") return next();

    const key = req.originalUrl;
    const cached = await getCachedResponse(key);

    if (cached) {
      res.setHeader("X-Cache", "HIT");
      return res.json(cached);
    }

    // Intercept res.json to store the response before sending
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        void setCachedResponse(key, body, ttlSeconds * 1000).catch((error) => {
          logger.warn(`[CACHE] set failed for ${key}: ${error.message}`);
        });
        logger.debug(`[CACHE] SET ${key} ttl=${ttlSeconds}s`);
      }
      res.setHeader("X-Cache", "MISS");
      return originalJson(body);
    };

    next();
  };
