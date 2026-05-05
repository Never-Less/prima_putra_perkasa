const express = require("express");

const { User, ALLOWED_ROLES } = require("../../models/User");
const { sanitizeUser } = require("./sanitize-user");
const { isValidId, normalizeRole } = require("./validators");

const router = express.Router();

router.put("/:id", async (req, res) => {
  const id = String(req.params.id || "");

  if (!isValidId(id)) {
    return res.status(400).json({ message: "invalid user id" });
  }

  try {
    const user = await User.findById(id).select("+password");

    if (!user) {
      return res.status(404).json({ message: "user not found" });
    }

    const nextUsername =
      req.body.username !== undefined
        ? String(req.body.username || "")
            .trim()
            .toLowerCase()
        : user.username;
    const nextPassword =
      req.body.password !== undefined ? String(req.body.password || "") : "";
    const nextRole =
      req.body.role !== undefined ? normalizeRole(req.body.role) : user.role;

    if (!nextUsername) {
      return res.status(400).json({ message: "username wajib diisi" });
    }

    if (!ALLOWED_ROLES.includes(nextRole)) {
      return res.status(400).json({ message: "role tidak valid" });
    }

    if (req.body.password !== undefined && nextPassword && nextPassword.length < 8) {
      return res.status(400).json({ message: "password minimal 8 karakter" });
    }

    const duplicateUser = await User.findOne({
      username: nextUsername,
      _id: { $ne: user._id },
    });

    if (duplicateUser) {
      return res.status(409).json({ message: "username already exists" });
    }

    user.username = nextUsername;
    user.role = nextRole;

    if (req.body.password !== undefined && nextPassword) {
      user.password = nextPassword;
    }

    await user.save();

    return res.json({
      message: "user updated",
      user: sanitizeUser(user),
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ message: "username already exists" });
    }

    return res.status(500).json({ message: "failed to update user" });
  }
});

module.exports = router;
