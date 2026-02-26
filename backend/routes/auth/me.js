const express = require("express");

const { requireAuth } = require("../../middlewares/auth");
const { sanitizeUser } = require("./sanitize-user");

const router = express.Router();

router.get("/me", requireAuth, (req, res) => {
  return res.json({
    user: sanitizeUser(req.user),
  });
});

module.exports = router;
