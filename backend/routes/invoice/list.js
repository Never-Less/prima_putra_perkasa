const express = require("express");

const { Customer } = require("../../models/Customer");
const { Invoice } = require("../../models/Invoice");
const { sanitizeInvoice } = require("./sanitize-invoice");
const {
  buildPaginationMeta,
  buildSearchRegex,
  parsePositiveInt,
} = require("../../utils/list-pagination");

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const query = {};
    const noInvoiceRegex = buildSearchRegex(req.query.noInvoice);
    const noPoRegex = buildSearchRegex(req.query.noPo);
    const noSuratJalanRegex = buildSearchRegex(req.query.noSuratJalan);
    const customerRegex = buildSearchRegex(req.query.idCustomer);
    const hasPagination =
      req.query.page !== undefined || req.query.limit !== undefined;
    const requestedPage = parsePositiveInt(req.query.page, 1);
    const requestedLimit = parsePositiveInt(req.query.limit, 10);

    if (noInvoiceRegex) {
      query.noInvoice = noInvoiceRegex;
    }

    if (noPoRegex) {
      query.noPo = noPoRegex;
    }

    if (noSuratJalanRegex) {
      query.noSuratJalan = noSuratJalanRegex;
    }

    if (req.query.isPpn === "true") {
      query.isPpn = true;
    } else if (req.query.isPpn === "false") {
      query.isPpn = false;
    }

    if (req.query.isPaid === "true") {
      query.isPaid = true;
    } else if (req.query.isPaid === "false") {
      query.isPaid = false;
    }

    if (req.query.tanggalBayarDari || req.query.tanggalBayarSampai) {
      query.tanggalBayar = {};

      if (req.query.tanggalBayarDari) {
        const fromDate = new Date(req.query.tanggalBayarDari);
        if (!Number.isNaN(fromDate.getTime())) {
          query.tanggalBayar.$gte = fromDate;
        }
      }

      if (req.query.tanggalBayarSampai) {
        const toDate = new Date(req.query.tanggalBayarSampai);
        if (!Number.isNaN(toDate.getTime())) {
          toDate.setHours(23, 59, 59, 999);
          query.tanggalBayar.$lte = toDate;
        }
      }

      if (Object.keys(query.tanggalBayar).length === 0) {
        delete query.tanggalBayar;
      }
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
          invoices: [],
          pagination,
          summary: {
            totalRows: 0,
          },
        });
      }

      query.idCustomer = {
        $in: customerIds,
      };
    }

    const totalRows = await Invoice.countDocuments(query);
    const pagination = buildPaginationMeta(
      totalRows,
      hasPagination ? requestedPage : 1,
      hasPagination ? requestedLimit : Math.max(totalRows, 1)
    );

    let invoiceQuery = Invoice.find(query).sort({ createdAt: -1 });

    if (hasPagination) {
      invoiceQuery = invoiceQuery
        .skip((pagination.page - 1) * pagination.limit)
        .limit(pagination.limit);
    }

    const invoices = await invoiceQuery;

    return res.json({
      invoices: invoices.map(sanitizeInvoice),
      pagination,
      summary: {
        totalRows,
      },
    });
  } catch (_error) {
    return res.status(500).json({ message: "failed to get invoices" });
  }
});

module.exports = router;
