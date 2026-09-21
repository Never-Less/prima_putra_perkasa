const express = require("express");

const { Invoice } = require("../../models/Invoice");
const { Pembelian } = require("../../models/Pembelian");
const { sanitizePembelian } = require("./sanitize-pembelian");
const {
  buildPaginationMeta,
  buildSearchRegex,
  parsePositiveInt,
} = require("../../utils/list-pagination");

const router = express.Router();

function matchesStockLabel(value) {
  const normalizedValue = String(value || "").trim().toLowerCase();

  return "stock".includes(normalizedValue) || "stok".includes(normalizedValue);
}

function appendAndCondition(query, condition) {
  query.$and = [...(query.$and || []), condition];
}

router.get("/", async (req, res) => {
  try {
    const query = {};
    const namaSupplierRegex = buildSearchRegex(req.query.namaSupplier);
    const noNotaRegex = buildSearchRegex(req.query.noNota);
    const noInvoiceRegex = buildSearchRegex(req.query.noInvoice);
    const hasPagination =
      req.query.page !== undefined || req.query.limit !== undefined;
    const requestedPage = parsePositiveInt(req.query.page, 1);
    const requestedLimit = parsePositiveInt(req.query.limit, 5);

    if (namaSupplierRegex) {
      query.namaSupplier = namaSupplierRegex;
    }

    if (noNotaRegex) {
      query.noNota = noNotaRegex;
    }

    if (req.query.hutang === "true") {
      query.hutang = true;
    } else if (req.query.hutang === "false") {
      query.hutang = false;
    }

    if (req.query.ppn === "true") {
      query.ppn = true;
    } else if (req.query.ppn === "false") {
      query.ppn = false;
    }

    if (req.query.statusPembayaran === "paid") {
      appendAndCondition(query, {
        $or: [{ hutang: false }, { tanggalBayar: { $ne: null } }],
      });
    } else if (req.query.statusPembayaran === "unpaid") {
      appendAndCondition(query, { hutang: true, tanggalBayar: null });
    }

    if (req.query.tanggalNotaDari || req.query.tanggalNotaSampai) {
      query.tanggalNota = {};

      if (req.query.tanggalNotaDari) {
        const fromDate = new Date(req.query.tanggalNotaDari);
        if (!Number.isNaN(fromDate.getTime())) {
          query.tanggalNota.$gte = fromDate;
        }
      }

      if (req.query.tanggalNotaSampai) {
        const toDate = new Date(req.query.tanggalNotaSampai);
        if (!Number.isNaN(toDate.getTime())) {
          toDate.setHours(23, 59, 59, 999);
          query.tanggalNota.$lte = toDate;
        }
      }

      if (Object.keys(query.tanggalNota).length === 0) {
        delete query.tanggalNota;
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

    if (req.query.nilaiNotaMin || req.query.nilaiNotaMax) {
      query.nilaiNota = {};

      if (req.query.nilaiNotaMin !== undefined) {
        const minValue = Number(req.query.nilaiNotaMin);
        if (Number.isFinite(minValue)) {
          query.nilaiNota.$gte = minValue;
        }
      }

      if (req.query.nilaiNotaMax !== undefined) {
        const maxValue = Number(req.query.nilaiNotaMax);
        if (Number.isFinite(maxValue)) {
          query.nilaiNota.$lte = maxValue;
        }
      }

      if (Object.keys(query.nilaiNota).length === 0) {
        delete query.nilaiNota;
      }
    }

    if (noInvoiceRegex) {
      const invoices = await Invoice.find({ noInvoice: noInvoiceRegex }, "_id").lean();
      const invoiceIds = invoices.map((invoice) => invoice._id);
      const includeStock = matchesStockLabel(req.query.noInvoice);

      if (invoiceIds.length === 0 && !includeStock) {
        const pagination = buildPaginationMeta(
          0,
          hasPagination ? requestedPage : 1,
          hasPagination ? requestedLimit : 1
        );

        return res.json({
          pembelians: [],
          pagination,
          summary: {
            totalRows: 0,
            totalGroups: 0,
          },
        });
      }

      if (invoiceIds.length > 0 && includeStock) {
        query.$or = [{ idInvoice: { $in: invoiceIds } }, { idInvoice: null }];
      } else if (invoiceIds.length > 0) {
        query.idInvoice = {
          $in: invoiceIds,
        };
      } else {
        query.idInvoice = null;
      }
    }

    const totalRows = await Pembelian.countDocuments(query);
    const pagination = buildPaginationMeta(
      totalRows,
      hasPagination ? requestedPage : 1,
      hasPagination ? requestedLimit : Math.max(totalRows, 1)
    );

    let pembelianQuery = Pembelian.find(query).sort({ createdAt: -1 });

    if (hasPagination) {
      pembelianQuery = pembelianQuery
        .skip((pagination.page - 1) * pagination.limit)
        .limit(pagination.limit);
    }

    const pembelianList = await pembelianQuery;

    return res.json({
      pembelians: pembelianList.map(sanitizePembelian),
      pagination,
      summary: {
        totalRows,
        totalGroups: totalRows,
      },
    });
  } catch (_error) {
    return res.status(500).json({ message: "failed to get pembelian list" });
  }
});

module.exports = router;
