const express = require("express");

const { Customer } = require("../../models/Customer");
const { sanitizeCustomer } = require("./sanitize-customer");

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const nama = String(req.body.Nama || "").trim();
    const alamat = String(req.body.Alamat || "").trim();
    const atasNama = String(req.body.AtasNama || "").trim();

    if (!nama || !alamat || !atasNama) {
      return res.status(400).json({
        message: "Nama, Alamat, dan AtasNama wajib diisi",
      });
    }

    const customer = await Customer.create({
      Nama: nama,
      Alamat: alamat,
      AtasNama: atasNama,
    });

    return res.status(201).json({
      message: "customer created",
      Customer: sanitizeCustomer(customer),
    });
  } catch (_error) {
    return res.status(500).json({ message: "failed to create customer" });
  }
});

module.exports = router;
