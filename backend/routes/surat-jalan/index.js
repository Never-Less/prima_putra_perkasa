const express = require("express");

const { requireAuth } = require("../../middlewares/auth");
const createRoute = require("./create");
const invoiceOptionsRoute = require("./invoice-options");
const noPoOptionsRoute = require("./no-po-options");
const getByIdRoute = require("./get-by-id");
const listRoute = require("./list");
const removeRoute = require("./remove");
const updateRoute = require("./update");

const router = express.Router();

router.use(requireAuth);

router.use(createRoute);
router.use(invoiceOptionsRoute);
router.use(noPoOptionsRoute);
router.use(listRoute);
router.use(getByIdRoute);
router.use(updateRoute);
router.use(removeRoute);

module.exports = router;
