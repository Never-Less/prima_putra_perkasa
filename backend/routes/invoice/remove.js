const express = require("express");

const { Invoice } = require("../../models/Invoice");
const { isValidId } = require("./validators");

const router = express.Router();

router.delete("/:id", async (req, res) => {
  const id = String(req.params.id || "");

  if (!isValidId(id)) {
    return res.status(400).json({ message: "invalid invoice id" });
  }

  try {
    const invoice = await Invoice.findByIdAndDelete(id);

    if (!invoice) {
      return res.status(404).json({ message: "invoice not found" });
    }

    return res.json({
      message: "invoice deleted",
    });
  } catch (_error) {
    return res.status(500).json({ message: "failed to delete invoice" });
  }
});

module.exports = router;
