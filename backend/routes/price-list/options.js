const express = require("express");
const { Customer } = require("../../models/Customer");
const { PriceList } = require("../../models/PriceList");

const router = express.Router();

router.get("/options", async (_req, res) => {
  try {
    const [customers, legacyNames] = await Promise.all([
      Customer.find({}, "_id nama").sort({ nama: 1 }).lean(),
      PriceList.distinct("namaCustomer", { idCustomer: null }),
    ]);
    const masterNames = new Set(customers.map((customer) => String(customer.nama || "").trim().toLocaleLowerCase("id-ID")));
    const legacyCustomers = legacyNames
      .map((nama) => String(nama || "").trim())
      .filter((nama) => nama && !masterNames.has(nama.toLocaleLowerCase("id-ID")))
      .sort((left, right) => left.localeCompare(right, "id-ID"))
      .map((nama) => ({ id: "", nama }));
    return res.json({
      customers: [...customers.map((customer) => ({
        id: String(customer._id),
        nama: String(customer.nama || ""),
      })), ...legacyCustomers],
    });
  } catch (_error) {
    return res.status(500).json({ message: "Pilihan customer gagal dimuat." });
  }
});

module.exports = router;
