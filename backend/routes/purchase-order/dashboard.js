const express = require("express");

const { Customer } = require("../../models/Customer");
const { Invoice } = require("../../models/Invoice");
const { PurchaseOrder } = require("../../models/PurchaseOrder");
const { SuratJalan } = require("../../models/SuratJalan");
const { sanitizeInvoice } = require("../invoice/sanitize-invoice");
const { sanitizeSuratJalan } = require("../surat-jalan/sanitize-surat-jalan");
const { sanitizePurchaseOrder } = require("./sanitize-purchase-order");
const {
  buildSalesOrderWorkflow,
  indexSalesOrderRelations,
} = require("../../utils/sales-order-workflow");

const router = express.Router();

router.get("/dashboard", async (_req, res) => {
  try {
    const [purchaseOrders, suratJalanList, invoiceList, customers] = await Promise.all([
      PurchaseOrder.find({}).sort({ createdAt: -1 }).lean(),
      SuratJalan.find({}).sort({ createdAt: -1 }).lean(),
      Invoice.find({}).sort({ createdAt: -1 }).lean(),
      Customer.find({}, "nama defaultPaymentTerm").sort({ nama: 1 }).lean(),
    ]);
    const relations = indexSalesOrderRelations(suratJalanList, invoiceList);

    return res.json({
      purchaseOrders: purchaseOrders.map((purchaseOrder) => {
        const key = String(purchaseOrder.noPo || "").trim().toLowerCase();
        return sanitizePurchaseOrder(
          purchaseOrder,
          buildSalesOrderWorkflow(
            purchaseOrder,
            relations.suratJalanByNoPo.get(key) || [],
            relations.invoiceByNoPo.get(key) || []
          )
        );
      }),
      suratJalan: suratJalanList.map((row) => sanitizeSuratJalan(row)),
      invoices: invoiceList.map((row) => sanitizeInvoice(row)),
      customerOptions: customers.map((customer) => ({
        id: customer._id,
        nama: customer.nama,
        defaultPaymentTerm: customer.defaultPaymentTerm,
      })),
    });
  } catch (_error) {
    return res.status(500).json({ message: "failed to get sales order dashboard" });
  }
});

module.exports = router;
