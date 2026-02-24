const express = require("express");

const { revokeRefreshToken } = require("../../services/auth-token");

const router = express.Router();

router.post("/logout", async (req, res) => {
  const refreshToken = String(req.body.RefreshToken || "").trim();

  if (!refreshToken) {
    return res.status(400).json({ message: "RefreshToken is required" });
  }

  await revokeRefreshToken(refreshToken);

  return res.json({
    message: "logout success",
  });
});

module.exports = router;
