const { randomUUID } = require("crypto");

const { RefreshToken } = require("../models/RefreshToken");
const { User } = require("../models/User");
const {
  decodeToken,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} = require("../utils/jwt");

const INVALID_REFRESH_TOKEN_ERROR = "INVALID_REFRESH_TOKEN";

function getExpiryDateFromToken(token) {
  const decoded = decodeToken(token);

  if (!decoded?.exp) {
    throw new Error("Refresh token expiration is missing");
  }

  return new Date(decoded.exp * 1000);
}

function validateRefreshPayload(payload) {
  if (!payload?.sub || !payload?.tokenId || payload?.type !== "refresh") {
    throw new Error(INVALID_REFRESH_TOKEN_ERROR);
  }
}

async function issueTokenPair(user) {
  const tokenId = randomUUID();
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user, tokenId);
  const expiresAt = getExpiryDateFromToken(refreshToken);

  await RefreshToken.create({
    user: user._id,
    tokenId,
    expiresAt,
  });

  return {
    accessToken,
    refreshToken,
  };
}

async function refreshSession(currentRefreshToken) {
  try {
    const payload = verifyRefreshToken(currentRefreshToken);
    validateRefreshPayload(payload);

    const storedToken = await RefreshToken.findOne({
      tokenId: payload.tokenId,
      user: payload.sub,
    });

    if (!storedToken) {
      throw new Error(INVALID_REFRESH_TOKEN_ERROR);
    }

    const now = new Date();

    if (storedToken.revokedAt || storedToken.expiresAt <= now) {
      throw new Error(INVALID_REFRESH_TOKEN_ERROR);
    }

    const user = await User.findById(payload.sub);

    if (!user) {
      storedToken.revokedAt = now;
      await storedToken.save();
      throw new Error(INVALID_REFRESH_TOKEN_ERROR);
    }

    storedToken.revokedAt = now;
    await storedToken.save();

    const { accessToken, refreshToken } = await issueTokenPair(user);

    return {
      user,
      accessToken,
      refreshToken,
    };
  } catch (_error) {
    throw new Error(INVALID_REFRESH_TOKEN_ERROR);
  }
}

async function revokeRefreshToken(currentRefreshToken) {
  try {
    const payload = verifyRefreshToken(currentRefreshToken);
    validateRefreshPayload(payload);

    const storedToken = await RefreshToken.findOne({
      tokenId: payload.tokenId,
      user: payload.sub,
    });

    if (!storedToken || storedToken.revokedAt) {
      return false;
    }

    storedToken.revokedAt = new Date();
    await storedToken.save();

    return true;
  } catch (_error) {
    return false;
  }
}

module.exports = {
  INVALID_REFRESH_TOKEN_ERROR,
  issueTokenPair,
  refreshSession,
  revokeRefreshToken,
};
