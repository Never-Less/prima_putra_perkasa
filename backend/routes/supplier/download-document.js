const express = require("express");
const { Supplier } = require("../../models/Supplier");
const { SupplierDocument } = require("../../models/SupplierDocument");
const { isValidId } = require("./validate-id");
const router = express.Router();

router.get("/:id/documents/:documentId", async (req, res) => {
  const { id, documentId } = req.params;
  if (!isValidId(id) || !isValidId(documentId)) return res.sendStatus(404);
  const supplier = await Supplier.findOne({ _id: id, $or: [
    { "documents.id": documentId }, { "onboarding.pendingData.documents.id": documentId },
  ] }).select("_id");
  if (!supplier) return res.sendStatus(404);
  const document = await SupplierDocument.findOne({ _id: documentId, supplierId: id }).select("+data");
  if (!document) return res.sendStatus(404);
  res.set({ "Content-Type": "application/pdf", "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" });
  res.attachment(document.name);
  return res.send(document.data);
});

module.exports = router;
