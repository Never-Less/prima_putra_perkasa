const express = require("express");

const { LaporanKeuangan } = require("../../models/LaporanKeuangan");
const { sanitizeLaporanKeuangan } = require("./sanitize-laporan-keuangan");
const { normalizeBulan } = require("./validators");

const router = express.Router();

router.get("/", async (req, res) => {
  const bulan = normalizeBulan(req.query.bulan);

  if (!bulan) {
    return res.status(400).json({ message: "Pilih bulan laporan terlebih dahulu." });
  }

  try {
    const laporanKeuangan = await LaporanKeuangan.findOne({ bulan });

    return res.json({
      laporanKeuangan: laporanKeuangan
        ? sanitizeLaporanKeuangan(laporanKeuangan)
        : null,
    });
  } catch (_error) {
    return res.status(500).json({ message: "failed to get laporan keuangan" });
  }
});

module.exports = router;
