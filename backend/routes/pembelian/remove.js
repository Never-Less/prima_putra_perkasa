const express = require("express");

const { Pembelian } = require("../../models/Pembelian");
const { isValidId } = require("./validators");

const router = express.Router();

router.delete("/:id", async (req, res) => {
  const id = String(req.params.id || "");

  if (!isValidId(id)) {
    return res.status(400).json({ message: "invalid pembelian id" });
  }

  try {
    const pembelian = await Pembelian.findByIdAndDelete(id);

    if (!pembelian) {
      return res.status(404).json({ message: "pembelian not found" });
    }

    return res.json({
      message: "pembelian deleted",
    });
  } catch (_error) {
    return res.status(500).json({ message: "failed to delete pembelian" });
  }
});

module.exports = router;
