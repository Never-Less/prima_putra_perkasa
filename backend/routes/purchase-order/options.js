const express = require("express");

const { Customer } = require("../../models/Customer");
const { Invoice } = require("../../models/Invoice");

const router = express.Router();

router.get("/options", async (_req, res) => {
  try {
    const [customers, invoices] = await Promise.all([
      Customer.find({}, "_id nama defaultPaymentTerm").sort({ nama: 1 }).lean(),
      Invoice.find({}, "_id noInvoice").sort({ createdAt: -1 }).lean(),
    ]);

    return res.json({
      customerOptions: customers.map((customer) => ({
        id: customer._id,
        nama: String(customer.nama || "").trim(),
        defaultPaymentTerm: customer.defaultPaymentTerm || {
          type: "net",
          netDays: 30,
          downPaymentPercent: 0,
          remainingPaymentPercent: 100,
        },
      })),
      invoiceOptions: invoices.map((invoice) => ({
        id: invoice._id,
        noInvoice: String(invoice.noInvoice || "").trim(),
      })),
    });
  } catch (_error) {
    return res.status(500).json({ message: "failed to get purchase order options" });
  }
});

module.exports = router;
