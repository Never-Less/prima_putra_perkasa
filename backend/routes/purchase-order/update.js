const express = require("express");

const { Customer } = require("../../models/Customer");
const { Invoice } = require("../../models/Invoice");
const { PurchaseOrder } = require("../../models/PurchaseOrder");
const { sanitizePurchaseOrder } = require("./sanitize-purchase-order");
const { isValidId, parseBoolean, parseDate, parseNumber } = require("./validators");

const router = express.Router();

router.put("/:id", async (req, res) => {
  const id = String(req.params.id || "");

  if (!isValidId(id)) {
    return res.status(400).json({ message: "invalid purchase order id" });
  }

  try {
    const existingPurchaseOrder = await PurchaseOrder.findById(id);

    if (!existingPurchaseOrder) {
      return res.status(404).json({ message: "purchase order not found" });
    }

    const updates = {};

    if (req.body.noPo !== undefined) {
      updates.noPo = String(req.body.noPo || "").trim();
    }

    if (req.body.tanggalPo !== undefined) {
      const tanggalPo = parseDate(req.body.tanggalPo);

      if (!tanggalPo) {
        return res.status(400).json({ message: "tanggalPo tidak valid" });
      }

      updates.tanggalPo = tanggalPo;
    }

    if (req.body.namaCustomer !== undefined) {
      const namaCustomer = String(req.body.namaCustomer || "").trim();

      if (!isValidId(namaCustomer)) {
        return res.status(400).json({ message: "namaCustomer tidak valid" });
      }

      updates.namaCustomer = namaCustomer;
    }

    if (req.body.nominalPo !== undefined) {
      const nominalPo = parseNumber(req.body.nominalPo);

      if (nominalPo === null || nominalPo < 0) {
        return res.status(400).json({ message: "nominalPo harus angka >= 0" });
      }

      updates.nominalPo = nominalPo;
    }

    if (req.body.isPaid !== undefined) {
      const isPaid = parseBoolean(req.body.isPaid);

      if (isPaid === null) {
        return res.status(400).json({ message: "isPaid harus boolean" });
      }

      updates.isPaid = isPaid;
    }

    if (req.body.tanggalBayar !== undefined) {
      if (req.body.tanggalBayar === null) {
        updates.tanggalBayar = null;
      } else {
        const tanggalBayar = parseDate(req.body.tanggalBayar);

        if (!tanggalBayar) {
          return res.status(400).json({ message: "tanggalBayar tidak valid" });
        }

        updates.tanggalBayar = tanggalBayar;
      }
    }

    if (req.body.tanggalInvoice !== undefined) {
      if (req.body.tanggalInvoice === null) {
        updates.tanggalInvoice = null;
      } else {
        const tanggalInvoice = parseDate(req.body.tanggalInvoice);

        if (!tanggalInvoice) {
          return res.status(400).json({ message: "tanggalInvoice tidak valid" });
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
          return res.status(400).json({ message: "noInvoice tidak valid" });
        }

        updates.noInvoice = noInvoice;
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        message:
          "minimal kirim salah satu field: noPo, tanggalPo, namaCustomer, nominalPo, isPaid, tanggalBayar, tanggalInvoice, noInvoice",
      });
    }

    if (updates.noPo !== undefined && !updates.noPo) {
      return res.status(400).json({ message: "noPo tidak boleh kosong" });
    }

    if (updates.namaCustomer) {
      const customer = await Customer.findById(updates.namaCustomer);

      if (!customer) {
        return res.status(404).json({ message: "customer tidak ditemukan" });
      }
    }

    if (updates.noInvoice) {
      const invoice = await Invoice.findById(updates.noInvoice);

      if (!invoice) {
        return res.status(404).json({ message: "invoice tidak ditemukan" });
      }
    }

    const effectiveTanggalPo = updates.tanggalPo ?? existingPurchaseOrder.tanggalPo;
    const effectiveTanggalBayar =
      updates.tanggalBayar !== undefined ? updates.tanggalBayar : existingPurchaseOrder.tanggalBayar;

    if (effectiveTanggalBayar && effectiveTanggalBayar < effectiveTanggalPo) {
      return res.status(400).json({
        message: "tanggalBayar tidak boleh lebih kecil dari tanggalPo",
      });
    }

    const purchaseOrder = await PurchaseOrder.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    });

    if (!purchaseOrder) {
      return res.status(404).json({ message: "purchase order not found" });
    }

    return res.json({
      message: "purchase order updated",
      purchaseOrder: sanitizePurchaseOrder(purchaseOrder),
    });
  } catch (_error) {
    return res.status(500).json({ message: "failed to update purchase order" });
  }
});

module.exports = router;
