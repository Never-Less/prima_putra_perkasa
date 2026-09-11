const { documentMutation } = require("../../utils/document-mutation");
const express = require("express");

const { Customer } = require("../../models/Customer");
const { Invoice } = require("../../models/Invoice");
const { SuratJalan } = require("../../models/SuratJalan");
const { PurchaseOrder } = require("../../models/PurchaseOrder");
const { sanitizePurchaseOrder } = require("./sanitize-purchase-order");
const {
  calculateBarangSubtotal,
  isValidId,
  parseBarangList,
  parseDate,
  parseNumber,
} = require("./validators");
const { normalizePaymentTerm } = require("../../utils/payment-term");

const router = express.Router();

router.put("/:id", documentMutation(async (req, res) => {
  const id = String(req.params.id || "");

  if (!isValidId(id)) {
    return res.status(400).json({ message: "Data sales order yang dipilih tidak dapat dibuka." });
  }

  try {
    const existingPurchaseOrder = await PurchaseOrder.findById(id);

    if (!existingPurchaseOrder) {
      return res.status(404).json({ message: "Data sales order tidak ditemukan." });
    }

    const updates = {};

    if (req.body.noPo !== undefined) {
      updates.noPo = String(req.body.noPo || "").trim();
    }

    if (req.body.tanggalPo !== undefined) {
      const tanggalPo = parseDate(req.body.tanggalPo);

      if (!tanggalPo) {
        return res.status(400).json({ message: "Tanggal SO tidak dapat dibaca." });
      }

      updates.tanggalPo = tanggalPo;
    }

    if (req.body.namaCustomer !== undefined) {
      const namaCustomer = String(req.body.namaCustomer || "").trim();

      if (!isValidId(namaCustomer)) {
        return res.status(400).json({ message: "Customer yang dipilih tidak valid." });
      }

      updates.namaCustomer = namaCustomer;
    }

    if (req.body.nominalPo !== undefined) {
      const nominalPo = parseNumber(req.body.nominalPo);

      if (nominalPo === null || nominalPo < 0) {
        return res.status(400).json({ message: "Nominal SO harus berupa angka 0 atau lebih." });
      }

      updates.nominalPo = nominalPo;
    }

    if (req.body.barang !== undefined) {
      const barangResult = parseBarangList(req.body.barang);
      const barang = barangResult.barang;

      if (barangResult.error) {
        return res.status(400).json({ message: barangResult.error });
      }

      updates.barang = barang;
      updates.nominalPo = calculateBarangSubtotal(barang);
    }

    if (req.body.paymentTerm !== undefined) {
      const paymentTerm = normalizePaymentTerm(req.body.paymentTerm);
      if (!paymentTerm) {
        return res.status(400).json({ message: "Term of payment sales order tidak valid." });
      }
      updates.paymentTerm = paymentTerm;
    }

    if (req.body.tanggalInvoice !== undefined) {
      if (req.body.tanggalInvoice === null) {
        updates.tanggalInvoice = null;
      } else {
        const tanggalInvoice = parseDate(req.body.tanggalInvoice);

        if (!tanggalInvoice) {
          return res.status(400).json({ message: "Tanggal invoice tidak dapat dibaca." });
        }

        updates.tanggalInvoice = tanggalInvoice;
      }
    }

    if (req.body.noInvoice !== undefined) {
      if (req.body.noInvoice === null) {
        updates.noInvoice = null;
      } else {
        const noInvoice = String(req.body.noInvoice || "").trim();

        if (!isValidId(noInvoice)) {
          return res.status(400).json({ message: "Invoice yang dipilih tidak valid." });
        }

        updates.noInvoice = noInvoice;
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        message: "Tidak ada perubahan yang bisa disimpan. Ubah minimal satu data terlebih dahulu.",
      });
    }

    if (updates.noPo !== undefined && !updates.noPo) {
      return res.status(400).json({ message: "Isi No. SO sebelum menyimpan." });
    }

    if (updates.noPo !== undefined) {
      const duplicateNoPo = await PurchaseOrder.findOne({
        _id: { $ne: id },
        noPo: updates.noPo,
      })
        .collation({ locale: "en", strength: 2 })
        .select("_id")
        .lean();

      if (duplicateNoPo) {
        return res.status(409).json({ message: `No. SO "${updates.noPo}" sudah digunakan.` });
      }
    }

    if (updates.namaCustomer) {
      const customer = await Customer.findById(updates.namaCustomer);

      if (!customer) {
        return res.status(404).json({ message: "Customer yang dipilih tidak ditemukan." });
      }
    }

    if (updates.noInvoice) {
      const invoice = await Invoice.findById(updates.noInvoice);

      if (!invoice) {
        return res.status(404).json({ message: "Invoice yang dipilih tidak ditemukan." });
      }
    }

    const operationalFields = Object.keys(updates);
    const comparable = (value) => JSON.stringify(value?.toObject ? value.toObject() : value);
    const hasOperationalChanges = operationalFields.some(
      (field) => updates[field] !== undefined && comparable(existingPurchaseOrder[field]) !== comparable(updates[field])
    );
    const revisionImpact = null;

    if (hasOperationalChanges) {
      const existingNoPo = String(existingPurchaseOrder.noPo || "").trim();
      const affectedSuratJalan = await SuratJalan.countDocuments({ noPo: existingNoPo }).collation({ locale: "en", strength: 2 });
      const affectedInvoices = await Invoice.countDocuments({ $or: [{ noPoList: existingNoPo }, { noPo: existingNoPo }, { "barang.sources.noPo": existingNoPo }, { "barang.noPoManual": existingNoPo }] }).collation({ locale: "en", strength: 2 });
      if (affectedSuratJalan > 0 || affectedInvoices > 0) {
        return res.status(409).json({ message: "Sales Order tidak dapat direvisi selama masih terhubung ke Surat Jalan atau Invoice. Hapus atau lepaskan dokumen turunan terlebih dahulu, mulai dari Invoice." });
      }
    }

    Object.assign(existingPurchaseOrder, updates);
    const purchaseOrder = await existingPurchaseOrder.save();

    if (!purchaseOrder) {
      return res.status(404).json({ message: "Data sales order tidak ditemukan." });
    }

    return res.json({
      message: "purchase order updated",
      purchaseOrder: sanitizePurchaseOrder(purchaseOrder),
      revisionImpact,
    });
  } catch (error) {
    if (error?.hasErrorLabel?.("TransientTransactionError")) throw error;
    if (error?.code === 11000) {
      return res.status(409).json({ message: "No. SO tersebut sudah digunakan." });
    }

    return res.status(500).json({ message: "Data sales order belum bisa disimpan. Coba lagi." });
  }
}));

module.exports = router;
