const express = require("express");

const { Customer } = require("../../models/Customer");
const { Invoice } = require("../../models/Invoice");
const { PurchaseOrder } = require("../../models/PurchaseOrder");
const { sanitizePurchaseOrder } = require("./sanitize-purchase-order");
const {
  buildPaginationMeta,
  buildSearchRegex,
  parsePositiveInt,
} = require("../../utils/list-pagination");

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const query = {};
    const noPoRegex = buildSearchRegex(req.query.noPo);
    const namaCustomerRegex = buildSearchRegex(req.query.namaCustomer);
    const noInvoiceRegex = buildSearchRegex(req.query.noInvoice);
    const hasPagination =
      req.query.page !== undefined || req.query.limit !== undefined;
    const requestedPage = parsePositiveInt(req.query.page, 1);
    const requestedLimit = parsePositiveInt(req.query.limit, 10);

    if (noPoRegex) {
      query.noPo = noPoRegex;
    }

    if (req.query.isPaid === "true") {
      query.isPaid = true;
    } else if (req.query.isPaid === "false") {
      query.isPaid = false;
    }

    if (req.query.tanggalPoDari || req.query.tanggalPoSampai) {
      query.tanggalPo = {};

      if (req.query.tanggalPoDari) {
        const fromDate = new Date(req.query.tanggalPoDari);
        if (!Number.isNaN(fromDate.getTime())) {
          query.tanggalPo.$gte = fromDate;
        }
      }

      if (req.query.tanggalPoSampai) {
        const toDate = new Date(req.query.tanggalPoSampai);
        if (!Number.isNaN(toDate.getTime())) {
          toDate.setHours(23, 59, 59, 999);
          query.tanggalPo.$lte = toDate;
        }
      }

      if (Object.keys(query.tanggalPo).length === 0) {
        delete query.tanggalPo;
      }
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

    if (req.query.tanggalKirimDari || req.query.tanggalKirimSampai) {
      query.tanggalKirim = {};

      if (req.query.tanggalKirimDari) {
        const fromDate = new Date(req.query.tanggalKirimDari);
        if (!Number.isNaN(fromDate.getTime())) {
          query.tanggalKirim.$gte = fromDate;
        }
      }

      if (req.query.tanggalKirimSampai) {
        const toDate = new Date(req.query.tanggalKirimSampai);
        if (!Number.isNaN(toDate.getTime())) {
          toDate.setHours(23, 59, 59, 999);
          query.tanggalKirim.$lte = toDate;
        }
      }

      if (Object.keys(query.tanggalKirim).length === 0) {
        delete query.tanggalKirim;
      }
    }

    if (req.query.nominalPoMin || req.query.nominalPoMax) {
      query.nominalPo = {};

      if (req.query.nominalPoMin !== undefined) {
        const minValue = Number(req.query.nominalPoMin);
        if (Number.isFinite(minValue)) {
          query.nominalPo.$gte = minValue;
        }
      }

      if (req.query.nominalPoMax !== undefined) {
        const maxValue = Number(req.query.nominalPoMax);
        if (Number.isFinite(maxValue)) {
          query.nominalPo.$lte = maxValue;
        }
      }

      if (Object.keys(query.nominalPo).length === 0) {
        delete query.nominalPo;
      }
    }

    if (namaCustomerRegex) {
      const customers = await Customer.find({ nama: namaCustomerRegex }, "_id").lean();
      const customerIds = customers.map((customer) => customer._id);

      if (customerIds.length === 0) {
        const pagination = buildPaginationMeta(
          0,
          hasPagination ? requestedPage : 1,
          hasPagination ? requestedLimit : 1
        );

        return res.json({
          purchaseOrders: [],
          pagination,
          summary: {
            totalRows: 0,
          },
        });
      }

      query.namaCustomer = {
        $in: customerIds,
      };
    }

    if (noInvoiceRegex) {
      const invoices = await Invoice.find({ noInvoice: noInvoiceRegex }, "_id").lean();
      const invoiceIds = invoices.map((invoice) => invoice._id);

      if (invoiceIds.length === 0) {
        const pagination = buildPaginationMeta(
          0,
          hasPagination ? requestedPage : 1,
          hasPagination ? requestedLimit : 1
        );

        return res.json({
          purchaseOrders: [],
          pagination,
          summary: {
            totalRows: 0,
          },
        });
      }

      query.noInvoice = {
        $in: invoiceIds,
      };
    }

    const totalRows = await PurchaseOrder.countDocuments(query);
    const pagination = buildPaginationMeta(
      totalRows,
      hasPagination ? requestedPage : 1,
      hasPagination ? requestedLimit : Math.max(totalRows, 1)
    );

    let purchaseOrderQuery = PurchaseOrder.find(query).sort({ createdAt: -1 });

    if (hasPagination) {
      purchaseOrderQuery = purchaseOrderQuery
        .skip((pagination.page - 1) * pagination.limit)
        .limit(pagination.limit);
    }

    const purchaseOrders = await purchaseOrderQuery;

    return res.json({
      purchaseOrders: purchaseOrders.map(sanitizePurchaseOrder),
      pagination,
      summary: {
        totalRows,
      },
    });
  } catch (_error) {
    return res.status(500).json({ message: "failed to get purchase orders" });
  }
});

module.exports = router;
