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

const router = express.Router();

router.post("/", async (req, res) => {
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

  if (!tanggal || !noInvoice || !noPoList || !noSuratJalan || !idCustomer) {
    return res.status(400).json({
      message: "tanggal, noInvoice, noPo, noSuratJalan, dan idCustomer wajib diisi",
    });
  }

  if (!barang) {
    return res.status(400).json({
      message:
        "barang harus array minimal 1 item (namaBarang, spesifikasi, kuantitas, unit, hargaSatuan, jumlah)",
    });
  }

  if (parsedIsPpn === null) {
    return res.status(400).json({ message: "isPpn harus boolean" });
  }

  if (parsedIsPaid === null) {
    return res.status(400).json({ message: "isPaid harus boolean" });
  }

  if (parsedIsPaid && req.body.tanggalBayar !== undefined && req.body.tanggalBayar !== null && !tanggalBayar) {
    return res.status(400).json({ message: "tanggalBayar tidak valid" });
  }

  if (parsedIsPaid && tanggalBayar && tanggalBayar < tanggal) {
    return res.status(400).json({
      message: "tanggalBayar tidak boleh lebih kecil dari tanggal invoice",
    });
  }

  if (parsedPpnRate === null || parsedPpnRate < 0 || parsedPpnRate > 100) {
    return res.status(400).json({ message: "ppnRate harus angka 0 - 100" });
  }

  if (!isValidId(idCustomer)) {
    return res.status(400).json({ message: "idCustomer tidak valid" });
  }

  const subtotal = calculateSubtotal(barang);
  const ppnAmount = calculatePpnAmount(subtotal, parsedIsPpn, parsedPpnRate);
  const grandTotal = calculateGrandTotal(subtotal, ppnAmount);

  try {
    const customer = await Customer.findById(idCustomer);
    if (!customer) {
      return res.status(404).json({ message: "customer tidak ditemukan" });
    }

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
    return res.status(500).json({ message: "failed to create invoice" });
  }
});

module.exports = router;
