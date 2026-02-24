const express = require("express");

const { issueTokenPair } = require("../../services/auth-token");
const { User } = require("../../models/User");
const { sanitizeUser } = require("./sanitize-user");

const router = express.Router();

router.post("/login", async (req, res) => {
  try {
    const username = String(req.body.Username || "")
      .trim()
      .toLowerCase();
    const password = String(req.body.Password || "");

    if (!username || !password) {
      return res.status(400).json({
        message: "Username and Password are required",
      });
    }

    const user = await User.findOne({ Username: username }).select("+Password");

    if (!user) {
      return res.status(401).json({ message: "Invalid Username or Password" });
    }

    const passwordMatched = await user.comparePassword(password);

    if (!passwordMatched) {
      return res.status(401).json({ message: "Invalid Username or Password" });
    }

    const { accessToken, refreshToken } = await issueTokenPair(user);

    return res.json({
      message: "login success",
      AccessToken: accessToken,
      RefreshToken: refreshToken,
      User: sanitizeUser(user),
    });
  } catch (_error) {
    return res.status(500).json({ message: "failed to login" });
  }
});

module.exports = router;
