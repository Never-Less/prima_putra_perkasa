const { Invoice } = require("../../models/Invoice");
const { deliveryInvoiceQuery } = require("../../utils/invoice-integrity");
const { documentMutation } = require("../../utils/document-mutation");
const express = require("express");

const { SuratJalan } = require("../../models/SuratJalan");
const { isValidId } = require("./validators");

const router = express.Router();

router.delete("/:id", documentMutation(async (req, res) => {
  const id = String(req.params.id || "");

  if (!isValidId(id)) {
    return res.status(400).json({ message: "invalid surat jalan id" });
  }

  try {
    const existingDocument = await SuratJalan.findById(id).lean();
    if (!existingDocument) return res.status(404).json({ message: "surat jalan not found" });
    if (await Invoice.countDocuments(deliveryInvoiceQuery(existingDocument)).collation({ locale: "en", strength: 2 })) {
      return res.status(409).json({ message: "Surat Jalan tidak dapat dihapus atau direvisi selama masih terhubung ke Invoice. Hapus atau lepaskan referensi Invoice terlebih dahulu." });
    }
    const suratJalan = await SuratJalan.findByIdAndDelete(id);

    if (!suratJalan) {
      return res.status(404).json({ message: "surat jalan not found" });
    }

    return res.json({
      message: "surat jalan deleted",
    });
  } catch (_error) {
    if (_error?.hasErrorLabel?.("TransientTransactionError")) throw _error;
    return res.status(500).json({ message: "failed to delete surat jalan" });
  }
}));

module.exports = router;
