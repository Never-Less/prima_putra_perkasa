const express = require("express");

const { Customer } = require("../../models/Customer");
const { Invoice } = require("../../models/Invoice");
const { syncPurchaseOrderByNoPo } = require("../../utils/sync-purchase-order-from-invoice");
const { getInvoiceNoPoList, sanitizeInvoice } = require("./sanitize-invoice");
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
    return res.status(400).json({ message: "Data invoice yang dipilih tidak dapat dibuka." });
  }

  const updates = {};

  if (req.body.tanggal !== undefined) {
    const tanggal = parseDate(req.body.tanggal);
    if (!tanggal) {
      return res.status(400).json({ message: "Tanggal invoice tidak dapat dibaca." });
    }
    updates.tanggal = tanggal;
  }

  if (req.body.noInvoice !== undefined) {
    updates.noInvoice = String(req.body.noInvoice || "").trim();
  }

  if (req.body.noPo !== undefined || req.body.noPoList !== undefined) {
    const noPoList = normalizeStringList(
      req.body.noPoList !== undefined ? req.body.noPoList : req.body.noPo,
      {
        maxLength: 100,
        splitOnComma: true,
      }
    );

    if (!noPoList) {
      return res.status(400).json({
        message: "Pilih minimal satu No. SO yang valid.",
      });
    }

    updates.noPo = noPoList.join(", ");
    updates.noPoList = noPoList;
  }

  if (req.body.noSuratJalan !== undefined) {
    const noSuratJalan = normalizeStringList(req.body.noSuratJalan, {
      allowEmpty: true,
      maxLength: 100,
    });

    if (noSuratJalan === null) {
      return res.status(400).json({
        message: "No. Surat Jalan yang dipilih tidak valid.",
      });
    }

    updates.noSuratJalan = noSuratJalan;
  }

  if (req.body.idCustomer !== undefined) {
    const idCustomer = String(req.body.idCustomer || "").trim();

    if (!isValidId(idCustomer)) {
      return res.status(400).json({ message: "Customer yang dipilih tidak valid." });
    }

    updates.idCustomer = idCustomer;
  }

  if (req.body.isPpn !== undefined) {
    const isPpn = parseBoolean(req.body.isPpn);

    if (isPpn === null) {
      return res.status(400).json({ message: "Status PPN tidak valid." });
    }

    updates.isPpn = isPpn;
  }

  if (req.body.isPaid !== undefined) {
    const isPaid = parseBoolean(req.body.isPaid);

    if (isPaid === null) {
      return res.status(400).json({ message: "Status pembayaran tidak valid." });
    }

    updates.isPaid = isPaid;
  }

  if (req.body.tanggalBayar !== undefined) {
    if (req.body.tanggalBayar === null) {
      updates.tanggalBayar = null;
    } else {
      const tanggalBayar = parseDate(req.body.tanggalBayar);

      if (!tanggalBayar) {
        return res.status(400).json({
          message: "Tanggal bayar tidak dapat dibaca. Periksa kembali tanggal yang diisi.",
        });
      }

      updates.tanggalBayar = tanggalBayar;
    }
  }

  if (req.body.ppnRate !== undefined) {
    const ppnRate = parseNumber(req.body.ppnRate);

    if (ppnRate === null || ppnRate < 0 || ppnRate > 100) {
      return res.status(400).json({
        message: "Tarif PPN harus berupa angka antara 0 sampai 100.",
      });
    }

    updates.ppnRate = ppnRate;
  }

  if (req.body.barang !== undefined) {
    const barang = normalizeBarangList(req.body.barang);
    if (!barang) {
      return res.status(400).json({
        message:
          "Isi minimal satu barang invoice dengan nama barang, qty, unit, dan harga satuan yang valid.",
      });
    }
    updates.barang = barang;
    updates.subtotal = calculateSubtotal(barang);
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({
      message: "Tidak ada perubahan yang bisa disimpan. Ubah minimal satu data terlebih dahulu.",
    });
  }

  if (
    (updates.noInvoice !== undefined && !updates.noInvoice) ||
    (updates.noPo !== undefined && !updates.noPo)
  ) {
    return res.status(400).json({
      message: "Lengkapi nomor invoice dan No. SO sebelum menyimpan.",
    });
  }

  try {
    const existingInvoice = await Invoice.findById(id);

    if (!existingInvoice) {
      return res.status(404).json({ message: "Data invoice tidak ditemukan." });
    }

    if (updates.idCustomer) {
      const customer = await Customer.findById(updates.idCustomer);
      if (!customer) {
        return res.status(404).json({ message: "Customer yang dipilih tidak ditemukan." });
      }
    }

    const effectiveSubtotal =
      updates.subtotal !== undefined ? updates.subtotal : existingInvoice.subtotal;
    const effectiveTanggal = updates.tanggal ?? existingInvoice.tanggal;
    const effectiveIsPaid = updates.isPaid ?? existingInvoice.isPaid ?? false;
    const effectiveTanggalBayar = effectiveIsPaid
      ? updates.tanggalBayar !== undefined
        ? updates.tanggalBayar
        : existingInvoice.tanggalBayar
      : null;
    const effectiveIsPpn = updates.isPpn ?? existingInvoice.isPpn ?? true;
    const effectivePpnRate = updates.ppnRate ?? existingInvoice.ppnRate ?? 11;

    if (!effectiveIsPaid) {
      updates.tanggalBayar = null;
    }

    if (effectiveIsPaid && !effectiveTanggalBayar) {
      return res.status(400).json({
        message: "Isi tanggal bayar sebelum menandai invoice sebagai lunas.",
      });
    }

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
      return res.status(404).json({ message: "Data invoice tidak ditemukan." });
    }

    const noPoSet = new Set([
      ...getInvoiceNoPoList(existingInvoice),
      ...getInvoiceNoPoList(invoice),
    ]);

    for (const noPoValue of noPoSet) {
      if (!noPoValue) {
        continue;
      }

      await syncPurchaseOrderByNoPo(noPoValue);
    }

    return res.json({
      message: "invoice updated",
      invoice: sanitizeInvoice(invoice),
    });
  } catch (_error) {
    return res.status(500).json({ message: "Data invoice belum bisa disimpan. Coba lagi." });
  }
});

module.exports = router;
