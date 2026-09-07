const express = require("express");
const mongoose = require("mongoose");
const { PriceList } = require("../../models/PriceList");
const { sanitizePriceList } = require("./sanitize-price-list");

const router = express.Router();

router.get("/:id", async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: "Data price list tidak valid." });
  }

  const item = await PriceList.findById(req.params.id);
  if (!item) return res.status(404).json({ message: "Data price list tidak ditemukan." });
  return res.json({ priceListItem: sanitizePriceList(item) });
});

module.exports = router;
