const express = require("express");

const { requireRole } = require("../../middlewares/auth");
const { Customer } = require("../../models/Customer");
const { sanitizeCustomer } = require("./sanitize-customer");

const router = express.Router();

router.post("/", requireRole("admin"), async (req, res) => {
  try {
    const nama = String(req.body.nama || "").trim();
    const alamat = String(req.body.alamat || "").trim();
    const npwp = String(req.body.npwp || "").trim();
    const atasNama = String(req.body.atasNama || "").trim();

    if (!nama || !alamat || !atasNama) {
      return res.status(400).json({
        message: "nama, alamat, dan atasNama wajib diisi",
      });
    }

    const customer = await Customer.create({
      nama: nama,
      alamat: alamat,
      npwp: npwp,
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
