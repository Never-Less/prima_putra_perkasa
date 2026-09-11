const { documentMutation } = require("../../utils/document-mutation");
const express = require("express");

const { Customer } = require("../../models/Customer");
const { Invoice } = require("../../models/Invoice");
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

router.post("/", documentMutation(async (req, res) => {
  const noPo = String(req.body.noPo || "").trim();
  const tanggalPo = parseDate(req.body.tanggalPo);
  const namaCustomer = String(req.body.namaCustomer || "").trim();
  const barangResult = parseBarangList(req.body.barang);
  const barang = barangResult.barang;
  const parsedNominalPo = parseNumber(req.body.nominalPo);
  const nominalPo =
    barang && barang.length > 0
      ? calculateBarangSubtotal(barang)
      : parsedNominalPo;
  const tanggalInvoice =
    req.body.tanggalInvoice === null
      ? null
      : req.body.tanggalInvoice !== undefined
        ? parseDate(req.body.tanggalInvoice)
        : null;
  const noInvoice =
    req.body.noInvoice === null || req.body.noInvoice === undefined
      ? null
      : String(req.body.noInvoice || "").trim();

  if (barangResult.error) {
    return res.status(400).json({ message: barangResult.error });
  }

  if (!noPo || !tanggalPo || !namaCustomer || nominalPo === null) {
    return res.status(400).json({
      message: "Lengkapi No. SO, tanggal SO, customer, dan nominal SO sebelum menyimpan.",
    });
  }

  if (nominalPo < 0) {
    return res.status(400).json({ message: "Nominal SO harus berupa angka 0 atau lebih." });
  }

  if (!isValidId(namaCustomer)) {
    return res.status(400).json({ message: "Customer yang dipilih tidak valid." });
  }

  if (req.body.tanggalInvoice !== undefined && req.body.tanggalInvoice !== null && !tanggalInvoice) {
    return res.status(400).json({ message: "Tanggal invoice tidak dapat dibaca." });
  }

  if (noInvoice !== null && !isValidId(noInvoice)) {
    return res.status(400).json({ message: "Invoice yang dipilih tidak valid." });
  }

  try {
    const existingNoPo = await PurchaseOrder.findOne({ noPo })
      .collation({ locale: "en", strength: 2 })
      .select("_id")
      .lean();

    if (existingNoPo) {
      return res.status(409).json({ message: `No. SO "${noPo}" sudah digunakan.` });
    }

    const customer = await Customer.findById(namaCustomer);

    if (!customer) {
      return res.status(404).json({ message: "Customer yang dipilih tidak ditemukan." });
    }

    const paymentTerm = normalizePaymentTerm(
      req.body.paymentTerm !== undefined ? req.body.paymentTerm : customer.defaultPaymentTerm
    );
    if (!paymentTerm) {
      return res.status(400).json({ message: "Term of payment sales order tidak valid." });
    }

    if (noInvoice) {
      const invoice = await Invoice.findById(noInvoice);

      if (!invoice) {
        return res.status(404).json({ message: "Invoice yang dipilih tidak ditemukan." });
      }
    }

    const purchaseOrder = await PurchaseOrder.create({
      noPo: noPo,
      tanggalPo: tanggalPo,
      namaCustomer: namaCustomer,
      nominalPo: nominalPo,
      barang: barang,
      paymentTerm,
      tanggalInvoice: tanggalInvoice,
      noInvoice: noInvoice,
    });

    return res.status(201).json({
      message: "purchase order created",
      purchaseOrder: sanitizePurchaseOrder(purchaseOrder),
    });
  } catch (error) {
    if (error?.hasErrorLabel?.("TransientTransactionError")) throw error;
    if (error?.code === 11000) {
      return res.status(409).json({ message: `No. SO "${noPo}" sudah digunakan.` });
    }

    return res.status(500).json({ message: "Data sales order belum bisa disimpan. Coba lagi." });
  }
}));

module.exports = router;
