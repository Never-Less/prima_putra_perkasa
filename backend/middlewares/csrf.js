function parseAllowedOrigins(rawOrigins) {
  const configuredOrigins = (rawOrigins || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (configuredOrigins.length > 0) {
    return configuredOrigins;
  }

  return ["http://localhost:3000", "http://127.0.0.1:3000"];
}

function isOriginAllowed(origin, allowedOrigins) {
  if (!origin) {
    return true;
  }

  return allowedOrigins.includes(origin);
}

function getRequestOrigin(req) {
  const origin = req.get("origin");
  if (origin) {
    return origin;
  }

  const referer = req.get("referer");
  if (!referer) {
    return null;
  }

  try {
    return new URL(referer).origin;
  } catch (_error) {
    return null;
  }
}

function createCsrfProtection(allowedOrigins) {
  return (req, res, next) => {
    const safeMethods = ["GET", "HEAD", "OPTIONS"];
    if (safeMethods.includes(req.method)) {
      return next();
    }

    const requestOrigin = getRequestOrigin(req);
    if (!requestOrigin) {
      return next();
    }

    if (!isOriginAllowed(requestOrigin, allowedOrigins)) {
      return res.status(403).json({
        message: "Blocked by CSRF origin policy",
      });
    }

    next();
  };
}

module.exports = {
  parseAllowedOrigins,
  isOriginAllowed,
  createCsrfProtection,
};
