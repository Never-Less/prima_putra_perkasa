const express = require("express");

const { Customer } = require("../../models/Customer");
const { sanitizeCustomer } = require("./sanitize-customer");
const { isValidId } = require("./validate-id");

const router = express.Router();

router.get("/:id", async (req, res) => {
  const id = String(req.params.id || "");

  if (!isValidId(id)) {
    return res.status(400).json({ message: "invalid customer id" });
  }

  try {
    const customer = await Customer.findById(id);

    if (!customer) {
      return res.status(404).json({ message: "customer not found" });
    }

    return res.json({
      customer: sanitizeCustomer(customer),
    });
  } catch (_error) {
    return res.status(500).json({ message: "failed to get customer" });
  }
});

module.exports = router;
