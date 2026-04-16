const express = require("express");

const { PurchaseOrder } = require("../../models/PurchaseOrder");
const { sanitizePurchaseOrder } = require("./sanitize-purchase-order");
const { isValidId } = require("./validators");

const router = express.Router();

router.get("/:id", async (req, res) => {
  const id = String(req.params.id || "");

  if (!isValidId(id)) {
    return res.status(400).json({ message: "invalid purchase order id" });
  }

  try {
    const purchaseOrder = await PurchaseOrder.findById(id);

    if (!purchaseOrder) {
      return res.status(404).json({ message: "purchase order not found" });
    }

    return res.json({
      purchaseOrder: sanitizePurchaseOrder(purchaseOrder),
    });
  } catch (_error) {
    return res.status(500).json({ message: "failed to get purchase order" });
  }
});

module.exports = router;
