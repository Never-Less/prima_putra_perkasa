const express = require("express");

const { Customer } = require("../../models/Customer");
const { Invoice } = require("../../models/Invoice");
const { PurchaseOrder } = require("../../models/PurchaseOrder");
const { sanitizePurchaseOrder } = require("./sanitize-purchase-order");
const { isValidId, parseBoolean, parseDate, parseNumber } = require("./validators");

const router = express.Router();

router.post("/", async (req, res) => {
  const noPo = String(req.body.noPo || "").trim();
  const tanggalPo = parseDate(req.body.tanggalPo);
  const namaCustomer = String(req.body.namaCustomer || "").trim();
  const nominalPo = parseNumber(req.body.nominalPo);
  const parsedIsPaid =
    req.body.isPaid !== undefined ? parseBoolean(req.body.isPaid) : false;
  const tanggalBayar =
    req.body.tanggalBayar === null
      ? null
      : req.body.tanggalBayar !== undefined
        ? parseDate(req.body.tanggalBayar)
        : null;
  const tanggalKirim =
    req.body.tanggalKirim === null
      ? null
      : req.body.tanggalKirim !== undefined
        ? parseDate(req.body.tanggalKirim)
        : null;
  const noInvoice =
    req.body.noInvoice === null || req.body.noInvoice === undefined
      ? null
      : String(req.body.noInvoice || "").trim();

  if (!noPo || !tanggalPo || !namaCustomer || nominalPo === null) {
    return res.status(400).json({
      message: "noPo, tanggalPo, namaCustomer, dan nominalPo wajib diisi",
    });
  }

  if (parsedIsPaid === null) {
    return res.status(400).json({ message: "isPaid harus boolean" });
  }

  if (nominalPo < 0) {
    return res.status(400).json({ message: "nominalPo harus angka >= 0" });
  }

  if (!isValidId(namaCustomer)) {
    return res.status(400).json({ message: "namaCustomer tidak valid" });
  }

  if (req.body.tanggalBayar !== undefined && req.body.tanggalBayar !== null && !tanggalBayar) {
    return res.status(400).json({ message: "tanggalBayar tidak valid" });
  }

  if (req.body.tanggalKirim !== undefined && req.body.tanggalKirim !== null && !tanggalKirim) {
    return res.status(400).json({ message: "tanggalKirim tidak valid" });
  }

  if (noInvoice !== null && !isValidId(noInvoice)) {
    return res.status(400).json({ message: "noInvoice tidak valid" });
  }

  if (tanggalBayar && tanggalBayar < tanggalPo) {
    return res.status(400).json({
      message: "tanggalBayar tidak boleh lebih kecil dari tanggalPo",
    });
  }

  try {
    const customer = await Customer.findById(namaCustomer);

    if (!customer) {
      return res.status(404).json({ message: "customer tidak ditemukan" });
    }

    if (noInvoice) {
      const invoice = await Invoice.findById(noInvoice);

      if (!invoice) {
        return res.status(404).json({ message: "invoice tidak ditemukan" });
      }
    }

    const purchaseOrder = await PurchaseOrder.create({
      noPo: noPo,
      tanggalPo: tanggalPo,
      namaCustomer: namaCustomer,
      nominalPo: nominalPo,
      isPaid: parsedIsPaid,
      tanggalBayar: tanggalBayar,
      tanggalKirim: tanggalKirim,
      noInvoice: noInvoice,
    });

    return res.status(201).json({
      message: "purchase order created",
      purchaseOrder: sanitizePurchaseOrder(purchaseOrder),
    });
  } catch (_error) {
    return res.status(500).json({ message: "failed to create purchase order" });
  }
});

module.exports = router;
