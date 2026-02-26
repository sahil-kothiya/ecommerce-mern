const CACHE_MAX_ENTRIES = 500;

const store = new Map();

const now = () => Date.now();

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

export const getCachedResponse = (key) => {
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

export const setCachedResponse = (key, value, ttlMs) => {
  if (!key || !Number.isFinite(ttlMs) || ttlMs <= 0) {
    return;
  }

  evictExpired();
  store.set(key, {
    value,
    expiresAt: now() + ttlMs,
  });
  evictOverflow();
};

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
