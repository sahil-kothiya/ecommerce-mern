// Fast in-memory cache with LRU eviction
const CACHE_MAX_ENTRIES = 1000;

const store = new Map();

const now = () => Date.now();

// LRU eviction: delete oldest entries when cache is full
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

// Get cached value, delete if expired
export const getCachedResponse = (key) => {
  if (!key) {
    return null;
  }

  const entry = store.get(key);
  if (!entry) {
    return null;
  }

  if (entry.expiresAt <= now()) {
    store.delete(key);
    return null;
  }

  // Move to end for LRU (re-insert)
  store.delete(key);
  store.set(key, entry);

  return entry.value;
};

// Set cached value with TTL
export const setCachedResponse = (key, value, ttlMs) => {
  if (!key || !Number.isFinite(ttlMs) || ttlMs <= 0) {
    return;
  }

  // Delete first if exists to maintain LRU order
  store.delete(key);
  store.set(key, {
    value,
    expiresAt: now() + ttlMs,
  });
  evictOverflow();
};

// Invalidate all keys with given prefix
export const invalidateCacheByPrefix = (prefix) => {
  if (!prefix || typeof prefix !== "string") {
    return 0;
  }

  let deleted = 0;
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) {
      store.delete(key);
      deleted += 1;
    }
  }
  return deleted;
};

// Clear entire cache
export const clearCache = () => {
  const size = store.size;
  store.clear();
  return size;
};

// Get cache stats
export const getCacheStats = () => ({
  size: store.size,
  maxSize: CACHE_MAX_ENTRIES,
});
