const express = require("express");

const {
  INVALID_REFRESH_TOKEN_ERROR,
  refreshSession,
} = require("../../services/auth-token");
const { sanitizeUser } = require("./sanitize-user");

const router = express.Router();

router.post("/refresh", async (req, res) => {
  const refreshToken = String(req.body.RefreshToken || "").trim();

  if (!refreshToken) {
    return res.status(400).json({ message: "RefreshToken is required" });
  }

  try {
    const { user, accessToken, refreshToken: newRefreshToken } = await refreshSession(
      refreshToken
    );

    return res.json({
      message: "token refreshed",
      AccessToken: accessToken,
      RefreshToken: newRefreshToken,
      User: sanitizeUser(user),
    });
  } catch (error) {
    if (error.message === INVALID_REFRESH_TOKEN_ERROR) {
      return res.status(401).json({ message: "invalid or expired refresh token" });
    }

    return res.status(500).json({ message: "failed to refresh token" });
  }
});

module.exports = router;
