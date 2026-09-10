const express = require("express");
const { Supplier } = require("../../models/Supplier");
const { validToken, hashToken } = require("../supplier/onboarding/validation");
const router = express.Router();

router.get("/:token", async (req, res) => {
  if (!validToken(req.params.token)) return res.status(404).json({ code: "supplierOnboarding.error.invalidLink" });
  const supplier = await Supplier.findOne({
    "onboarding.tokenHash": hashToken(req.params.token), "onboarding.expiresAt": { $gt: new Date() },
  }).select("namaSupplier onboarding.status").lean();
  if (!supplier) return res.status(404).json({ code: "supplierOnboarding.error.invalidLink" });
  return res.json({ namaSupplier: supplier.namaSupplier, status: supplier.onboarding.status });
});

module.exports = router;
