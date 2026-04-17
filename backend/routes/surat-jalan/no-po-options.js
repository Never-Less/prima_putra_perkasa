const express = require("express");

const { PurchaseOrder } = require("../../models/PurchaseOrder");

const router = express.Router();

router.get("/no-po-options", async (_req, res) => {
  try {
    const optionRows = await PurchaseOrder.aggregate([
      {
        $match: {
          noPo: { $exists: true, $ne: null },
        },
      },
      {
        $group: {
          _id: "$noPo",
          idCustomer: { $first: "$namaCustomer" },
        },
      },
      {
        $project: {
          _id: 0,
          noPo: "$_id",
          idCustomer: "$idCustomer",
        },
      },
      {
        $sort: {
          noPo: 1,
        },
      },
    ]);

    const noPoOptions = optionRows
      .map((item) => {
        const noPo = String(item?.noPo || "").trim();
        const idCustomer = String(item?.idCustomer || "").trim();

        if (!noPo) {
          return null;
        }

        return {
          noPo,
          idCustomer,
        };
      })
      .filter((item) => Boolean(item));

    return res.json({
      noPoOptions,
    });
  } catch (_error) {
    return res.status(500).json({ message: "failed to get surat jalan no po options" });
  }
});

module.exports = router;
