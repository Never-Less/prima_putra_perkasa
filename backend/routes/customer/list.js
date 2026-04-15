const express = require("express");

const { Customer } = require("../../models/Customer");
const { sanitizeCustomer } = require("./sanitize-customer");
const {
  buildPaginationMeta,
  buildSearchRegex,
  parsePositiveInt,
} = require("../../utils/list-pagination");

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const query = {};
    const namaRegex = buildSearchRegex(req.query.nama);
    const alamatRegex = buildSearchRegex(req.query.alamat);
    const npwpRegex = buildSearchRegex(req.query.npwp);
    const atasNamaRegex = buildSearchRegex(req.query.atasNama);
    const hasPagination =
      req.query.page !== undefined || req.query.limit !== undefined;
    const requestedPage = parsePositiveInt(req.query.page, 1);
    const requestedLimit = parsePositiveInt(req.query.limit, 10);

    if (namaRegex) {
      query.nama = namaRegex;
    }

    if (alamatRegex) {
      query.alamat = alamatRegex;
    }

    if (npwpRegex) {
      query.npwp = npwpRegex;
    }

    if (atasNamaRegex) {
      query.atasNama = atasNamaRegex;
    }

    const totalRows = await Customer.countDocuments(query);
    const pagination = buildPaginationMeta(
      totalRows,
      hasPagination ? requestedPage : 1,
      hasPagination ? requestedLimit : Math.max(totalRows, 1)
    );

    let customerQuery = Customer.find(query).sort({ createdAt: -1 });

    if (hasPagination) {
      customerQuery = customerQuery
        .skip((pagination.page - 1) * pagination.limit)
        .limit(pagination.limit);
    }

    const customers = await customerQuery;

    return res.json({
      customers: customers.map(sanitizeCustomer),
      pagination,
      summary: {
        totalRows,
      },
    });
  } catch (_error) {
    return res.status(500).json({ message: "failed to get customers" });
  }
});

module.exports = router;
