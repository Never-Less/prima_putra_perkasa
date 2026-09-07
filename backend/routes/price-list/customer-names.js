const express = require("express");
const { Customer } = require("../../models/Customer");
const { PriceList } = require("../../models/PriceList");

const router = express.Router();

router.get("/customer-names", async (_req, res) => {
  try {
    const [masterCustomers, legacyNames] = await Promise.all([
      Customer.find({}, "_id nama").sort({ nama: 1 }).lean(),
      PriceList.distinct("namaCustomer"),
    ]);
    const byName = new Map();

    masterCustomers.forEach((customer) => {
      const name = String(customer.nama || "").trim();
      if (name) byName.set(name.toLocaleLowerCase("id-ID"), { id: String(customer._id), name });
    });
    legacyNames.forEach((value) => {
      const name = String(value || "").trim();
      const key = name.toLocaleLowerCase("id-ID");
      if (name && !byName.has(key)) byName.set(key, { id: "", name });
    });

    return res.json({
      customers: Array.from(byName.values()).sort((left, right) => left.name.localeCompare(right.name)),
    });
  } catch (_error) {
    return res.status(500).json({ message: "Daftar customer Price List gagal dimuat." });
  }
});

module.exports = router;
