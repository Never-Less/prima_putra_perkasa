const { documentMutation } = require("../../utils/document-mutation");
const express = require("express");

const { PurchaseOrder } = require("../../models/PurchaseOrder");
const { Invoice } = require("../../models/Invoice");
const { SuratJalan } = require("../../models/SuratJalan");
const { isValidId } = require("./validators");

const router = express.Router();

router.delete("/:id", documentMutation(async (req, res) => {
  const id = String(req.params.id || "");

  if (!isValidId(id)) {
    return res.status(400).json({ message: "invalid purchase order id" });
  }

  try {
    const existing = await PurchaseOrder.findById(id).lean();

    if (!existing) {
      return res.status(404).json({ message: "purchase order not found" });
    }

    const noPo = String(existing.noPo || "").trim();
    const suratJalanCount = await SuratJalan.countDocuments({ noPo }).collation({ locale: "en", strength: 2 });
    const invoiceCount = await Invoice.countDocuments({ $or: [{ noPoList: noPo }, { noPo }, { "barang.sources.noPo": noPo }, { "barang.noPoManual": noPo }] }).collation({ locale: "en", strength: 2 });
    if (suratJalanCount || invoiceCount) {
      return res.status(409).json({ message: `Sales Order tidak dapat dihapus karena terhubung ke ${suratJalanCount} Surat Jalan dan ${invoiceCount} Invoice.` });
    }

    const purchaseOrder = await PurchaseOrder.findByIdAndDelete(id);

    if (!purchaseOrder) {
      return res.status(404).json({ message: "purchase order not found" });
    }

    return res.json({
      message: "purchase order deleted",
    });
  } catch (_error) {
    if (_error?.hasErrorLabel?.("TransientTransactionError")) throw _error;
    return res.status(500).json({ message: "failed to delete purchase order" });
  }
}));

module.exports = router;
