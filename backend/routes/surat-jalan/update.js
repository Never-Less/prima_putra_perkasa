const express = require("express");

const { Customer } = require("../../models/Customer");
const { SuratJalan } = require("../../models/SuratJalan");
const { sanitizeSuratJalan } = require("./sanitize-surat-jalan");
const { isValidId, normalizeBarangList, parseBoolean, parseDate } = require("./validators");

const router = express.Router();

router.put("/:id", async (req, res) => {
  const id = String(req.params.id || "");

  if (!isValidId(id)) {
    return res.status(400).json({ message: "invalid surat jalan id" });
  }

  const updates = {};

  if (req.body.NoSuratJalan !== undefined) {
    updates.NoSuratJalan = String(req.body.NoSuratJalan || "").trim();
  }

  if (req.body.NoPO !== undefined) {
    updates.NoPO = String(req.body.NoPO || "").trim();
  }

  if (req.body.tanggal !== undefined) {
    const tanggal = parseDate(req.body.tanggal);
    if (!tanggal) {
      return res.status(400).json({ message: "tanggal tidak valid" });
    }
    updates.tanggal = tanggal;
  }

  if (req.body.IdCustomer !== undefined) {
    const IdCustomer = String(req.body.IdCustomer || "").trim();

    if (!isValidId(IdCustomer)) {
      return res.status(400).json({ message: "IdCustomer tidak valid" });
    }

    updates.IdCustomer = IdCustomer;
  }

  if (req.body.barang !== undefined) {
    const barang = normalizeBarangList(req.body.barang);
    if (!barang) {
      return res.status(400).json({
        message: "barang harus array minimal 1 item (nama, jumlah)",
      });
    }
    updates.barang = barang;
  }

  if (req.body.kendaraan !== undefined) {
    updates.kendaraan = String(req.body.kendaraan || "").trim();
  }

  if (req.body.tipe !== undefined) {
    const tipe = String(req.body.tipe || "")
      .trim()
      .toLowerCase();

    if (!["partial", "non partial"].includes(tipe)) {
      return res.status(400).json({ message: "tipe harus partial atau non partial" });
    }

    updates.tipe = tipe;
  }

  if (req.body.SudahSelesai !== undefined) {
    const parsed = parseBoolean(req.body.SudahSelesai);

    if (parsed === null) {
      return res.status(400).json({ message: "SudahSelesai harus boolean" });
    }

    updates.SudahSelesai = parsed;
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({
      message:
        "minimal kirim salah satu field: NoSuratJalan, NoPO, tanggal, IdCustomer, barang, kendaraan, tipe, SudahSelesai",
    });
  }

  if (
    (updates.NoSuratJalan !== undefined && !updates.NoSuratJalan) ||
    (updates.NoPO !== undefined && !updates.NoPO) ||
    (updates.kendaraan !== undefined && !updates.kendaraan)
  ) {
    return res.status(400).json({
      message: "NoSuratJalan, NoPO, dan kendaraan tidak boleh kosong",
    });
  }

  try {
    if (updates.IdCustomer) {
      const customer = await Customer.findById(updates.IdCustomer);
      if (!customer) {
        return res.status(404).json({ message: "customer tidak ditemukan" });
      }
    }

    const suratJalan = await SuratJalan.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    });

    if (!suratJalan) {
      return res.status(404).json({ message: "surat jalan not found" });
    }

    return res.json({
      message: "surat jalan updated",
      suratJalan: sanitizeSuratJalan(suratJalan),
    });
  } catch (_error) {
    return res.status(500).json({ message: "failed to update surat jalan" });
  }
});

module.exports = router;
