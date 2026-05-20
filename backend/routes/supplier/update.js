const express = require("express");

const { requireRole } = require("../../middlewares/auth");
const { Supplier } = require("../../models/Supplier");
const { ROLE_ADMIN, ROLE_STAFF } = require("../../models/User");
const { sanitizeSupplier } = require("./sanitize-supplier");
const { isValidId } = require("./validate-id");

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

router.put("/:id", requireRole(ROLE_ADMIN, ROLE_STAFF), async (req, res) => {
  const id = String(req.params.id || "");

  if (!isValidId(id)) {
    return res.status(400).json({ message: "invalid supplier id" });
  }

  try {
    const existingSupplier = await Supplier.findById(id);

    if (!existingSupplier) {
      return res.status(404).json({ message: "supplier not found" });
    }

    const updates = {};

    if (req.body.namaSupplier !== undefined) {
      updates.namaSupplier = String(req.body.namaSupplier || "").trim();
    }

    if (req.body.hutang !== undefined) {
      const hutang = parseBoolean(req.body.hutang);

      if (hutang === null) {
        return res.status(400).json({ message: "hutang harus boolean" });
      }

      updates.hutang = hutang;
    }

    if (req.body.lamaHutang !== undefined) {
      if (req.body.lamaHutang === null || req.body.lamaHutang === "") {
        updates.lamaHutang = null;
      } else {
        const lamaHutang = parseNumber(req.body.lamaHutang);

        if (lamaHutang === null) {
          return res.status(400).json({ message: "lamaHutang harus angka" });
        }

        updates.lamaHutang = lamaHutang;
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        message: "minimal kirim salah satu field: namaSupplier, hutang, lamaHutang",
      });
    }

    if (updates.namaSupplier !== undefined && !updates.namaSupplier) {
      return res.status(400).json({ message: "namaSupplier tidak boleh kosong" });
    }

    const effectiveHutang = updates.hutang ?? existingSupplier.hutang;
    const effectiveLamaHutang =
      updates.lamaHutang !== undefined ? updates.lamaHutang : existingSupplier.lamaHutang;

    if (effectiveHutang) {
      if (!Number.isFinite(effectiveLamaHutang) || effectiveLamaHutang <= 0) {
        return res.status(400).json({
          message: "lamaHutang wajib lebih dari 0 saat hutang bernilai true",
        });
      }
    } else {
      updates.lamaHutang = null;
    }

    const supplier = await Supplier.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    });

    if (!supplier) {
      return res.status(404).json({ message: "supplier not found" });
    }

    return res.json({
      message: "supplier updated",
      supplier: sanitizeSupplier(supplier),
    });
  } catch (_error) {
    return res.status(500).json({ message: "failed to update supplier" });
  }
});

module.exports = router;
