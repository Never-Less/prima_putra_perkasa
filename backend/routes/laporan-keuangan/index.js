const express = require("express");

const { requireAuth, requireRole } = require("../../middlewares/auth");
const { ROLE_ADMIN } = require("../../models/User");
const getByBulanRoute = require("./get-by-bulan");
const saveRoute = require("./save");

const router = express.Router();

router.use(requireAuth);
router.use(requireRole(ROLE_ADMIN));

router.use(getByBulanRoute);
router.use(saveRoute);

module.exports = router;
