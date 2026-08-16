// ─── server/middleware/cache.js ───────────────────────────────────────────────
// Simple in-memory LRU cache middleware for expensive read-only API responses.
// Cache entries expire after ttl seconds. Bypassed on write requests.

'use strict';

const DEFAULT_TTL = 60; // seconds
const MAX_ENTRIES = 500;

class LRUCache {
  constructor(maxSize) {
    this.maxSize = maxSize;
    this.cache   = new Map();
  }

  get(key) {
    if (!this.cache.has(key)) return null;
    const entry = this.cache.get(key);
    if (Date.now() > entry.expiresAt) { this.cache.delete(key); return null; }
    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.value;
  }

  set(key, value, ttlSeconds) {
    if (this.cache.size >= this.maxSize) {
      // Evict oldest entry
      const oldest = this.cache.keys().next().value;
      this.cache.delete(oldest);
    }
    this.cache.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
  }

  delete(key) { this.cache.delete(key); }
  clear()     { this.cache.clear(); }
  get size()  { return this.cache.size; }
  stats()     { return { size: this.size, maxSize: this.maxSize }; }
}

const cache = new LRUCache(MAX_ENTRIES);

/**
 * cacheMiddleware - Express middleware factory
 * @param {number} ttl - Cache TTL in seconds (default: 60)
 * @param {function} keyFn - Optional function(req) => string to generate cache key
 */
function cacheMiddleware(ttl = DEFAULT_TTL, keyFn) {
  return (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') return next();

    const key = keyFn ? keyFn(req) : `${req.user?.id}:${req.originalUrl}`;
    const cached = cache.get(key);

    if (cached) {
      res.setHeader('X-Cache', 'HIT');
      return res.json(cached);
    }

    res.setHeader('X-Cache', 'MISS');

    // Intercept res.json to store in cache
    const originalJson = res.json.bind(res);
    res.json = (data) => {
      if (res.statusCode === 200) cache.set(key, data, ttl);
      return originalJson(data);
    };

    next();
  };
}

/**
 * invalidateCache - invalidate all cache entries matching a prefix
 */
function invalidateCache(prefix) {
  for (const key of cache.cache.keys()) {
    if (key.includes(prefix)) cache.delete(key);
  }
}

module.exports = { cacheMiddleware, invalidateCache, cache };
