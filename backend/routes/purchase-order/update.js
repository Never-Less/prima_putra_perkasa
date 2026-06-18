const express = require("express");

const { Customer } = require("../../models/Customer");
const { Invoice } = require("../../models/Invoice");
const { PurchaseOrder } = require("../../models/PurchaseOrder");
const { sanitizePurchaseOrder } = require("./sanitize-purchase-order");
const {
  calculateBarangSubtotal,
  isValidId,
  normalizeBarangList,
  parseDate,
  parseNumber,
} = require("./validators");

const router = express.Router();

router.put("/:id", async (req, res) => {
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
      const barang = normalizeBarangList(req.body.barang);

      if (!barang) {
        return res.status(400).json({
          message:
            "Isi barang sales order dengan nama barang, qty, unit, dan harga satuan yang valid.",
        });
      }

      updates.barang = barang;

      if (req.body.nominalPo === undefined) {
        updates.nominalPo = calculateBarangSubtotal(barang);
      }
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

    const purchaseOrder = await PurchaseOrder.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    });

    if (!purchaseOrder) {
      return res.status(404).json({ message: "Data sales order tidak ditemukan." });
    }

    return res.json({
      message: "purchase order updated",
      purchaseOrder: sanitizePurchaseOrder(purchaseOrder),
    });
  } catch (_error) {
    return res.status(500).json({ message: "Data sales order belum bisa disimpan. Coba lagi." });
  }
});

module.exports = router;
