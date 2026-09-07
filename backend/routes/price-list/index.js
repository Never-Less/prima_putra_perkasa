const express = require("express");
const { requireAuth } = require("../../middlewares/auth");
const createRoute = require("./create");
const bulkRoute = require("./bulk");
const customerNamesRoute = require("./customer-names");
const getByIdRoute = require("./get-by-id");
const imagesRoute = require("./images");
const listRoute = require("./list");
const optionsRoute = require("./options");
const removeRoute = require("./remove");
const updateRoute = require("./update");

const router = express.Router();
router.use(requireAuth);
router.use(optionsRoute);
router.use(customerNamesRoute);
router.use(imagesRoute);
router.use(bulkRoute);
router.use(createRoute);
router.use(listRoute);
router.use(getByIdRoute);
router.use(updateRoute);
router.use(removeRoute);

module.exports = router;
