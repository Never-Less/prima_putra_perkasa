const express = require("express");

const { issueTokenPair } = require("../../services/auth-token");
const { User } = require("../../models/User");
const { sanitizeUser } = require("./sanitize-user");

const router = express.Router();

router.post("/register", async (req, res) => {
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

    if (password.length < 8) {
      return res.status(400).json({
        message: "Password must be at least 8 characters",
      });
    }

    const exists = await User.findOne({ Username: username });
    if (exists) {
      return res.status(409).json({ message: "Username already exists" });
    }

    const user = await User.create({
      Username: username,
      Password: password,
      Role: "staff",
    });

    const { accessToken, refreshToken } = await issueTokenPair(user);

    return res.status(201).json({
      message: "user registered",
      AccessToken: accessToken,
      RefreshToken: refreshToken,
      User: sanitizeUser(user),
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ message: "Username already exists" });
    }

    return res.status(500).json({ message: "failed to register user" });
  }
});

module.exports = router;
