const express = require("express");

const { User } = require("../../models/User");
const { sanitizeUser } = require("./sanitize-user");
const { isValidId } = require("./validators");

const router = express.Router();

router.get("/:id", async (req, res) => {
  const id = String(req.params.id || "");

  if (!isValidId(id)) {
    return res.status(400).json({ message: "invalid user id" });
  }

  try {
    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ message: "user not found" });
    }

    return res.json({
      user: sanitizeUser(user),
    });
  } catch (_error) {
    return res.status(500).json({ message: "failed to get user" });
  }
});

module.exports = router;
