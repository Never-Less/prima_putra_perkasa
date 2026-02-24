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

  if (req.body.Tanggal !== undefined) {
    const tanggal = parseDate(req.body.Tanggal);
    if (!tanggal) {
      return res.status(400).json({ message: "Tanggal tidak valid" });
    }
    updates.Tanggal = tanggal;
  }

  if (req.body.IdCustomer !== undefined) {
    const IdCustomer = String(req.body.IdCustomer || "").trim();

    if (!isValidId(IdCustomer)) {
      return res.status(400).json({ message: "IdCustomer tidak valid" });
    }

    updates.IdCustomer = IdCustomer;
  }

  if (req.body.Barang !== undefined) {
    const barang = normalizeBarangList(req.body.Barang);
    if (!barang) {
      return res.status(400).json({
        message: "Barang harus array minimal 1 item (Nama, Jumlah)",
      });
    }
    updates.Barang = barang;
  }

  if (req.body.Kendaraan !== undefined) {
    updates.Kendaraan = String(req.body.Kendaraan || "").trim();
  }

  if (req.body.Tipe !== undefined) {
    const tipe = String(req.body.Tipe || "")
      .trim()
      .toLowerCase();

    if (!["partial", "non partial"].includes(tipe)) {
      return res.status(400).json({ message: "Tipe harus partial atau non partial" });
    }

    updates.Tipe = tipe;
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
        "minimal kirim salah satu field: NoSuratJalan, NoPO, Tanggal, IdCustomer, Barang, Kendaraan, Tipe, SudahSelesai",
    });
  }

  if (
    (updates.NoSuratJalan !== undefined && !updates.NoSuratJalan) ||
    (updates.NoPO !== undefined && !updates.NoPO) ||
    (updates.Kendaraan !== undefined && !updates.Kendaraan)
  ) {
    return res.status(400).json({
      message: "NoSuratJalan, NoPO, dan Kendaraan tidak boleh kosong",
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
      SuratJalan: sanitizeSuratJalan(suratJalan),
    });
  } catch (_error) {
    return res.status(500).json({ message: "failed to update surat jalan" });
  }
});

module.exports = router;
