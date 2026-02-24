const jwt = require("jsonwebtoken");

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET is not set");
  }

  return secret;
}

function getJwtRefreshSecret() {
  const secret = process.env.JWT_REFRESH_SECRET;

  if (!secret) {
    throw new Error("JWT_REFRESH_SECRET is not set");
  }

  return secret;
}

function signAccessToken(user) {
  const payload = {
    sub: user._id.toString(),
    Username: user.Username,
    Role: user.Role,
  };

  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: process.env.JWT_EXPIRES_IN || "1d",
  });
}

function verifyAccessToken(token) {
  return jwt.verify(token, getJwtSecret());
}

function signRefreshToken(user, tokenId) {
  const payload = {
    sub: user._id.toString(),
    tokenId,
    type: "refresh",
  };

  return jwt.sign(payload, getJwtRefreshSecret(), {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
  });
}

function verifyRefreshToken(token) {
  return jwt.verify(token, getJwtRefreshSecret());
}

function decodeToken(token) {
  return jwt.decode(token);
}

module.exports = {
  decodeToken,
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
};
