const express = require("express");

const { Customer } = require("../../models/Customer");
const { Invoice } = require("../../models/Invoice");
const { PurchaseOrder } = require("../../models/PurchaseOrder");
const { sanitizePurchaseOrder } = require("./sanitize-purchase-order");
const { isValidId, parseDate, parseNumber } = require("./validators");

const router = express.Router();

router.post("/", async (req, res) => {
  const noPo = String(req.body.noPo || "").trim();
  const tanggalPo = parseDate(req.body.tanggalPo);
  const namaCustomer = String(req.body.namaCustomer || "").trim();
  const nominalPo = parseNumber(req.body.nominalPo);
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

  if (!noPo || !tanggalPo || !namaCustomer || nominalPo === null) {
    return res.status(400).json({
      message: "noPo, tanggalPo, namaCustomer, dan nominalPo wajib diisi",
    });
  }

  if (nominalPo < 0) {
    return res.status(400).json({ message: "nominalPo harus angka >= 0" });
  }

  if (!isValidId(namaCustomer)) {
    return res.status(400).json({ message: "namaCustomer tidak valid" });
  }

  if (req.body.tanggalInvoice !== undefined && req.body.tanggalInvoice !== null && !tanggalInvoice) {
    return res.status(400).json({ message: "tanggalInvoice tidak valid" });
  }

  if (noInvoice !== null && !isValidId(noInvoice)) {
    return res.status(400).json({ message: "noInvoice tidak valid" });
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
      tanggalInvoice: tanggalInvoice,
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
