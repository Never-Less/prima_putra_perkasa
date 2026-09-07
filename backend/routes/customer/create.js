const express = require("express");

const { requireRole } = require("../../middlewares/auth");
const { Customer } = require("../../models/Customer");
const { ROLE_ADMIN, ROLE_STAFF } = require("../../models/User");
const { sanitizeCustomer } = require("./sanitize-customer");
const { normalizePaymentTerm } = require("../../utils/payment-term");

const router = express.Router();

router.post("/", requireRole(ROLE_ADMIN, ROLE_STAFF), async (req, res) => {
  try {
    const nama = String(req.body.nama || "").trim();
    const alamat = String(req.body.alamat || "").trim();
    const npwp = String(req.body.npwp || "").trim();
    const atasNama = String(req.body.atasNama || "").trim();
    const defaultPaymentTerm = normalizePaymentTerm(req.body.defaultPaymentTerm);

    if (!nama || !alamat || !atasNama) {
      return res.status(400).json({
        message: "Lengkapi nama, alamat, dan atas nama customer sebelum menyimpan.",
      });
    }

    if (!defaultPaymentTerm) {
      return res.status(400).json({ message: "Term of payment default customer tidak valid." });
    }

    const customer = await Customer.create({
      nama: nama,
      alamat: alamat,
      npwp: npwp,
      atasNama: atasNama,
      defaultPaymentTerm,
    });

    return res.status(201).json({
      message: "customer created",
      customer: sanitizeCustomer(customer),
    });
  } catch (_error) {
    return res.status(500).json({ message: "Data customer belum bisa disimpan. Coba lagi." });
  }
});

module.exports = router;
