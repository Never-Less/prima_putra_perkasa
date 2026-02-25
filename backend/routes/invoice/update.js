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
  normalizeStringList,
  parseBoolean,
  parseDate,
  parseNumber,
} = require("./validators");

const router = express.Router();

router.put("/:id", async (req, res) => {
  const id = String(req.params.id || "");

  if (!isValidId(id)) {
    return res.status(400).json({ message: "invalid invoice id" });
  }

  const updates = {};

  if (req.body.Tanggal !== undefined) {
    const tanggal = parseDate(req.body.Tanggal);
    if (!tanggal) {
      return res.status(400).json({ message: "Tanggal tidak valid" });
    }
    updates.Tanggal = tanggal;
  }

  if (req.body.NoInvoice !== undefined) {
    updates.NoInvoice = String(req.body.NoInvoice || "").trim();
  }

  if (req.body.NoPO !== undefined) {
    updates.NoPO = String(req.body.NoPO || "").trim();
  }

  if (req.body.NoSuratJalan !== undefined) {
    const noSuratJalan = normalizeStringList(req.body.NoSuratJalan, {
      maxLength: 100,
    });

    if (!noSuratJalan) {
      return res.status(400).json({
        message: "NoSuratJalan harus array minimal 1 item string",
      });
    }

    updates.NoSuratJalan = noSuratJalan;
  }

  if (req.body.IdCustomer !== undefined) {
    const idcustomer = String(req.body.IdCustomer || "").trim();

    if (!isValidId(idcustomer)) {
      return res.status(400).json({ message: "IdCustomer tidak valid" });
    }

    updates.IdCustomer = idcustomer;
  }

  if (req.body.IsPpn !== undefined) {
    const isPpn = parseBoolean(req.body.IsPpn);

    if (isPpn === null) {
      return res.status(400).json({ message: "IsPpn harus boolean" });
    }

    updates.IsPpn = isPpn;
  }

  if (req.body.PpnRate !== undefined) {
    const ppnRate = parseNumber(req.body.PpnRate);

    if (ppnRate === null || ppnRate < 0 || ppnRate > 100) {
      return res.status(400).json({ message: "PpnRate harus angka 0 - 100" });
    }

    updates.PpnRate = ppnRate;
  }

  if (req.body.Barang !== undefined) {
    const barang = normalizeBarangList(req.body.Barang);
    if (!barang) {
      return res.status(400).json({
        message: "Barang harus array minimal 1 item (Kuantitas, Unit, HargaSatuan, Jumlah)",
      });
    }
    updates.Barang = barang;
    updates.Subtotal = calculateSubtotal(barang);
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({
      message:
        "minimal kirim salah satu field: Tanggal, NoInvoice, NoPO, NoSuratJalan, IdCustomer, Barang, IsPpn, PpnRate",
    });
  }

  if (
    (updates.NoInvoice !== undefined && !updates.NoInvoice) ||
    (updates.NoPO !== undefined && !updates.NoPO)
  ) {
    return res.status(400).json({
      message: "NoInvoice dan NoPO tidak boleh kosong",
    });
  }

  try {
    const existingInvoice = await Invoice.findById(id);

    if (!existingInvoice) {
      return res.status(404).json({ message: "invoice not found" });
    }

    if (updates.IdCustomer) {
      const customer = await Customer.findById(updates.IdCustomer);
      if (!customer) {
        return res.status(404).json({ message: "customer tidak ditemukan" });
      }
    }

    const effectiveSubtotal =
      updates.Subtotal !== undefined ? updates.Subtotal : existingInvoice.Subtotal;
    const effectiveIsPpn = updates.IsPpn ?? existingInvoice.IsPpn ?? true;
    const effectivePpnRate = updates.PpnRate ?? existingInvoice.PpnRate ?? 11;

    updates.Subtotal = effectiveSubtotal;
    updates.IsPpn = effectiveIsPpn;
    updates.PpnRate = effectivePpnRate;
    updates.PpnAmount = calculatePpnAmount(
      effectiveSubtotal,
      effectiveIsPpn,
      effectivePpnRate
    );

    updates.GrandTotal = calculateGrandTotal(effectiveSubtotal, updates.PpnAmount);

    const invoice = await Invoice.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    });

    if (!invoice) {
      return res.status(404).json({ message: "invoice not found" });
    }

    return res.json({
      message: "invoice updated",
      invoice: sanitizeInvoice(invoice),
    });
  } catch (_error) {
    return res.status(500).json({ message: "failed to update invoice" });
  }
});

module.exports = router;
