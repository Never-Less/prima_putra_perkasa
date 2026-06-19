function getClientKey(req) {
  return req.ip || req.socket?.remoteAddress || "unknown";
}

function getRequestKey(req) {
  const routePath = `${req.baseUrl || ""}${req.path || ""}`;

  if (routePath) {
    return routePath;
  }

  return String(req.originalUrl || req.url || "/").split("?")[0] || "/";
}

function createRateLimit(options = {}) {
  const windowMs = Number(options.windowMs) || 15 * 60 * 1000;
  const max = Number(options.max) || 30;
  const message =
    options.message || "Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi.";
  const hits = new Map();

  return (req, res, next) => {
    const now = Date.now();
    const key = `${getClientKey(req)}:${req.method}:${getRequestKey(req)}`;
    const current = hits.get(key);

    if (!current || current.resetAt <= now) {
      hits.set(key, {
        count: 1,
        resetAt: now + windowMs,
      });
      return next();
    }

    current.count += 1;

    if (current.count > max) {
      const retryAfterSeconds = Math.max(1, Math.ceil((current.resetAt - now) / 1000));

      res.set("Retry-After", String(retryAfterSeconds));
      return res.status(429).json({
        message,
      });
    }

    return next();
  };
}

module.exports = {
  createRateLimit,
};
