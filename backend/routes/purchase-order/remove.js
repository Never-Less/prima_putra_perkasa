const express = require("express");

const { PurchaseOrder } = require("../../models/PurchaseOrder");
const { isValidId } = require("./validators");

const router = express.Router();

router.delete("/:id", async (req, res) => {
  const id = String(req.params.id || "");

  if (!isValidId(id)) {
    return res.status(400).json({ message: "invalid purchase order id" });
  }

  try {
    const purchaseOrder = await PurchaseOrder.findByIdAndDelete(id);

    if (!purchaseOrder) {
      return res.status(404).json({ message: "purchase order not found" });
    }

    return res.json({
      message: "purchase order deleted",
    });
  } catch (_error) {
    return res.status(500).json({ message: "failed to delete purchase order" });
  }
});

module.exports = router;
