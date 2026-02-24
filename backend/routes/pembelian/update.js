const express = require("express");

const { Invoice } = require("../../models/Invoice");
const { Pembelian } = require("../../models/Pembelian");
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

    if (req.body.TanggalNota !== undefined) {
      const tanggalNota = parseDate(req.body.TanggalNota);
      if (!tanggalNota) {
        return res.status(400).json({ message: "TanggalNota tidak valid" });
      }
      updates.TanggalNota = tanggalNota;
    }

    if (req.body.NamaSupplier !== undefined) {
      updates.NamaSupplier = String(req.body.NamaSupplier || "").trim();
    }

    if (req.body.NoNpwp !== undefined) {
      updates.NoNpwp = String(req.body.NoNpwp || "").trim();
    }

    if (req.body.IdInvoice !== undefined) {
      if (req.body.IdInvoice === null) {
        updates.IdInvoice = null;
      } else {
        const idInvoice = String(req.body.IdInvoice || "").trim();

        if (!isValidId(idInvoice)) {
          return res.status(400).json({ message: "IdInvoice tidak valid" });
        }

        updates.IdInvoice = idInvoice;
      }
    }

    if (req.body.Hutang !== undefined) {
      const hutang = parseBoolean(req.body.Hutang);
      if (hutang === null) {
        return res.status(400).json({ message: "Hutang harus boolean" });
      }
      updates.Hutang = hutang;
    }

    if (req.body.Ppn !== undefined) {
      const ppn = parseBoolean(req.body.Ppn);
      if (ppn === null) {
        return res.status(400).json({ message: "Ppn harus boolean" });
      }
      updates.Ppn = ppn;
    }

    if (req.body.LamaHutang !== undefined) {
      const lamaHutang = parseNumber(req.body.LamaHutang);
      if (lamaHutang === null) {
        return res.status(400).json({ message: "LamaHutang harus angka" });
      }
      updates.LamaHutang = lamaHutang;
    }

    if (req.body.NilaiNota !== undefined) {
      const nilaiNota = parseNumber(req.body.NilaiNota);
      if (nilaiNota === null || nilaiNota < 0) {
        return res.status(400).json({ message: "NilaiNota harus angka >= 0" });
      }
      updates.NilaiNota = nilaiNota;
    }

    if (req.body.TanggalJatuhTempo !== undefined) {
      if (req.body.TanggalJatuhTempo === null) {
        updates.TanggalJatuhTempo = null;
      } else {
        const tanggalJatuhTempo = parseDate(req.body.TanggalJatuhTempo);
        if (!tanggalJatuhTempo) {
          return res.status(400).json({ message: "TanggalJatuhTempo tidak valid" });
        }
        updates.TanggalJatuhTempo = tanggalJatuhTempo;
      }
    }

    if (req.body.TanggalBayar !== undefined) {
      if (req.body.TanggalBayar === null) {
        updates.TanggalBayar = null;
      } else {
        const tanggalBayar = parseDate(req.body.TanggalBayar);
        if (!tanggalBayar) {
          return res.status(400).json({ message: "TanggalBayar tidak valid" });
        }
        updates.TanggalBayar = tanggalBayar;
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        message:
          "minimal kirim salah satu field: TanggalNota, NamaSupplier, NoNpwp, IdInvoice, Hutang, Ppn, LamaHutang, NilaiNota, TanggalJatuhTempo, TanggalBayar",
      });
    }

    if (updates.NamaSupplier !== undefined && !updates.NamaSupplier) {
      return res.status(400).json({ message: "NamaSupplier tidak boleh kosong" });
    }

    const effectiveTanggalNota = updates.TanggalNota ?? existingPembelian.TanggalNota;
    const effectiveHutang = updates.Hutang ?? existingPembelian.Hutang;
    const effectiveLamaHutang = updates.LamaHutang ?? existingPembelian.LamaHutang;
    const effectiveTanggalJatuhTempo =
      updates.TanggalJatuhTempo !== undefined
        ? updates.TanggalJatuhTempo
        : existingPembelian.TanggalJatuhTempo;
    const effectiveTanggalBayar =
      updates.TanggalBayar !== undefined ? updates.TanggalBayar : existingPembelian.TanggalBayar;

    if (updates.IdInvoice) {
      const invoice = await Invoice.findById(updates.IdInvoice);
      if (!invoice) {
        return res.status(404).json({ message: "invoice tidak ditemukan" });
      }
    }

    if (effectiveHutang) {
      if (!effectiveTanggalJatuhTempo) {
        return res.status(400).json({
          message: "TanggalJatuhTempo wajib diisi saat Hutang bernilai true",
        });
      }

      if (!Number.isFinite(effectiveLamaHutang) || effectiveLamaHutang <= 0) {
        return res.status(400).json({
          message: "LamaHutang wajib lebih dari 0 saat Hutang bernilai true",
        });
      }
    } else {
      updates.LamaHutang = 0;
      updates.TanggalJatuhTempo = null;
    }

    if (effectiveTanggalBayar && effectiveTanggalBayar < effectiveTanggalNota) {
      return res.status(400).json({
        message: "TanggalBayar tidak boleh lebih kecil dari TanggalNota",
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
      Pembelian: sanitizePembelian(pembelian),
    });
  } catch (_error) {
    return res.status(500).json({ message: "failed to update pembelian" });
  }
});

module.exports = router;
