const express = require("express");

const { Invoice } = require("../../models/Invoice");
const { sanitizeInvoice } = require("./sanitize-invoice");

const router = express.Router();

router.get("/", async (_req, res) => {
  try {
    const invoices = await Invoice.find().sort({ createdAt: -1 });

    return res.json({
      invoices: invoices.map(sanitizeInvoice),
    });
  } catch (_error) {
    return res.status(500).json({ message: "failed to get invoices" });
  }
});

module.exports = router;
