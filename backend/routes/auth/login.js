const express = require("express");

const { issueTokenPair } = require("../../services/auth-token");
const { User } = require("../../models/User");
const { sanitizeUser } = require("./sanitize-user");

const router = express.Router();

router.post("/login", async (req, res) => {
  try {
    const username = String(req.body.username || "")
      .trim()
      .toLowerCase();
    const password = String(req.body.password || "");

    if (!username || !password) {
      return res.status(400).json({
        message: "username and password are required",
      });
    }

    const user = await User.findOne({ username: username }).select("+password");

    if (!user) {
      return res.status(401).json({ message: "Invalid username or password" });
    }

    const passwordMatched = await user.comparePassword(password);

    if (!passwordMatched) {
      return res.status(401).json({ message: "Invalid username or password" });
    }

    const { accessToken, refreshToken } = await issueTokenPair(user);

    return res.json({
      message: "login success",
      accessToken: accessToken,
      refreshToken: refreshToken,
      user: sanitizeUser(user),
    });
  } catch (_error) {
    return res.status(500).json({ message: "failed to login" });
  }
});

module.exports = router;
