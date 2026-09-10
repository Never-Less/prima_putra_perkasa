const { validateInvoiceIntegrity } = require("../../utils/invoice-integrity");
const { documentMutation } = require("../../utils/document-mutation");
const express = require("express");

const { Customer } = require("../../models/Customer");
const { Invoice } = require("../../models/Invoice");
const { syncPurchaseOrderByNoPo } = require("../../utils/sync-purchase-order-from-invoice");
const { sanitizeInvoice } = require("./sanitize-invoice");
const {
  calculateGrandTotal,
  calculatePpnAmount,
  calculateSubtotal,
  isValidId,
  normalizeBarangList,
  normalizeStringList,
  parseBoolean,
  parseDate,
  parseNumber,
} = require("./validators");
const { calculateDueDate, normalizePaymentTerm } = require("../../utils/payment-term");

const router = express.Router();

router.post("/", documentMutation(async (req, res) => {
  const tanggal = parseDate(req.body.tanggal);
  const noInvoice = String(req.body.noInvoice || "").trim();
  const noPoList = normalizeStringList(
    req.body.noPoList !== undefined ? req.body.noPoList : req.body.noPo,
    {
      maxLength: 100,
      splitOnComma: true,
    }
  );
  const noPo = noPoList ? noPoList.join(", ") : "";
  const noSuratJalan = normalizeStringList(req.body.noSuratJalan, {
    allowEmpty: true,
    maxLength: 100,
  });
  const idCustomer = String(req.body.idCustomer || "").trim();
  const barang = normalizeBarangList(req.body.barang);
  const parsedIsPpn =
    req.body.isPpn !== undefined ? parseBoolean(req.body.isPpn) : true;
  const parsedIsPaid =
    req.body.isPaid !== undefined ? parseBoolean(req.body.isPaid) : false;
  const tanggalBayar =
    req.body.tanggalBayar === null || req.body.tanggalBayar === undefined
      ? null
      : parseDate(req.body.tanggalBayar);
  const parsedPpnRate =
    req.body.ppnRate !== undefined ? parseNumber(req.body.ppnRate) : 11;

  if (!tanggal || !noInvoice || !noPoList || noSuratJalan === null || !idCustomer) {
    return res.status(400).json({
      message:
        "Lengkapi tanggal, nomor invoice, No. SO, dan customer sebelum menyimpan.",
    });
  }

  if (!barang) {
    return res.status(400).json({
      message:
        "Isi minimal satu barang invoice dengan nama barang, qty, unit, dan harga satuan yang valid.",
    });
  }

  if (parsedIsPpn === null) {
    return res.status(400).json({ message: "Status PPN tidak valid." });
  }

  if (parsedIsPaid === null) {
    return res.status(400).json({ message: "Status pembayaran tidak valid." });
  }

  const hasTanggalBayarInput =
    req.body.tanggalBayar !== undefined &&
    req.body.tanggalBayar !== null &&
    String(req.body.tanggalBayar).trim() !== "";

  if (parsedIsPaid && !hasTanggalBayarInput) {
    return res.status(400).json({
      message: "Isi tanggal bayar sebelum menandai invoice sebagai lunas.",
    });
  }

  if (parsedIsPaid && !tanggalBayar) {
    return res.status(400).json({
      message: "Tanggal bayar tidak dapat dibaca. Periksa kembali tanggal yang diisi.",
    });
  }

  if (parsedPpnRate === null || parsedPpnRate < 0 || parsedPpnRate > 100) {
    return res.status(400).json({
      message: "Tarif PPN harus berupa angka antara 0 sampai 100.",
    });
  }

  if (!isValidId(idCustomer)) {
    return res.status(400).json({ message: "Customer yang dipilih tidak valid." });
  }

  const subtotal = calculateSubtotal(barang);
  const ppnAmount = calculatePpnAmount(subtotal, parsedIsPpn, parsedPpnRate);
  const grandTotal = calculateGrandTotal(subtotal, ppnAmount);

  try {
    const customer = await Customer.findById(idCustomer);
    if (!customer) {
      return res.status(404).json({ message: "Customer yang dipilih tidak ditemukan." });
    }

    const paymentTerm = normalizePaymentTerm(
      req.body.paymentTerm !== undefined ? req.body.paymentTerm : customer.defaultPaymentTerm
    );
    if (!paymentTerm) {
      return res.status(400).json({ message: "Term of payment invoice tidak valid." });
    }

    const integrityError = await validateInvoiceIntegrity({ noInvoice, noPoList, noSuratJalan, idCustomer, barang });
    if (integrityError) return res.status(409).json({ message: integrityError });

    const invoice = await Invoice.create({
      tanggal: tanggal,
      noInvoice: noInvoice,
      noPo: noPo,
      noPoList: noPoList,
      noSuratJalan: noSuratJalan,
      idCustomer: idCustomer,
      barang: barang,
      isPpn: parsedIsPpn,
      isPaid: parsedIsPaid,
      tanggalBayar: parsedIsPaid ? tanggalBayar : null,
      paymentTerm,
      dueDate: calculateDueDate(tanggal, paymentTerm),
      ppnRate: parsedPpnRate,
      ppnAmount: ppnAmount,
      subtotal: subtotal,
      grandTotal: grandTotal,
    });

    for (const noPoValue of noPoList) {
      await syncPurchaseOrderByNoPo(noPoValue);
    }

    return res.status(201).json({
      message: "invoice created",
      invoice: sanitizeInvoice(invoice),
    });
  } catch (_error) {
    if (_error?.hasErrorLabel?.("TransientTransactionError")) throw _error;
    return res.status(500).json({ message: "Data invoice belum bisa disimpan. Coba lagi." });
  }
}));

module.exports = router;
