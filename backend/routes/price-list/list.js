const express = require("express");

const { PriceList } = require("../../models/PriceList");
const { buildPaginationMeta, buildSearchRegex, parsePositiveInt } = require("../../utils/list-pagination");
const { sanitizePriceList } = require("./sanitize-price-list");

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const query = {};
    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
    const namaBarang = buildSearchRegex(req.query.namaBarang);
    const namaCustomer = buildSearchRegex(req.query.namaCustomer);
    const unit = buildSearchRegex(req.query.unit);
    const sumber = buildSearchRegex(req.query.sumber);
    const page = parsePositiveInt(req.query.page, 1);
    const limit = parsePositiveInt(req.query.limit, 10);

    if (search) query.$text = { $search: search };

    if (namaBarang) query.namaBarang = namaBarang;
    if (namaCustomer) query.namaCustomer = namaCustomer;
    if (unit) query.unit = unit;
    if (sumber) query["riwayatPembelian.sumber"] = sumber;

    if (req.query.hargaJualMin || req.query.hargaJualMax) {
      query.hargaJual = {};
      const min = Number(req.query.hargaJualMin);
      const max = Number(req.query.hargaJualMax);
      if (Number.isFinite(min)) query.hargaJual.$gte = min;
      if (Number.isFinite(max)) query.hargaJual.$lte = max;
      if (Object.keys(query.hargaJual).length === 0) delete query.hargaJual;
    }

    const totalRows = await PriceList.countDocuments(query);
    const pagination = buildPaginationMeta(totalRows, page, limit);
    const items = await PriceList.find(query)
      .sort(search
        ? { score: { $meta: "textScore" }, updatedAt: -1, _id: -1 }
        : { updatedAt: -1, _id: -1 })
      .skip((pagination.page - 1) * pagination.limit)
      .limit(pagination.limit);

    return res.json({
      priceList: items.map(sanitizePriceList),
      pagination,
      summary: { totalRows },
    });
  } catch (_error) {
    return res.status(500).json({ message: "Price list gagal dimuat." });
  }
});

module.exports = router;
