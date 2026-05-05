const express = require("express");

const { requireRole } = require("../../middlewares/auth");
const { Customer } = require("../../models/Customer");
const { ROLE_ADMIN, ROLE_STAFF } = require("../../models/User");
const { sanitizeCustomer } = require("./sanitize-customer");
const { isValidId } = require("./validate-id");

const router = express.Router();

router.put("/:id", requireRole(ROLE_ADMIN, ROLE_STAFF), async (req, res) => {
  const id = String(req.params.id || "");

  if (!isValidId(id)) {
    return res.status(400).json({ message: "invalid customer id" });
  }

  const updates = {};

  if (req.body.nama !== undefined) {
    updates.nama = String(req.body.nama || "").trim();
  }

  if (req.body.alamat !== undefined) {
    updates.alamat = String(req.body.alamat || "").trim();
  }

  if (req.body.npwp !== undefined) {
    updates.npwp = String(req.body.npwp || "").trim();
  }

  if (req.body.atasNama !== undefined) {
    updates.atasNama = String(req.body.atasNama || "").trim();
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({
      message: "minimal kirim salah satu field: nama, alamat, atasNama",
    });
  }

  if (
    (updates.nama !== undefined && !updates.nama) ||
    (updates.alamat !== undefined && !updates.alamat) ||
    (updates.atasNama !== undefined && !updates.atasNama)
  ) {
    return res.status(400).json({
      message: "nama, alamat, dan atasNama tidak boleh kosong",
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
      customer: sanitizeCustomer(customer),
    });
  } catch (_error) {
    return res.status(500).json({ message: "failed to update customer" });
  }
});

module.exports = router;
