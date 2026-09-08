const express = require("express");

const { PurchaseOrder } = require("../../models/PurchaseOrder");
const { Invoice } = require("../../models/Invoice");
const { SuratJalan } = require("../../models/SuratJalan");
const { buildSalesOrderWorkflow } = require("../../utils/sales-order-workflow");
const { sanitizePurchaseOrder } = require("./sanitize-purchase-order");
const { isValidId } = require("./validators");

const router = express.Router();

router.get("/:id", async (req, res) => {
  const id = String(req.params.id || "");

  if (!isValidId(id)) {
    return res.status(400).json({ message: "invalid purchase order id" });
  }

  try {
    const purchaseOrder = await PurchaseOrder.findById(id).lean();

    if (!purchaseOrder) {
      return res.status(404).json({ message: "purchase order not found" });
    }

    const noPo = String(purchaseOrder.noPo || "").trim();
    const [suratJalanList, invoiceList] = await Promise.all([
      SuratJalan.find({ noPo }).lean(),
      Invoice.find({
        $or: [
          { noPoList: noPo },
          { noPo },
          { "barang.sources.noPo": noPo },
          { "barang.noPoManual": noPo },
        ],
      }).lean(),
    ]);
    const workflow = buildSalesOrderWorkflow(
      purchaseOrder,
      suratJalanList,
      invoiceList,
      { includeItems: true }
    );

    return res.json({
      purchaseOrder: sanitizePurchaseOrder(purchaseOrder, workflow),
    });
  } catch (_error) {
    return res.status(500).json({ message: "failed to get purchase order" });
  }
});

module.exports = router;
