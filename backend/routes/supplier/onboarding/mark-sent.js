const express = require("express");
const { Supplier } = require("../../../models/Supplier");
const { isValidId } = require("../validate-id");
const router = express.Router();

router.post("/:id/onboarding/sent", async (req, res) => {
  if (!isValidId(req.params.id)) return res.status(400).json({ code: "supplierOnboarding.error.invalidLink" });
  const generatedAt = new Date(req.body?.generatedAt);
  if (!Number.isFinite(generatedAt.getTime())) return res.status(400).json({ code: "supplierOnboarding.error.conflict" });
  const supplier = await Supplier.findOneAndUpdate({
    _id: req.params.id, "onboarding.status": "generated", "onboarding.generatedAt": generatedAt,
    "onboarding.expiresAt": { $gt: new Date() },
  }, { $set: { "onboarding.status": "sent", "onboarding.sentAt": new Date() } }, { new: true });
  if (!supplier) return res.status(409).json({ code: "supplierOnboarding.error.conflict" });
  return res.json({ status: "sent" });
});

module.exports = router;
