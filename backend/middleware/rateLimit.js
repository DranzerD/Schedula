/**
 * Minimal in-memory fixed-window rate limiter (no dependencies).
 * Keyed by authenticated user id (falls back to IP). Protects the Groq key
 * from runaway clients. For multi-instance deployments swap in a shared store.
 */

function createRateLimiter({ windowMs = 60000, max = 20, message } = {}) {
  const hits = new Map();

  // Periodically drop expired windows so the map can't grow unbounded
  const sweeper = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of hits) {
      if (entry.resetAt <= now) hits.delete(key);
    }
  }, windowMs);
  if (sweeper.unref) sweeper.unref();

  return function rateLimit(req, res, next) {
    const key = String(req.user?.id || req.ip || "anon");
    const now = Date.now();
    let entry = hits.get(key);
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs };
      hits.set(key, entry);
    }
    entry.count++;

    res.setHeader("X-RateLimit-Limit", max);
    res.setHeader("X-RateLimit-Remaining", Math.max(0, max - entry.count));

    if (entry.count > max) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      res.setHeader("Retry-After", retryAfter);
      return res.status(429).json({
        success: false,
        message: message || `Too many requests. Try again in ${retryAfter}s.`,
      });
    }
    next();
  };
}

module.exports = { createRateLimiter };
