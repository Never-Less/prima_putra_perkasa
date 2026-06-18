const express = require("express");

const { LaporanKeuangan } = require("../../models/LaporanKeuangan");
const { sanitizeLaporanKeuangan } = require("./sanitize-laporan-keuangan");
const { normalizeBulan, normalizeRincianBiaya } = require("./validators");

const router = express.Router();

router.post("/", async (req, res) => {
  const bulan = normalizeBulan(req.body.bulan);
  const normalized = normalizeRincianBiaya(req.body.rincianBiaya);

  if (!bulan) {
    return res.status(400).json({ message: "Pilih bulan laporan terlebih dahulu." });
  }

  if (normalized.error) {
    return res.status(400).json({ message: normalized.error });
  }

  try {
    let laporanKeuangan = await LaporanKeuangan.findOne({ bulan });
    let statusCode = 200;
    let message = "laporan keuangan updated";

    if (!laporanKeuangan) {
      laporanKeuangan = new LaporanKeuangan({ bulan });
      statusCode = 201;
      message = "laporan keuangan created";
    }

    laporanKeuangan.rincianBiaya = normalized.rincianBiaya;
    await laporanKeuangan.save();

    return res.status(statusCode).json({
      message,
      laporanKeuangan: sanitizeLaporanKeuangan(laporanKeuangan),
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ message: "Laporan untuk bulan ini sudah ada." });
    }

    return res.status(500).json({ message: "Laporan keuangan belum bisa disimpan. Coba lagi." });
  }
});

module.exports = router;
