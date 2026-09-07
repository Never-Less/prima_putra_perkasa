const express = require("express");
const mongoose = require("mongoose");
const { Customer } = require("../../models/Customer");
const { PriceList } = require("../../models/PriceList");
const { parsePriceListPayload } = require("./parse-payload");
const { sanitizePriceList } = require("./sanitize-price-list");

const router = express.Router();

router.post("/", async (req, res) => {
  const parsed = parsePriceListPayload(req.body);
  if (parsed.error) return res.status(400).json({ message: parsed.error });

  try {
    if (parsed.payload.idCustomer) {
      if (!mongoose.isValidObjectId(parsed.payload.idCustomer)) {
        return res.status(400).json({ message: "Customer yang dipilih tidak valid." });
      }
      const customer = await Customer.findById(parsed.payload.idCustomer, "nama").lean();
      if (!customer) return res.status(404).json({ message: "Customer tidak ditemukan." });
      parsed.payload.namaCustomer = customer.nama;
    }

    const item = await PriceList.create(parsed.payload);
    return res.status(201).json({
      message: "Price list berhasil ditambahkan.",
      priceListItem: sanitizePriceList(item),
    });
  } catch (_error) {
    return res.status(500).json({ message: "Price list belum bisa disimpan." });
  }
});

module.exports = router;
