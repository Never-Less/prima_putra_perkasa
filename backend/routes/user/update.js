const express = require("express");

const { User, ALLOWED_ROLES } = require("../../models/User");
const { sanitizeUser } = require("./sanitize-user");
const { isValidId, normalizeRole } = require("./validators");

const router = express.Router();

router.put("/:id", async (req, res) => {
  const id = String(req.params.id || "");

  if (!isValidId(id)) {
    return res.status(400).json({ message: "Data user yang dipilih tidak dapat dibuka." });
  }

  try {
    const user = await User.findById(id).select("+password");

    if (!user) {
      return res.status(404).json({ message: "Data user tidak ditemukan." });
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
      return res.status(400).json({ message: "Isi username sebelum menyimpan user." });
    }

    if (!ALLOWED_ROLES.includes(nextRole)) {
      return res.status(400).json({ message: "Role yang dipilih tidak valid." });
    }

    if (req.body.password !== undefined && nextPassword && nextPassword.length < 8) {
      return res.status(400).json({ message: "Password minimal 8 karakter." });
    }

    const duplicateUser = await User.findOne({
      username: nextUsername,
      _id: { $ne: user._id },
    });

    if (duplicateUser) {
      return res.status(409).json({ message: "Username ini sudah digunakan." });
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
      return res.status(409).json({ message: "Username ini sudah digunakan." });
    }

    return res.status(500).json({ message: "Data user belum bisa disimpan. Coba lagi." });
  }
});

module.exports = router;
