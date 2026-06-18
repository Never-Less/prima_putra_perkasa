const express = require("express");

const { PurchaseOrder } = require("../../models/PurchaseOrder");
const { sanitizePurchaseOrderBarang } = require("../purchase-order/sanitize-purchase-order");

const router = express.Router();

router.get("/no-po-options", async (_req, res) => {
  try {
    const optionRows = await PurchaseOrder.find(
      {
        noPo: { $exists: true, $ne: null },
      },
      "noPo namaCustomer barang createdAt"
    )
      .sort({ noPo: 1, createdAt: -1 })
      .lean();
    const optionMap = new Map();

    optionRows.forEach((item) => {
      const noPo = String(item?.noPo || "").trim();
      const idCustomer = String(item?.namaCustomer || "").trim();
      const barang = sanitizePurchaseOrderBarang(item?.barang);

      if (!noPo) {
        return;
      }

      const existingOption = optionMap.get(noPo);

      if (!existingOption) {
        optionMap.set(noPo, {
          noPo,
          idCustomer,
          barang,
        });
        return;
      }

      existingOption.idCustomer = existingOption.idCustomer || idCustomer;

      if (existingOption.barang.length === 0 && barang.length > 0) {
        existingOption.barang = barang;
      }
    });

    const noPoOptions = Array.from(optionMap.values()).sort((left, right) =>
      left.noPo.localeCompare(right.noPo)
    );

    return res.json({
      noPoOptions,
    });
  } catch (_error) {
    return res.status(500).json({ message: "failed to get surat jalan no po options" });
  }
});

module.exports = router;
