const express = require("express");
const mongoose = require("mongoose");
const { Customer } = require("../../models/Customer");
const { PriceList } = require("../../models/PriceList");
const { parsePriceListPayload } = require("./parse-payload");

const router = express.Router();

function normalized(value) {
  return String(value || "").trim().toLocaleLowerCase("id-ID");
}

router.post("/bulk", async (req, res) => {
  const items = Array.isArray(req.body.items) ? req.body.items : [];

  if (items.length === 0) {
    return res.status(400).json({ message: "Belum ada item yang dapat disimpan." });
  }

  if (items.length > 500) {
    return res.status(400).json({ message: "Maksimum 500 item per penyimpanan massal." });
  }

  const parsedItems = items.map(parsePriceListPayload);
  const invalidIndex = parsedItems.findIndex((item) => item.error);
  if (invalidIndex >= 0) {
    return res.status(400).json({
      message: `Baris ${invalidIndex + 1}: ${parsedItems[invalidIndex].error}`,
    });
  }

  try {
    const customers = await Customer.find({}, "_id nama").lean();
    const customerById = new Map(customers.map((customer) => [String(customer._id), customer]));
    const customerByName = new Map(customers.map((customer) => [normalized(customer.nama), customer]));
    const documents = [];

    for (let index = 0; index < parsedItems.length; index += 1) {
      const payload = parsedItems[index].payload;
      const customer = payload.idCustomer && mongoose.isValidObjectId(payload.idCustomer)
        ? customerById.get(payload.idCustomer)
        : customerByName.get(normalized(payload.namaCustomer));

      documents.push({
        ...payload,
        idCustomer: customer?._id || null,
        namaCustomer: customer?.nama || payload.namaCustomer,
      });
    }

    const inserted = await PriceList.insertMany(documents);
    return res.status(201).json({
      message: `${inserted.length} item price list berhasil ditambahkan.`,
      insertedCount: inserted.length,
    });
  } catch (_error) {
    return res.status(500).json({ message: "Data price list massal belum bisa disimpan." });
  }
});

module.exports = router;
