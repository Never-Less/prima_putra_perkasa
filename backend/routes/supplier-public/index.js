const express = require("express");
const router = express.Router();
router.use((_req, res, next) => {
  res.set({ "Cache-Control": "no-store", "Referrer-Policy": "no-referrer", "X-Robots-Tag": "noindex, nofollow" });
  next();
});
router.use(require("./get-form"));
router.use(require("./submit"));
module.exports = router;
