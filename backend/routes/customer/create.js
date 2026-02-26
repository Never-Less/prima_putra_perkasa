const express = require("express");

const { Customer } = require("../../models/Customer");
const { sanitizeCustomer } = require("./sanitize-customer");

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const nama = String(req.body.nama || "").trim();
    const alamat = String(req.body.alamat || "").trim();
    const atasNama = String(req.body.atasNama || "").trim();

    if (!nama || !alamat || !atasNama) {
      return res.status(400).json({
        message: "nama, alamat, dan atasNama wajib diisi",
      });
    }

    const customer = await Customer.create({
      nama: nama,
      alamat: alamat,
      atasNama: atasNama,
    });

    return res.status(201).json({
      message: "customer created",
      customer: sanitizeCustomer(customer),
    });
  } catch (_error) {
    return res.status(500).json({ message: "failed to create customer" });
  }
});

module.exports = router;
