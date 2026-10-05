const express = require("express");

const { requireRole } = require("../../middlewares/auth");
const { Pembelian } = require("../../models/Pembelian");
const { Supplier } = require("../../models/Supplier");
const { ROLE_ADMIN, ROLE_STAFF } = require("../../models/User");
const { isValidId } = require("./validate-id");

const router = express.Router();
const { SupplierDocument } = require("../../models/SupplierDocument");

router.delete("/:id", requireRole(ROLE_ADMIN, ROLE_STAFF), async (req, res) => {
  const id = String(req.params.id || "");

  if (!isValidId(id)) {
    return res.status(400).json({ message: "invalid supplier id" });
  }

  try {
    const referencedPembelianCount = await Pembelian.countDocuments({ idSupplier: id });

    if (referencedPembelianCount > 0) {
      return res.status(409).json({
        message: "supplier masih digunakan oleh data pembelian",
      });
    }

    const supplier = await Supplier.findByIdAndDelete(id);

    if (!supplier) {
      return res.status(404).json({ message: "supplier not found" });
    }

    await SupplierDocument.deleteMany({ supplierId: id });
    return res.json({
      message: "supplier deleted",
    });
  } catch (_error) {
    return res.status(500).json({ message: "failed to delete supplier" });
  }
});

module.exports = router;
