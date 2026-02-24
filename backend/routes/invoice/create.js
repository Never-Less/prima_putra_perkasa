const express = require("express");

const { Customer } = require("../../models/Customer");
const { Invoice } = require("../../models/Invoice");
const { sanitizeInvoice } = require("./sanitize-invoice");
const {
  calculateGrandTotal,
  calculatePpnAmount,
  calculateSubtotal,
  isValidId,
  normalizeBarangList,
  parseBoolean,
  parseDate,
  parseNumber,
} = require("./validators");

const router = express.Router();

router.post("/", async (req, res) => {
  const tanggal = parseDate(req.body.Tanggal);
  const noinvoice = String(req.body.NoInvoice || "").trim();
  const nopo = String(req.body.NoPO || "").trim();
  const nosuratjalan = String(req.body.NoSuratJalan || "").trim();
  const idcustomer = String(req.body.IdCustomer || "").trim();
  const barang = normalizeBarangList(req.body.Barang);
  const parsedIsPpn =
    req.body.IsPpn !== undefined ? parseBoolean(req.body.IsPpn) : true;
  const parsedPpnRate =
    req.body.PpnRate !== undefined ? parseNumber(req.body.PpnRate) : 11;

  if (!tanggal || !noinvoice || !nopo || !nosuratjalan || !idcustomer || !barang) {
    return res.status(400).json({
      message: "Tanggal, NoInvoice, NoPO, NoSuratJalan, IdCustomer, dan Barang wajib diisi",
    });
  }

  if (parsedIsPpn === null) {
    return res.status(400).json({ message: "IsPpn harus boolean" });
  }

  if (parsedPpnRate === null || parsedPpnRate < 0 || parsedPpnRate > 100) {
    return res.status(400).json({ message: "PpnRate harus angka 0 - 100" });
  }

  if (!isValidId(idcustomer)) {
    return res.status(400).json({ message: "IdCustomer tidak valid" });
  }

  const subtotal = calculateSubtotal(barang);
  const ppnAmount = calculatePpnAmount(subtotal, parsedIsPpn, parsedPpnRate);
  const grandtotal = calculateGrandTotal(subtotal, ppnAmount);

  try {
    const customer = await Customer.findById(idcustomer);
    if (!customer) {
      return res.status(404).json({ message: "customer tidak ditemukan" });
    }

    const invoice = await Invoice.create({
      Tanggal: tanggal,
      NoInvoice: noinvoice,
      NoPO: nopo,
      NoSuratJalan: nosuratjalan,
      IdCustomer: idcustomer,
      Barang: barang,
      IsPpn: parsedIsPpn,
      PpnRate: parsedPpnRate,
      PpnAmount: ppnAmount,
      Subtotal: subtotal,
      GrandTotal: grandtotal,
    });

    return res.status(201).json({
      message: "invoice created",
      invoice: sanitizeInvoice(invoice),
    });
  } catch (_error) {
    return res.status(500).json({ message: "failed to create invoice" });
  }
});

module.exports = router;
