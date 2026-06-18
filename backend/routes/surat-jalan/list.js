const express = require("express");

const { Customer } = require("../../models/Customer");
const { SuratJalan } = require("../../models/SuratJalan");
const { sanitizeSuratJalan } = require("./sanitize-surat-jalan");
const {
  buildPaginationMeta,
  buildSearchRegex,
  parsePositiveInt,
} = require("../../utils/list-pagination");

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const query = {};
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
      query["barang.nama"] = namaBarangRegex;
    }

    if (kodeDepartemenRegex) {
      query.$or = [
        { "barang.kodeDepartemen": kodeDepartemenRegex },
        { kodeDepartemen: kodeDepartemenRegex },
      ];
    }

    if (kendaraanRegex) {
      query.kendaraan = kendaraanRegex;
    }

    if (req.query.tipe) {
      query.tipe = String(req.query.tipe || "").trim();
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

    const totalRows = await SuratJalan.countDocuments(query);
    const noPoGroups = await SuratJalan.distinct("noPo", query);
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

    const suratJalanList = totalRows > 0 ? await suratJalanQuery : [];

    return res.json({
      suratJalan: suratJalanList.map(sanitizeSuratJalan),
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
