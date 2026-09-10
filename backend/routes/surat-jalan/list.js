const express = require("express");

const { Customer } = require("../../models/Customer");
const { PurchaseOrder } = require("../../models/PurchaseOrder");
const { SuratJalan } = require("../../models/SuratJalan");
const { sanitizeSuratJalan } = require("./sanitize-surat-jalan");
const { buildSalesOrderWorkflow } = require("../../utils/sales-order-workflow");
const {
  buildPaginationMeta,
  buildSearchRegex,
  parsePositiveInt,
} = require("../../utils/list-pagination");

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const query = {};
    const andConditions = [];
    const noSuratJalanRegex = buildSearchRegex(req.query.noSuratJalan);
    const noPoRegex = buildSearchRegex(req.query.noPo);
    const namaBarangRegex = buildSearchRegex(req.query.namaBarang);
    const kodeDepartemenRegex = buildSearchRegex(req.query.kodeDepartemen);
    const customerRegex = buildSearchRegex(req.query.idCustomer);
    const kendaraanRegex = buildSearchRegex(req.query.kendaraan);
    const hasPagination =
      req.query.page !== undefined || req.query.limit !== undefined;
    const requestedPage = parsePositiveInt(req.query.page, 1);
    const requestedLimit = parsePositiveInt(req.query.limit, 5);

    if (noSuratJalanRegex) {
      query.noSuratJalan = noSuratJalanRegex;
    }

    if (noPoRegex) {
      query.noPo = noPoRegex;
    }

    if (namaBarangRegex) {
      andConditions.push({
        $or: [
          { "barang.nama": namaBarangRegex },
          { "barang.spesifikasi": namaBarangRegex },
        ],
      });
    }

    if (kodeDepartemenRegex) {
      andConditions.push({
        $or: [
          { "barang.kodeDepartemen": kodeDepartemenRegex },
          { kodeDepartemen: kodeDepartemenRegex },
        ],
      });
    }

    if (andConditions.length > 0) {
      query.$and = andConditions;
    }

    if (kendaraanRegex) {
      query.kendaraan = kendaraanRegex;
    }


    if (req.query.tanggalDari || req.query.tanggalSampai) {
      query.tanggal = {};

      if (req.query.tanggalDari) {
        const fromDate = new Date(req.query.tanggalDari);
        if (!Number.isNaN(fromDate.getTime())) {
          query.tanggal.$gte = fromDate;
        }
      }

      if (req.query.tanggalSampai) {
        const toDate = new Date(req.query.tanggalSampai);
        if (!Number.isNaN(toDate.getTime())) {
          toDate.setHours(23, 59, 59, 999);
          query.tanggal.$lte = toDate;
        }
      }

      if (Object.keys(query.tanggal).length === 0) {
        delete query.tanggal;
      }
    }

    if (customerRegex) {
      const customers = await Customer.find({ nama: customerRegex }, "_id").lean();
      const customerIds = customers.map((customer) => customer._id);

      if (customerIds.length === 0) {
        const pagination = buildPaginationMeta(
          0,
          hasPagination ? requestedPage : 1,
          hasPagination ? requestedLimit : 1
        );

        return res.json({
          suratJalan: [],
          pagination,
          summary: {
            totalRows: 0,
            totalGroups: 0,
          },
        });
      }

      query.idCustomer = {
        $in: customerIds,
      };
    }

    const [totalRows, noPoGroups] = await Promise.all([
      SuratJalan.countDocuments(query),
      SuratJalan.distinct("noPo", query),
    ]);
    const totalGroups = noPoGroups.length;
    const pagination = buildPaginationMeta(
      totalRows,
      hasPagination ? requestedPage : 1,
      hasPagination ? requestedLimit : Math.max(totalRows, 1)
    );

    let suratJalanQuery = SuratJalan.find(query).sort({
      createdAt: -1,
      noPo: 1,
    });

    if (hasPagination) {
      suratJalanQuery = suratJalanQuery
        .skip((pagination.page - 1) * pagination.limit)
        .limit(pagination.limit);
    }

    const suratJalanList = totalRows > 0 ? await suratJalanQuery.lean() : [];
    const noPoList = Array.from(new Set(suratJalanList.map((row) => row.noPo).filter(Boolean)));
    const [purchaseOrderList, allLinkedSuratJalan] = noPoList.length > 0
      ? await Promise.all([
          PurchaseOrder.find({ noPo: { $in: noPoList } }).lean(),
          SuratJalan.find({ noPo: { $in: noPoList } }).lean(),
        ])
      : [[], []];
    const purchaseOrderByNoPo = new Map(
      purchaseOrderList.map((row) => [String(row.noPo || "").trim().toLowerCase(), row])
    );
    const suratJalanByNoPo = new Map();
    allLinkedSuratJalan.forEach((row) => {
      const key = String(row.noPo || "").trim().toLowerCase();
      suratJalanByNoPo.set(key, [...(suratJalanByNoPo.get(key) || []), row]);
    });

    return res.json({
      suratJalan: suratJalanList.map((suratJalan) => {
        const key = String(suratJalan.noPo || "").trim().toLowerCase();
        const purchaseOrder = purchaseOrderByNoPo.get(key);
        const workflow = purchaseOrder
          ? buildSalesOrderWorkflow(
              purchaseOrder,
              suratJalanByNoPo.get(key) || [],
              []
            )
          : null;
        return sanitizeSuratJalan(suratJalan, workflow?.deliveryStatus || null);
      }),
      pagination,
      summary: {
        totalRows,
        totalGroups,
      },
    });
  } catch (_error) {
    return res.status(500).json({ message: "failed to get surat jalan" });
  }
});

module.exports = router;
