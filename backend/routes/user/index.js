const express = require("express");

const { requireAuth, requireRole } = require("../../middlewares/auth");
const { ROLE_ADMIN } = require("../../models/User");
const createRoute = require("./create");
const getByIdRoute = require("./get-by-id");
const listRoute = require("./list");
const removeRoute = require("./remove");
const updateRoute = require("./update");

const router = express.Router();

router.use(requireAuth);
router.use(requireRole(ROLE_ADMIN));

router.use(createRoute);
router.use(listRoute);
router.use(getByIdRoute);
router.use(updateRoute);
router.use(removeRoute);

module.exports = router;
