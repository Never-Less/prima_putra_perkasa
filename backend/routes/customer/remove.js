const express = require("express");

const { requireRole } = require("../../middlewares/auth");
const { Customer } = require("../../models/Customer");
const { ROLE_ADMIN, ROLE_STAFF } = require("../../models/User");
const { isValidId } = require("./validate-id");

const router = express.Router();

router.delete("/:id", requireRole(ROLE_ADMIN, ROLE_STAFF), async (req, res) => {
  const id = String(req.params.id || "");

  if (!isValidId(id)) {
    return res.status(400).json({ message: "invalid customer id" });
  }

  try {
    const customer = await Customer.findByIdAndDelete(id);

    if (!customer) {
      return res.status(404).json({ message: "customer not found" });
    }

    return res.json({
      message: "customer deleted",
    });
  } catch (_error) {
    return res.status(500).json({ message: "failed to delete customer" });
  }
});

module.exports = router;
