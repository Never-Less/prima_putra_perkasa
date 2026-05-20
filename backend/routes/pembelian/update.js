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
    return res.status(400).json({ message: "invalid pembelian id" });
  }

  try {
    const existingPembelian = await Pembelian.findById(id);

    if (!existingPembelian) {
      return res.status(404).json({ message: "pembelian not found" });
    }

    const updates = {};

    if (req.body.tanggalNota !== undefined) {
      const tanggalNota = parseDate(req.body.tanggalNota);
      if (!tanggalNota) {
        return res.status(400).json({ message: "tanggalNota tidak valid" });
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
          return res.status(400).json({ message: "idSupplier tidak valid" });
        } else {
          updates.idSupplier = idSupplier;
        }
      }
    }

    if (req.body.noNota !== undefined) {
      updates.noNota = String(req.body.noNota || "").trim();
    }

    if (req.body.idInvoice !== undefined) {
      if (req.body.idInvoice === null) {
        updates.idInvoice = null;
      } else {
        const idInvoice = String(req.body.idInvoice || "").trim();

        if (!isValidId(idInvoice)) {
          return res.status(400).json({ message: "idInvoice tidak valid" });
        }

        updates.idInvoice = idInvoice;
      }
    }

    if (req.body.hutang !== undefined) {
      const hutang = parseBoolean(req.body.hutang);
      if (hutang === null) {
        return res.status(400).json({ message: "hutang harus boolean" });
      }
      updates.hutang = hutang;
    }

    if (req.body.ppn !== undefined) {
      const ppn = parseBoolean(req.body.ppn);
      if (ppn === null) {
        return res.status(400).json({ message: "ppn harus boolean" });
      }
      updates.ppn = ppn;
    }

    if (req.body.lamaHutang !== undefined) {
      const lamaHutang = parseNumber(req.body.lamaHutang);
      if (lamaHutang === null) {
        return res.status(400).json({ message: "lamaHutang harus angka" });
      }
      updates.lamaHutang = lamaHutang;
    }

    if (req.body.nilaiNota !== undefined) {
      const nilaiNota = parseNumber(req.body.nilaiNota);
      if (nilaiNota === null || nilaiNota < 0) {
        return res.status(400).json({ message: "nilaiNota harus angka >= 0" });
      }
      updates.nilaiNota = nilaiNota;
    }

    if (req.body.tanggalJatuhTempo !== undefined) {
      if (req.body.tanggalJatuhTempo === null) {
        updates.tanggalJatuhTempo = null;
      } else {
        const tanggalJatuhTempo = parseDate(req.body.tanggalJatuhTempo);
        if (!tanggalJatuhTempo) {
          return res.status(400).json({ message: "tanggalJatuhTempo tidak valid" });
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
          return res.status(400).json({ message: "tanggalBayar tidak valid" });
        }
        updates.tanggalBayar = tanggalBayar;
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        message:
          "minimal kirim salah satu field: tanggalNota, namaSupplier, idSupplier, noNota, idInvoice, hutang, ppn, lamaHutang, nilaiNota, tanggalJatuhTempo, tanggalBayar",
      });
    }

    if (updates.namaSupplier !== undefined && !updates.namaSupplier) {
      return res.status(400).json({ message: "namaSupplier tidak boleh kosong" });
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
        return res.status(404).json({ message: "invoice tidak ditemukan" });
      }
    }

    if (updates.idSupplier) {
      const supplier = await Supplier.findById(updates.idSupplier);
      if (!supplier) {
        return res.status(404).json({ message: "supplier tidak ditemukan" });
      }
    }

    if (effectiveHutang) {
      if (!effectiveTanggalJatuhTempo) {
        return res.status(400).json({
          message: "tanggalJatuhTempo wajib diisi saat hutang bernilai true",
        });
      }

      if (!Number.isFinite(effectiveLamaHutang) || effectiveLamaHutang <= 0) {
        return res.status(400).json({
          message: "lamaHutang wajib lebih dari 0 saat hutang bernilai true",
        });
      }
    } else {
      updates.lamaHutang = 0;
      updates.tanggalJatuhTempo = null;
    }

    if (effectiveTanggalBayar && effectiveTanggalBayar < effectiveTanggalNota) {
      return res.status(400).json({
        message: "tanggalBayar tidak boleh lebih kecil dari tanggalNota",
      });
    }

    const pembelian = await Pembelian.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    });

    if (!pembelian) {
      return res.status(404).json({ message: "pembelian not found" });
    }

    return res.json({
      message: "pembelian updated",
      pembelian: sanitizePembelian(pembelian),
    });
  } catch (_error) {
    return res.status(500).json({ message: "failed to update pembelian" });
  }
});

module.exports = router;
