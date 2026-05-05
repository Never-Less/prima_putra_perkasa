const express = require("express");

const { SuratJalan } = require("../../models/SuratJalan");
const { sanitizeSuratJalan } = require("./sanitize-surat-jalan");
const { isValidId } = require("./validators");

const router = express.Router();

router.get("/:id", async (req, res) => {
  const id = String(req.params.id || "");

  if (!isValidId(id)) {
    return res.status(400).json({ message: "invalid surat jalan id" });
  }

  try {
    const suratJalan = await SuratJalan.findById(id);

    if (!suratJalan) {
      return res.status(404).json({ message: "surat jalan not found" });
    }

    return res.json({
      suratJalan: sanitizeSuratJalan(suratJalan),
    });
  } catch (_error) {
    return res.status(500).json({ message: "failed to get surat jalan" });
  }
});

module.exports = router;
