const express = require("express");
const { Supplier } = require("../../../models/Supplier");
const { isValidId } = require("../validate-id");
const { validateProfile } = require("./validation");
const router = express.Router();

router.post("/:id/onboarding/approve", async (req, res) => {
  if (!isValidId(req.params.id)) return res.status(400).json({ code: "supplierOnboarding.error.invalidLink" });
  const { hutang, lamaHutang } = req.body || {};
  if (typeof hutang !== "boolean" || (hutang && (!Number.isInteger(lamaHutang) || lamaHutang <= 0))) {
    return res.status(400).json({ code: "supplierOnboarding.error.credit" });
  }
  const submittedAt = new Date(req.body?.submittedAt);
  if (!Number.isFinite(submittedAt.getTime())) return res.status(400).json({ code: "supplierOnboarding.error.conflict" });
  const condition = { _id: req.params.id, "onboarding.status": "submitted", "onboarding.submittedAt": submittedAt };
  const existing = await Supplier.findOne(condition);
  if (!existing) return res.status(409).json({ code: "supplierOnboarding.error.conflict" });
  const profile = validateProfile(existing.onboarding.pendingData || {});
  if (!profile.valid) return res.status(400).json({ code: "supplierOnboarding.error.validation", errors: profile.errors });
  const supplier = await Supplier.findOneAndUpdate(condition, { $set: {
    ...profile.data, hutang, lamaHutang: hutang ? lamaHutang : null,
    "onboarding.status": "completed", "onboarding.completedAt": new Date(),
    "onboarding.reviewedBy": req.user._id, "onboarding.pendingData": null,
  }, $unset: { "onboarding.tokenHash": 1 } }, { new: true, runValidators: true });
  if (!supplier) return res.status(409).json({ code: "supplierOnboarding.error.conflict" });
  return res.json({ status: "completed" });
});

module.exports = router;
