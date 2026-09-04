const express = require("express");
const mongoose = require("mongoose");
const { PriceList } = require("../../models/PriceList");
const { removeStoredImage } = require("./image-storage");

const router = express.Router();

router.delete("/:id", async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: "Data price list tidak valid." });
  }

  const item = await PriceList.findByIdAndDelete(req.params.id);
  if (!item) return res.status(404).json({ message: "Data price list tidak ditemukan." });
  const unreferencedImages = [];
  for (const image of item.images || []) {
    const stillReferenced = await PriceList.exists({ images: image });
    if (!stillReferenced) unreferencedImages.push(image);
  }
  await Promise.allSettled(unreferencedImages.map(removeStoredImage));
  return res.json({ message: "Price list berhasil dihapus." });
});

module.exports = router;
