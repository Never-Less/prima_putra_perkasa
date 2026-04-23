const express = require("express");

const { User, ALLOWED_ROLES, ROLE_STAFF } = require("../../models/User");
const { sanitizeUser } = require("./sanitize-user");
const { normalizeRole } = require("./validators");

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const username = String(req.body.username || "")
      .trim()
      .toLowerCase();
    const password = String(req.body.password || "");
    const role = normalizeRole(req.body.role) || ROLE_STAFF;

    if (!username || !password) {
      return res.status(400).json({
        message: "username dan password wajib diisi",
      });
    }

    if (!ALLOWED_ROLES.includes(role)) {
      return res.status(400).json({
        message: "role tidak valid",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        message: "password minimal 8 karakter",
      });
    }

    const existingUser = await User.findOne({ username: username });

    if (existingUser) {
      return res.status(409).json({ message: "username already exists" });
    }

    const user = await User.create({
      username,
      password,
      role,
    });

    return res.status(201).json({
      message: "user created",
      user: sanitizeUser(user),
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ message: "username already exists" });
    }

    return res.status(500).json({ message: "failed to create user" });
  }
});

module.exports = router;
