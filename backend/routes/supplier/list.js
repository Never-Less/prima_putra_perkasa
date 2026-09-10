const express = require("express");

const { Supplier } = require("../../models/Supplier");
const { sanitizeSupplier } = require("./sanitize-supplier");
const {
  buildPaginationMeta,
  buildSearchRegex,
  parsePositiveInt,
} = require("../../utils/list-pagination");

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const query = {};
    const status = req.query.onboardingStatus;
    if (status === "notGenerated") {
      query.$or = [{ "onboarding.status": "notGenerated" }, { "onboarding.status": { $exists: false } }];
    } else if (["generated", "sent", "submitted", "completed"].includes(status)) {
      query["onboarding.status"] = status;
    }
    const namaSupplierRegex = buildSearchRegex(req.query.namaSupplier);
    const hasPagination =
      req.query.page !== undefined || req.query.limit !== undefined;
    const requestedPage = parsePositiveInt(req.query.page, 1);
    const requestedLimit = parsePositiveInt(req.query.limit, 10);

    if (namaSupplierRegex) {
      query.namaSupplier = namaSupplierRegex;
    }

    if (req.query.hutang === "true") {
      query.hutang = true;
    } else if (req.query.hutang === "false") {
      query.hutang = false;
    }

    if (req.query.lamaHutangMin || req.query.lamaHutangMax) {
      query.lamaHutang = {};

      if (req.query.lamaHutangMin !== undefined) {
        const minValue = Number(req.query.lamaHutangMin);
        if (Number.isFinite(minValue)) {
          query.lamaHutang.$gte = minValue;
        }
      }

      if (req.query.lamaHutangMax !== undefined) {
        const maxValue = Number(req.query.lamaHutangMax);
        if (Number.isFinite(maxValue)) {
          query.lamaHutang.$lte = maxValue;
        }
      }

      if (Object.keys(query.lamaHutang).length === 0) {
        delete query.lamaHutang;
      }
    }

    const totalRows = await Supplier.countDocuments(query);
    const pagination = buildPaginationMeta(
      totalRows,
      hasPagination ? requestedPage : 1,
      hasPagination ? requestedLimit : Math.max(totalRows, 1)
    );

    const sorts = { updatedDesc: { updatedAt: -1, _id: -1 }, updatedAsc: { updatedAt: 1, _id: 1 }, nameAsc: { namaSupplier: 1, _id: 1 }, nameDesc: { namaSupplier: -1, _id: -1 } };
    let supplierQuery = Supplier.find(query).select("-onboarding.pendingData").sort(sorts[req.query.sort] || { createdAt: -1 });

    if (hasPagination) {
      supplierQuery = supplierQuery
        .skip((pagination.page - 1) * pagination.limit)
        .limit(pagination.limit);
    }

    const suppliers = await supplierQuery;

    return res.json({
      suppliers: suppliers.map(sanitizeSupplier),
      pagination,
      summary: {
        totalRows,
      },
    });
  } catch (_error) {
    return res.status(500).json({ message: "failed to get suppliers" });
  }
});

module.exports = router;
