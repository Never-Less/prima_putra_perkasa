const express = require("express");

const { Customer } = require("../../models/Customer");
const { sanitizeCustomer } = require("./sanitize-customer");

const router = express.Router();

router.get("/", async (_req, res) => {
  try {
    const customers = await Customer.find().sort({ createdAt: -1 });

    return res.json({
      customers: customers.map(sanitizeCustomer),
    });
  } catch (_error) {
    return res.status(500).json({ message: "failed to get customers" });
  }
});

module.exports = router;
