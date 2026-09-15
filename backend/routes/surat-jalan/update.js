const { Invoice } = require("../../models/Invoice");
const { deliveryInvoiceQuery } = require("../../utils/invoice-integrity");
const { documentMutation } = require("../../utils/document-mutation");
const express = require("express");

const { isDocumentCorrectionModeEnabled } = require("../../config/document-validation");
const { Customer } = require("../../models/Customer");
const { SuratJalan } = require("../../models/SuratJalan");
const { sanitizeSuratJalan } = require("./sanitize-surat-jalan");
const { isValidId, parseBarangList, parseDate } = require("./validators");
const { validateDeliveryAgainstSalesOrder } = require("../../utils/delivery-validation");

const router = express.Router();

router.put("/:id", documentMutation(async (req, res) => {
  const id = String(req.params.id || "");

  if (!isValidId(id)) {
    return res.status(400).json({ message: "Data surat jalan yang dipilih tidak dapat dibuka." });
  }

  const updates = {};

  if (req.body.noSuratJalan !== undefined) {
    updates.noSuratJalan = String(req.body.noSuratJalan || "").trim();
  }

  if (req.body.noPo !== undefined) {
    updates.noPo = String(req.body.noPo || "").trim();
  }

  if (req.body.tanggal !== undefined) {
    const tanggal = parseDate(req.body.tanggal);
    if (!tanggal) {
      return res.status(400).json({ message: "Tanggal surat jalan tidak dapat dibaca." });
    }
    updates.tanggal = tanggal;
  }

  if (req.body.idCustomer !== undefined) {
    const idCustomer = String(req.body.idCustomer || "").trim();

    if (!isValidId(idCustomer)) {
      return res.status(400).json({ message: "Customer yang dipilih tidak valid." });
    }

    updates.idCustomer = idCustomer;
  }

  if (req.body.barang !== undefined) {
    const barangResult = parseBarangList(req.body.barang, {
      defaultKodeDepartemen: req.body.kodeDepartemen,
    });
    const barang = barangResult.barang;
    if (barangResult.error) {
      return res.status(400).json({ message: barangResult.error });
    }
    updates.barang = barang;
  }

  if (req.body.kendaraan !== undefined) {
    updates.kendaraan = String(req.body.kendaraan || "").trim();
  }


  if (Object.keys(updates).length === 0) {
    return res.status(400).json({
      message: "Tidak ada perubahan yang bisa disimpan. Ubah minimal satu data terlebih dahulu.",
    });
  }

  if (
    (updates.noSuratJalan !== undefined && !updates.noSuratJalan) ||
    (updates.noPo !== undefined && !updates.noPo) ||
    (updates.kendaraan !== undefined && !updates.kendaraan)
  ) {
    return res.status(400).json({
      message: "Lengkapi No. Surat Jalan, No. SO, dan kendaraan sebelum menyimpan.",
    });
  }

  try {
    const existingDocument = await SuratJalan.findById(id).lean();
    if (!existingDocument) return res.status(404).json({ message: "Data surat jalan tidak ditemukan." });
    if (
      !isDocumentCorrectionModeEnabled() &&
      await Invoice.countDocuments(deliveryInvoiceQuery(existingDocument)).collation({ locale: "en", strength: 2 })
    ) {
      return res.status(409).json({ message: "Surat Jalan tidak dapat dihapus atau direvisi selama masih terhubung ke Invoice. Hapus atau lepaskan referensi Invoice terlebih dahulu." });
    }
    if (updates.idCustomer) {
      const customer = await Customer.findById(updates.idCustomer);
      if (!customer) {
        return res.status(404).json({ message: "Customer yang dipilih tidak ditemukan." });
      }
    }

    if (updates.noSuratJalan) {
      const existingSuratJalan = await SuratJalan.findOne({
        noSuratJalan: updates.noSuratJalan,
        _id: { $ne: id },
      })
        .select("_id")
        .lean();

      if (existingSuratJalan) {
        return res.status(409).json({ message: "No. Surat Jalan ini sudah digunakan." });
      }
    }


    if (!isDocumentCorrectionModeEnabled()) {
      const deliveryError = await validateDeliveryAgainstSalesOrder({
        noPo: updates.noPo || existingDocument.noPo,
        customerId: updates.idCustomer || existingDocument.idCustomer,
        barang: updates.barang || existingDocument.barang,
        excludeSuratJalanId: id,
      });
      if (deliveryError) return res.status(409).json({ message: deliveryError });
    }

    const suratJalan = await SuratJalan.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    });

    if (!suratJalan) {
      return res.status(404).json({ message: "Data surat jalan tidak ditemukan." });
    }


    return res.json({
      message: "surat jalan updated",
      suratJalan: sanitizeSuratJalan(suratJalan),
    });
  } catch (error) {
    if (error?.hasErrorLabel?.("TransientTransactionError")) throw error;
    if (error?.code === 11000 && error?.keyPattern?.noSuratJalan) {
      return res.status(409).json({ message: "No. Surat Jalan ini sudah digunakan." });
    }

    return res.status(500).json({ message: "Data surat jalan belum bisa disimpan. Coba lagi." });
  }
}));

module.exports = router;
