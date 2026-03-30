import { getRedisClient } from "./redisClient.js";

const CACHE_MAX_ENTRIES = 500;
const REQUEST_CACHE_PREFIX = "cache:req:";

const store = new Map();

const now = () => Date.now();

const buildRedisKey = (key) => `${REQUEST_CACHE_PREFIX}${key}`;

const evictExpired = () => {
  const ts = now();
  for (const [key, entry] of store.entries()) {
    if (entry.expiresAt <= ts) {
      store.delete(key);
    }
  }
};

const evictOverflow = () => {
  if (store.size <= CACHE_MAX_ENTRIES) {
    return;
  }

  const overflow = store.size - CACHE_MAX_ENTRIES;
  const keys = store.keys();

  for (let i = 0; i < overflow; i += 1) {
    const next = keys.next();
    if (next.done) {
      break;
    }
    store.delete(next.value);
  }
};

const getMemoryCachedResponse = (key) => {
  const entry = store.get(key);
  if (!entry) {
    return null;
  }

  if (entry.expiresAt <= now()) {
    store.delete(key);
    return null;
  }

  return entry.value;
};

const setMemoryCachedResponse = (key, value, ttlMs) => {
  evictExpired();
  store.set(key, {
    value,
    expiresAt: now() + ttlMs,
  });
  evictOverflow();
};

const invalidateMemoryByPrefix = (prefix) => {
  let deleted = 0;
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) {
      store.delete(key);
      deleted += 1;
    }
  }
  return deleted;
};

export const getCachedResponse = async (key) => {
  if (!key) {
    return null;
  }

  const redis = await getRedisClient();
  if (redis) {
    const cached = await redis.get(buildRedisKey(key));
    return cached ? JSON.parse(cached) : null;
  }

  return getMemoryCachedResponse(key);
};

export const setCachedResponse = async (key, value, ttlMs) => {
  if (!key || !Number.isFinite(ttlMs) || ttlMs <= 0) {
    return;
  }

  const redis = await getRedisClient();
  if (redis) {
    await redis.set(buildRedisKey(key), JSON.stringify(value), {
      PX: Math.floor(ttlMs),
    });
    return;
  }

  setMemoryCachedResponse(key, value, ttlMs);
};

export const invalidateCacheByPrefix = async (prefix) => {
  if (!prefix || typeof prefix !== "string") {
    return 0;
  }

  const redis = await getRedisClient();
  if (redis) {
    const pattern = `${buildRedisKey(prefix)}*`;
    let deleted = 0;
    const keys = [];
    for await (const batch of redis.scanIterator({
      MATCH: pattern,
      COUNT: 100,
    })) {
      const batchKeys = Array.isArray(batch) ? batch : [batch];
      keys.push(...batchKeys);
      if (keys.length >= 100) {
        deleted += await redis.del([...keys]);
        keys.length = 0;
      }
    }
    if (keys.length) {
      deleted += await redis.del([...keys]);
    }
    return deleted;
  }

  return invalidateMemoryByPrefix(prefix);
};
