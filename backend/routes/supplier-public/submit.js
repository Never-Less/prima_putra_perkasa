const express = require("express");
const { Supplier } = require("../../models/Supplier");
const { validToken, hashToken, validateProfile } = require("../supplier/onboarding/validation");
const router = express.Router();

router.post("/:token", async (req, res) => {
  if (!validToken(req.params.token)) return res.status(404).json({ code: "supplierOnboarding.error.invalidLink" });
  const profile = validateProfile(req.body);
  if (!profile.valid) return res.status(400).json({ code: "supplierOnboarding.error.validation", errors: profile.errors });
  // Allowlisted profile fields stay pending; public input never changes credit or company name.
  const supplier = await Supplier.findOneAndUpdate({
    "onboarding.tokenHash": hashToken(req.params.token),
    "onboarding.status": { $in: ["generated", "sent"] },
    "onboarding.expiresAt": { $gt: new Date() },
  }, { $set: {
    "onboarding.status": "submitted", "onboarding.submittedAt": new Date(), "onboarding.pendingData": profile.data,
  } }, { new: true, runValidators: true });
  if (!supplier) return res.status(409).json({ code: "supplierOnboarding.error.closed" });
  return res.json({ status: "submitted" });
});

module.exports = router;
