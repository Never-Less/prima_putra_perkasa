const express = require("express");

const { Supplier } = require("../../models/Supplier");
const { sanitizeSupplier } = require("./sanitize-supplier");
const { isValidId } = require("./validate-id");

const router = express.Router();

router.get("/:id", async (req, res) => {
  const id = String(req.params.id || "");

  if (!isValidId(id)) {
    return res.status(400).json({ message: "invalid supplier id" });
  }

  try {
    const supplier = await Supplier.findById(id);

    if (!supplier) {
      return res.status(404).json({ message: "supplier not found" });
    }

    return res.json({
      supplier: sanitizeSupplier(supplier),
    });
  } catch (_error) {
    return res.status(500).json({ message: "failed to get supplier" });
  }
});

module.exports = router;
