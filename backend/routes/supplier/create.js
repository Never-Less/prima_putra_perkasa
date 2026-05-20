const express = require("express");

const { requireRole } = require("../../middlewares/auth");
const { Supplier } = require("../../models/Supplier");
const { ROLE_ADMIN, ROLE_STAFF } = require("../../models/User");
const { sanitizeSupplier } = require("./sanitize-supplier");

const router = express.Router();

function parseBoolean(value) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const lowered = value.trim().toLowerCase();

    if (lowered === "true") {
      return true;
    }

    if (lowered === "false") {
      return false;
    }
  }

  return null;
}

function parseNumber(value) {
  const number = Number(value);

  return Number.isFinite(number) ? number : null;
}

router.post("/", requireRole(ROLE_ADMIN, ROLE_STAFF), async (req, res) => {
  const namaSupplier = String(req.body.namaSupplier || "").trim();
  const hutang = req.body.hutang !== undefined ? parseBoolean(req.body.hutang) : false;
  const lamaHutang = hutang ? parseNumber(req.body.lamaHutang) : null;

  if (!namaSupplier) {
    return res.status(400).json({ message: "namaSupplier wajib diisi" });
  }

  if (hutang === null) {
    return res.status(400).json({ message: "hutang harus boolean" });
  }

  if (hutang && (lamaHutang === null || lamaHutang <= 0)) {
    return res.status(400).json({
      message: "lamaHutang wajib lebih dari 0 saat hutang bernilai true",
    });
  }

  try {
    const supplier = await Supplier.create({
      namaSupplier,
      hutang,
      lamaHutang,
    });

    return res.status(201).json({
      message: "supplier created",
      supplier: sanitizeSupplier(supplier),
    });
  } catch (_error) {
    return res.status(500).json({ message: "failed to create supplier" });
  }
});

module.exports = router;
