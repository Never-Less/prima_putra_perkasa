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

  if (req.body.tanggal !== undefined) {
    const tanggal = parseDate(req.body.tanggal);
    if (!tanggal) {
      return res.status(400).json({ message: "tanggal tidak valid" });
    }
    updates.tanggal = tanggal;
  }

  if (req.body.noInvoice !== undefined) {
    updates.noInvoice = String(req.body.noInvoice || "").trim();
  }

  if (req.body.noPo !== undefined) {
    updates.noPo = String(req.body.noPo || "").trim();
  }

  if (req.body.noSuratJalan !== undefined) {
    const noSuratJalan = normalizeStringList(req.body.noSuratJalan, {
      maxLength: 100,
    });

    if (!noSuratJalan) {
      return res.status(400).json({
        message: "noSuratJalan harus array minimal 1 item string",
      });
    }

    updates.noSuratJalan = noSuratJalan;
  }

  if (req.body.idCustomer !== undefined) {
    const idCustomer = String(req.body.idCustomer || "").trim();

    if (!isValidId(idCustomer)) {
      return res.status(400).json({ message: "idCustomer tidak valid" });
    }

    updates.idCustomer = idCustomer;
  }

  if (req.body.isPpn !== undefined) {
    const isPpn = parseBoolean(req.body.isPpn);

    if (isPpn === null) {
      return res.status(400).json({ message: "isPpn harus boolean" });
    }

    updates.isPpn = isPpn;
  }

  if (req.body.ppnRate !== undefined) {
    const ppnRate = parseNumber(req.body.ppnRate);

    if (ppnRate === null || ppnRate < 0 || ppnRate > 100) {
      return res.status(400).json({ message: "ppnRate harus angka 0 - 100" });
    }

    updates.ppnRate = ppnRate;
  }

  if (req.body.barang !== undefined) {
    const barang = normalizeBarangList(req.body.barang);
    if (!barang) {
      return res.status(400).json({
        message:
          "barang harus array minimal 1 item (namaBarang, kuantitas, unit, hargaSatuan, jumlah)",
      });
    }
    updates.barang = barang;
    updates.subtotal = calculateSubtotal(barang);
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({
      message:
        "minimal kirim salah satu field: tanggal, noInvoice, noPo, noSuratJalan, idCustomer, barang, isPpn, ppnRate",
    });
  }

  if (
    (updates.noInvoice !== undefined && !updates.noInvoice) ||
    (updates.noPo !== undefined && !updates.noPo)
  ) {
    return res.status(400).json({
      message: "noInvoice dan noPo tidak boleh kosong",
    });
  }

  try {
    const existingInvoice = await Invoice.findById(id);

    if (!existingInvoice) {
      return res.status(404).json({ message: "invoice not found" });
    }

    if (updates.idCustomer) {
      const customer = await Customer.findById(updates.idCustomer);
      if (!customer) {
        return res.status(404).json({ message: "customer tidak ditemukan" });
      }
    }

    const effectiveSubtotal =
      updates.subtotal !== undefined ? updates.subtotal : existingInvoice.subtotal;
    const effectiveIsPpn = updates.isPpn ?? existingInvoice.isPpn ?? true;
    const effectivePpnRate = updates.ppnRate ?? existingInvoice.ppnRate ?? 11;

    updates.subtotal = effectiveSubtotal;
    updates.isPpn = effectiveIsPpn;
    updates.ppnRate = effectivePpnRate;
    updates.ppnAmount = calculatePpnAmount(
      effectiveSubtotal,
      effectiveIsPpn,
      effectivePpnRate
    );

    updates.grandTotal = calculateGrandTotal(effectiveSubtotal, updates.ppnAmount);

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
