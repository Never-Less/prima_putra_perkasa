const express = require("express");
const { Supplier } = require("../../models/Supplier");
const { validToken, hashToken, validateProfile } = require("../supplier/onboarding/validation");
const router = express.Router();
const { receiveDocuments, storeDocuments, discardDocuments } = require("../supplier/document-storage");

router.post("/:token", async (req, res, next) => {
  if (!validToken(req.params.token)) return res.status(404).json({ code: "supplierOnboarding.error.invalidLink" });
  req.supplierCondition = {
    "onboarding.tokenHash": hashToken(req.params.token),
    "onboarding.status": { $in: ["generated", "sent"] },
    "onboarding.expiresAt": { $gt: new Date() },
  };
  req.formSupplier = await Supplier.findOne(req.supplierCondition);
  if (!req.formSupplier) return res.status(409).json({ code: "supplierOnboarding.error.closed" });
  next();
}, receiveDocuments, async (req, res) => {
  const profile = validateProfile(req.body);
  if (!profile.valid) return res.status(400).json({ code: "supplierOnboarding.error.validation", errors: profile.errors });
  // Allowlisted profile fields stay pending; public input never changes credit or company name.
  let documents = [];
  let linked = false;
  try {
    documents = await storeDocuments(req.formSupplier._id, req.files);
    profile.data.documents = documents;
    const supplier = await Supplier.findOneAndUpdate({ ...req.supplierCondition, "onboarding.expiresAt": { $gt: new Date() } }, { $set: {
      "onboarding.status": "submitted", "onboarding.submittedAt": new Date(), "onboarding.pendingData": profile.data,
    } }, { new: true, runValidators: true });
    if (!supplier) return res.status(409).json({ code: "supplierOnboarding.error.closed" });
    linked = true;
    return res.json({ status: "submitted" });
  } finally {
    if (!linked) await discardDocuments(documents);
  }
});

module.exports = router;
