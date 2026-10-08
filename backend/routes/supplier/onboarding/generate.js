const express = require("express");
const crypto = require("node:crypto");
const { Supplier } = require("../../../models/Supplier");
const { isValidId } = require("../validate-id");
const { hashToken } = require("./validation");
const router = express.Router();
const { discardDocuments } = require("../document-storage");

router.post("/:id/onboarding/generate", async (req, res) => {
  if (!isValidId(req.params.id)) return res.status(400).json({ code: "supplierOnboarding.error.invalidLink" });
  const token = crypto.randomBytes(32).toString("hex");
  const generatedAt = new Date();
  const expiresAt = new Date(generatedAt.getTime() + 7 * 24 * 60 * 60 * 1000);
  // Replace the whole invitation atomically: older links can no longer submit.
  const supplier = await Supplier.findByIdAndUpdate(req.params.id, { $set: { onboarding: {
    status: "generated", tokenHash: hashToken(token), generatedAt, expiresAt, pendingData: null,
  } } }, { new: false, runValidators: true });
  if (!supplier) return res.status(404).json({ code: "supplierOnboarding.error.invalidLink" });
  await discardDocuments(supplier.onboarding?.pendingData?.documents);
  res.set("Cache-Control", "no-store");
  return res.json({ token, expiresAt });
});

module.exports = router;
