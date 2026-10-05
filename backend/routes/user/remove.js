const express = require("express");
const { protectedUserIds } = require("../../utils/break-glass-access");

const { User } = require("../../models/User");
const { isValidId } = require("./validators");

const router = express.Router();

router.delete("/:id", async (req, res) => {
  const id = String(req.params.id || "");

  if (!isValidId(id)) {
    return res.status(400).json({ message: "invalid user id" });
  }

  if (String(req.user?._id || "") === id) {
    return res.status(400).json({
      message: "user yang sedang login tidak bisa dihapus",
    });
  }

  try {
    if (protectedUserIds().includes(id.toLowerCase())) {
      return res.status(403).json({ message: "Akun owner/developer tidak dapat dihapus lewat aplikasi." });
    }
    const user = await User.findByIdAndDelete(id);

    if (!user) {
      return res.status(404).json({ message: "user not found" });
    }

    return res.json({
      message: "user deleted",
    });
  } catch (_error) {
    return res.status(500).json({ message: "failed to delete user" });
  }
});

module.exports = router;
