const express = require("express");

const { SuratJalan } = require("../../models/SuratJalan");
const { sanitizeSuratJalan } = require("./sanitize-surat-jalan");

const router = express.Router();

router.get("/", async (_req, res) => {
  try {
    const suratJalanList = await SuratJalan.find().sort({ createdAt: -1 });

    return res.json({
      suratJalan: suratJalanList.map(sanitizeSuratJalan),
    });
  } catch (_error) {
    return res.status(500).json({ message: "failed to get surat jalan" });
  }
});

module.exports = router;
