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
    return res.status(400).json({ message: "Data supplier yang dipilih tidak dapat dibuka." });
  }

  try {
    const existingSupplier = await Supplier.findById(id);

    if (!existingSupplier) {
      return res.status(404).json({ message: "Data supplier tidak ditemukan." });
    }

    const updates = {};

    if (req.body.namaSupplier !== undefined) {
      updates.namaSupplier = String(req.body.namaSupplier || "").trim();
    }

    if (req.body.hutang !== undefined) {
      const hutang = parseBoolean(req.body.hutang);

      if (hutang === null) {
        return res.status(400).json({ message: "Status hutang tidak valid." });
      }

      updates.hutang = hutang;
    }

    if (req.body.lamaHutang !== undefined) {
      if (req.body.lamaHutang === null || req.body.lamaHutang === "") {
        updates.lamaHutang = null;
      } else {
        const lamaHutang = parseNumber(req.body.lamaHutang);

        if (lamaHutang === null) {
          return res.status(400).json({ message: "Lama hutang harus berupa angka." });
        }

        updates.lamaHutang = lamaHutang;
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        message: "Tidak ada perubahan yang bisa disimpan. Ubah minimal satu data terlebih dahulu.",
      });
    }

    if (updates.namaSupplier !== undefined && !updates.namaSupplier) {
      return res.status(400).json({ message: "Isi nama supplier sebelum menyimpan." });
    }

    const effectiveHutang = updates.hutang ?? existingSupplier.hutang;
    const effectiveLamaHutang =
      updates.lamaHutang !== undefined ? updates.lamaHutang : existingSupplier.lamaHutang;

    if (effectiveHutang) {
      if (!Number.isFinite(effectiveLamaHutang) || effectiveLamaHutang <= 0) {
        return res.status(400).json({
          message: "Isi lama hutang lebih dari 0 hari saat status hutang aktif.",
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
      return res.status(404).json({ message: "Data supplier tidak ditemukan." });
    }

    return res.json({
      message: "supplier updated",
      supplier: sanitizeSupplier(supplier),
    });
  } catch (_error) {
    return res.status(500).json({ message: "Data supplier belum bisa disimpan. Coba lagi." });
  }
});

module.exports = router;
