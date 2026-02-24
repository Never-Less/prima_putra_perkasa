const express = require("express");

const { Pembelian } = require("../../models/Pembelian");
const { sanitizePembelian } = require("./sanitize-pembelian");

const router = express.Router();

router.get("/", async (_req, res) => {
  try {
    const pembelianList = await Pembelian.find().sort({ createdAt: -1 });

    return res.json({
      Pembelians: pembelianList.map(sanitizePembelian),
    });
  } catch (_error) {
    return res.status(500).json({ message: "failed to get pembelian list" });
  }
});

module.exports = router;
