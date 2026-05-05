const express = require("express");

const { SuratJalan } = require("../../models/SuratJalan");
const { sanitizeSuratJalan } = require("./sanitize-surat-jalan");

const router = express.Router();

router.get("/by-no-po", async (req, res) => {
  const noPo = String(req.query.noPo || "").trim();

  if (!noPo) {
    return res.status(400).json({ message: "invalid no po" });
  }

  try {
    const suratJalanList = await SuratJalan.find({ noPo }).sort({
      tanggal: 1,
      createdAt: 1,
      _id: 1,
    });

    return res.json({
      suratJalan: suratJalanList.map(sanitizeSuratJalan),
    });
  } catch (_error) {
    return res.status(500).json({ message: "failed to get surat jalan by no po" });
  }
});

module.exports = router;
