const express = require("express");

const { issueTokenPair } = require("../../services/auth-token");
const { User } = require("../../models/User");
const { sanitizeUser } = require("./sanitize-user");

const router = express.Router();

router.post("/register", async (req, res) => {
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

    if (password.length < 8) {
      return res.status(400).json({
        message: "password must be at least 8 characters",
      });
    }

    const exists = await User.findOne({ username });
    if (exists) {
      return res.status(409).json({ message: "username already exists" });
    }

    const user = await User.create({
      username,
      password,
      role: "staff",
    });

    const { accessToken, refreshToken } = await issueTokenPair(user);

    return res.status(201).json({
      message: "user registered",
      accessToken,
      refreshToken,
      user: sanitizeUser(user),
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ message: "username already exists" });
    }

    return res.status(500).json({ message: "failed to register user" });
  }
});

module.exports = router;
