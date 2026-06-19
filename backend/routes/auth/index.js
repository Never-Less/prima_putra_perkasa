const express = require("express");

const { createRateLimit } = require("../../middlewares/rate-limit");
const loginRoute = require("./login");
const logoutRoute = require("./logout");
const meRoute = require("./me");
const refreshRoute = require("./refresh");
const registerRoute = require("./register");

const router = express.Router();
const authRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: "Terlalu banyak percobaan login. Tunggu sebentar lalu coba lagi.",
});

router.use(["/register", "/login", "/refresh"], authRateLimit);
router.use(registerRoute);
router.use(loginRoute);
router.use(refreshRoute);
router.use(logoutRoute);
router.use(meRoute);

module.exports = router;
