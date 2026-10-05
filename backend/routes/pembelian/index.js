const express = require("express");

const { requireAuth } = require("../../middlewares/auth");
const createRoute = require("./create");
const getByIdRoute = require("./get-by-id");
const listRoute = require("./list");
const outstandingRoute = require("./outstanding");
const removeRoute = require("./remove");
const updateRoute = require("./update");

const router = express.Router();

router.use(requireAuth);

router.use(createRoute);
router.use(listRoute);
router.use(outstandingRoute);
router.use(getByIdRoute);
router.use(updateRoute);
router.use(removeRoute);

module.exports = router;
