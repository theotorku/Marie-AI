/**
 * In-memory sliding window rate limiter.
 * Tracks request timestamps per IP and rejects requests that exceed the limit.
 *
 * @param {object} opts
 * @param {number} opts.windowMs  - Time window in milliseconds (default: 60s)
 * @param {number} opts.maxRequests - Max requests per window (default: 20)
 */
export function rateLimit({ windowMs = 60_000, maxRequests = 20 } = {}) {
  const clients = new Map();

  // Sweep expired entries every 5 minutes to prevent memory growth
  setInterval(() => {
    const now = Date.now();
    for (const [ip, timestamps] of clients) {
      const valid = timestamps.filter((t) => now - t < windowMs);
      if (valid.length === 0) {
        clients.delete(ip);
      } else {
        clients.set(ip, valid);
      }
    }
  }, 5 * 60_000);

  return (req, res, next) => {
    const ip = req.ip || req.socket.remoteAddress || "unknown";
    const now = Date.now();

    const timestamps = (clients.get(ip) || []).filter((t) => now - t < windowMs);
    timestamps.push(now);
    clients.set(ip, timestamps);

    const remaining = Math.max(0, maxRequests - timestamps.length);

    res.set("X-RateLimit-Limit", String(maxRequests));
    res.set("X-RateLimit-Remaining", String(remaining));
    res.set("X-RateLimit-Reset", String(Math.ceil((timestamps[0] + windowMs) / 1000)));

    if (timestamps.length > maxRequests) {
      const retryAfter = Math.ceil((timestamps[0] + windowMs - now) / 1000);
      res.set("Retry-After", String(retryAfter));
      return res.status(429).json({
        error: `Rate limit exceeded. Try again in ${retryAfter}s.`,
      });
    }

    next();
  };
}
