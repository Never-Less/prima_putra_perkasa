const express = require("express");

const loginRoute = require("./login");
const logoutRoute = require("./logout");
const meRoute = require("./me");
const refreshRoute = require("./refresh");
const registerRoute = require("./register");

const router = express.Router();

router.use(registerRoute);
router.use(loginRoute);
router.use(refreshRoute);
router.use(logoutRoute);
router.use(meRoute);

module.exports = router;
