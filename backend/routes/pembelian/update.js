const express = require("express");

const { Invoice } = require("../../models/Invoice");
const { Pembelian } = require("../../models/Pembelian");
const { Supplier } = require("../../models/Supplier");
const { sanitizePembelian } = require("./sanitize-pembelian");
const { isValidId, parseBoolean, parseDate, parseNumber } = require("./validators");

const router = express.Router();

router.put("/:id", async (req, res) => {
  const id = String(req.params.id || "");

  if (!isValidId(id)) {
    return res.status(400).json({ message: "Data pembelian yang dipilih tidak dapat dibuka." });
  }

  try {
    const existingPembelian = await Pembelian.findById(id);

    if (!existingPembelian) {
      return res.status(404).json({ message: "Data pembelian tidak ditemukan." });
    }

    const updates = {};

    if (req.body.tanggalNota !== undefined) {
      const tanggalNota = parseDate(req.body.tanggalNota);
      if (!tanggalNota) {
        return res.status(400).json({ message: "Tanggal nota tidak dapat dibaca." });
      }
      updates.tanggalNota = tanggalNota;
    }

    if (req.body.namaSupplier !== undefined) {
      updates.namaSupplier = String(req.body.namaSupplier || "").trim();
    }

    if (req.body.idSupplier !== undefined) {
      if (req.body.idSupplier === null) {
        updates.idSupplier = null;
      } else {
        const idSupplier = String(req.body.idSupplier || "").trim();

        if (!idSupplier) {
          updates.idSupplier = null;
        } else if (!isValidId(idSupplier)) {
          return res.status(400).json({ message: "Supplier yang dipilih tidak valid." });
        } else {
          updates.idSupplier = idSupplier;
        }
      }
    }

    if (req.body.noNota !== undefined) {
      updates.noNota = String(req.body.noNota || "").trim();
    }

    if (req.body.note !== undefined) {
      updates.note = String(req.body.note || "").trim();
    }

    if (req.body.idInvoice !== undefined) {
      if (req.body.idInvoice === null) {
        updates.idInvoice = null;
      } else {
        const idInvoice = String(req.body.idInvoice || "").trim();

        if (!isValidId(idInvoice)) {
          return res.status(400).json({ message: "Invoice yang dipilih tidak valid." });
        }

        updates.idInvoice = idInvoice;
      }
    }

    if (req.body.hutang !== undefined) {
      const hutang = parseBoolean(req.body.hutang);
      if (hutang === null) {
        return res.status(400).json({ message: "Status hutang tidak valid." });
      }
      updates.hutang = hutang;
    }

    if (req.body.ppn !== undefined) {
      const ppn = parseBoolean(req.body.ppn);
      if (ppn === null) {
        return res.status(400).json({ message: "Status PPN tidak valid." });
      }
      updates.ppn = ppn;
    }

    if (req.body.lamaHutang !== undefined) {
      const lamaHutang = parseNumber(req.body.lamaHutang);
      if (lamaHutang === null) {
        return res.status(400).json({ message: "Lama hutang harus berupa angka." });
      }
      updates.lamaHutang = lamaHutang;
    }

    if (req.body.nilaiNota !== undefined) {
      const nilaiNota = parseNumber(req.body.nilaiNota);
      if (nilaiNota === null || nilaiNota < 0) {
        return res.status(400).json({ message: "Nilai nota harus berupa angka 0 atau lebih." });
      }
      updates.nilaiNota = nilaiNota;
    }

    if (req.body.tanggalJatuhTempo !== undefined) {
      if (req.body.tanggalJatuhTempo === null) {
        updates.tanggalJatuhTempo = null;
      } else {
        const tanggalJatuhTempo = parseDate(req.body.tanggalJatuhTempo);
        if (!tanggalJatuhTempo) {
          return res.status(400).json({ message: "Tanggal jatuh tempo tidak dapat dibaca." });
        }
        updates.tanggalJatuhTempo = tanggalJatuhTempo;
      }
    }

    if (req.body.tanggalBayar !== undefined) {
      if (req.body.tanggalBayar === null) {
        updates.tanggalBayar = null;
      } else {
        const tanggalBayar = parseDate(req.body.tanggalBayar);
        if (!tanggalBayar) {
          return res.status(400).json({ message: "Tanggal bayar tidak dapat dibaca." });
        }
        updates.tanggalBayar = tanggalBayar;
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        message: "Tidak ada perubahan yang bisa disimpan. Ubah minimal satu data terlebih dahulu.",
      });
    }

    if (updates.namaSupplier !== undefined && !updates.namaSupplier) {
      return res.status(400).json({ message: "Isi nama supplier sebelum menyimpan." });
    }

    const effectiveTanggalNota = updates.tanggalNota ?? existingPembelian.tanggalNota;
    const effectiveHutang = updates.hutang ?? existingPembelian.hutang;
    const effectiveLamaHutang = updates.lamaHutang ?? existingPembelian.lamaHutang;
    const effectiveTanggalJatuhTempo =
      updates.tanggalJatuhTempo !== undefined
        ? updates.tanggalJatuhTempo
        : existingPembelian.tanggalJatuhTempo;
    const effectiveTanggalBayar =
      updates.tanggalBayar !== undefined ? updates.tanggalBayar : existingPembelian.tanggalBayar;

    if (updates.idInvoice) {
      const invoice = await Invoice.findById(updates.idInvoice);
      if (!invoice) {
        return res.status(404).json({ message: "Invoice yang dipilih tidak ditemukan." });
      }
    }

    if (updates.idSupplier) {
      const supplier = await Supplier.findById(updates.idSupplier);
      if (!supplier) {
        return res.status(404).json({ message: "Supplier yang dipilih tidak ditemukan." });
      }
    }

    if (effectiveHutang) {
      if (!effectiveTanggalJatuhTempo) {
        return res.status(400).json({
          message: "Isi tanggal jatuh tempo saat status hutang aktif.",
        });
      }

      if (!Number.isFinite(effectiveLamaHutang) || effectiveLamaHutang <= 0) {
        return res.status(400).json({
          message: "Isi lama hutang lebih dari 0 hari saat status hutang aktif.",
        });
      }
    } else {
      updates.lamaHutang = 0;
      updates.tanggalJatuhTempo = null;
    }

    if (effectiveTanggalBayar && effectiveTanggalBayar < effectiveTanggalNota) {
      return res.status(400).json({
        message: "Tanggal bayar tidak boleh lebih awal dari tanggal nota.",
      });
    }

    const pembelian = await Pembelian.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    });

    if (!pembelian) {
      return res.status(404).json({ message: "Data pembelian tidak ditemukan." });
    }

    return res.json({
      message: "pembelian updated",
      pembelian: sanitizePembelian(pembelian),
    });
  } catch (_error) {
    return res.status(500).json({ message: "Data pembelian belum bisa disimpan. Coba lagi." });
  }
});

module.exports = router;
