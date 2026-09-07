const express = require("express");
const mongoose = require("mongoose");
const { PriceList } = require("../../models/PriceList");
const {
  getImagePath,
  maxImages,
  removeStoredImage,
  safeImageName,
  uploadImageBuffer,
  uploadPriceListImages,
} = require("./image-storage");
const { sanitizePriceList } = require("./sanitize-price-list");

const router = express.Router();

router.get("/images/:filename", async (req, res) => {
  const filename = safeImageName(req.params.filename);
  if (!filename) return res.status(400).json({ message: "Nama foto tidak valid." });

  const isReferenced = await PriceList.exists({ images: filename });
  if (!isReferenced) return res.status(404).json({ message: "Foto tidak ditemukan." });

  return res.sendFile(getImagePath(filename), {
    headers: {
      "Cache-Control": "private, max-age=86400",
      "X-Content-Type-Options": "nosniff",
    },
  }, (error) => {
    if (error && !res.headersSent) res.status(error.statusCode || 404).json({ message: "File foto tidak ditemukan." });
  });
});

router.post("/:id/images", uploadPriceListImages, async (req, res) => {
  const uploadedImages = [];

  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Data price list tidak valid." });
    }

    const item = await PriceList.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ message: "Data price list tidak ditemukan." });
    }

    if ((req.files || []).length === 0) {
      return res.status(400).json({ message: "Pilih minimal satu foto." });
    }

    if (item.images.length + req.files.length > maxImages) {
      return res.status(400).json({ message: `Maksimum ${maxImages} foto per barang.` });
    }

    for (const file of req.files) {
      const result = await uploadImageBuffer(file);
      uploadedImages.push(result.secure_url);
    }
    item.images.push(...uploadedImages);
    await item.save();
    return res.status(201).json({
      message: "Foto berhasil ditambahkan.",
      priceListItem: sanitizePriceList(item),
    });
  } catch (_error) {
    await Promise.allSettled(uploadedImages.map(removeStoredImage));
    return res.status(500).json({ message: "Foto belum bisa disimpan." });
  }
});

router.delete("/:id/images/:filename", async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: "Data price list tidak valid." });
  }

  const imageReference = String(req.params.filename || "").trim();
  if (!imageReference) return res.status(400).json({ message: "Referensi foto tidak valid." });

  try {
    const item = await PriceList.findById(req.params.id);
    if (!item) return res.status(404).json({ message: "Data price list tidak ditemukan." });
    if (!item.images.includes(imageReference)) {
      return res.status(404).json({ message: "Foto tidak ditemukan pada barang ini." });
    }

    item.images = item.images.filter((image) => image !== imageReference);
    await item.save();
    const stillReferenced = await PriceList.exists({ _id: { $ne: item._id }, images: imageReference });
    if (!stillReferenced) await removeStoredImage(imageReference).catch(() => undefined);
    return res.json({
      message: "Foto berhasil dihapus.",
      priceListItem: sanitizePriceList(item),
    });
  } catch (_error) {
    return res.status(500).json({ message: "Foto belum bisa dihapus." });
  }
});

module.exports = router;
