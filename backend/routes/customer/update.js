const express = require("express");

const { Customer } = require("../../models/Customer");
const { sanitizeCustomer } = require("./sanitize-customer");
const { isValidId } = require("./validate-id");

const router = express.Router();

router.put("/:id", async (req, res) => {
  const id = String(req.params.id || "");

  if (!isValidId(id)) {
    return res.status(400).json({ message: "invalid customer id" });
  }

  const updates = {};

  if (req.body.Nama !== undefined) {
    updates.Nama = String(req.body.Nama || "").trim();
  }

  if (req.body.Alamat !== undefined) {
    updates.Alamat = String(req.body.Alamat || "").trim();
  }

  if (req.body.AtasNama !== undefined) {
    updates.AtasNama = String(req.body.AtasNama || "").trim();
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({
      message: "minimal kirim salah satu field: Nama, Alamat, AtasNama",
    });
  }

  if (
    (updates.Nama !== undefined && !updates.Nama) ||
    (updates.Alamat !== undefined && !updates.Alamat) ||
    (updates.AtasNama !== undefined && !updates.AtasNama)
  ) {
    return res.status(400).json({
      message: "Nama, Alamat, dan AtasNama tidak boleh kosong",
    });
  }

  try {
    const customer = await Customer.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    });

    if (!customer) {
      return res.status(404).json({ message: "customer not found" });
    }

    return res.json({
      message: "customer updated",
      Customer: sanitizeCustomer(customer),
    });
  } catch (_error) {
    return res.status(500).json({ message: "failed to update customer" });
  }
});

module.exports = router;
