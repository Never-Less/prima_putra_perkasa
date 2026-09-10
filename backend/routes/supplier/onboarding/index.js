const express = require("express");
const { requireRole } = require("../../../middlewares/auth");
const { ROLE_ADMIN, ROLE_STAFF } = require("../../../models/User");
const router = express.Router();
router.use("/:id/onboarding", requireRole(ROLE_ADMIN, ROLE_STAFF));
router.use(require("./generate"));
router.use(require("./mark-sent"));
router.use(require("./approve"));
module.exports = router;
