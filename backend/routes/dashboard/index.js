const express = require("express");

const { requireAuth, requireRole } = require("../../middlewares/auth");
const { ROLE_ADMIN } = require("../../models/User");
const salesRoute = require("./sales");
const financeRoute = require("./finance");

const router = express.Router();

router.use(requireAuth);
router.use(salesRoute);
router.use("/finance", requireRole(ROLE_ADMIN), financeRoute);

module.exports = router;
