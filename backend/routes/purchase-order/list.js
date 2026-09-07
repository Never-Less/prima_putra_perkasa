const express = require("express");

const { Customer } = require("../../models/Customer");
const { Invoice } = require("../../models/Invoice");
const { PurchaseOrder } = require("../../models/PurchaseOrder");
const { SuratJalan } = require("../../models/SuratJalan");
const { sanitizePurchaseOrder } = require("./sanitize-purchase-order");
const {
  buildSalesOrderWorkflow,
  indexSalesOrderRelations,
} = require("../../utils/sales-order-workflow");
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
    const namaBarangRegex = buildSearchRegex(req.query.namaBarang);
    const noInvoiceRegex = buildSearchRegex(req.query.noInvoice);
    const workflowStatus = String(req.query.workflowStatus || "").trim();
    const hasPagination =
      req.query.page !== undefined || req.query.limit !== undefined;
    const requestedPage = parsePositiveInt(req.query.page, 1);
    const requestedLimit = parsePositiveInt(req.query.limit, 10);

    if (noPoRegex) {
      query.noPo = noPoRegex;
    }

    if (workflowStatus === "withoutSuratJalan") {
      const noPoWithSuratJalan = await SuratJalan.distinct("noPo", {
        noPo: { $exists: true, $ne: "" },
      });
      const noPoCondition = { $nin: noPoWithSuratJalan };

      if (query.noPo) {
        query.$and = [{ noPo: query.noPo }, { noPo: noPoCondition }];
        delete query.noPo;
      } else {
        query.noPo = noPoCondition;
      }
    } else if (workflowStatus === "readyForInvoice") {
      const [invoicedSuratJalanNumbers, nonPartialSuratJalan] = await Promise.all([
        Invoice.distinct("noSuratJalan"),
        SuratJalan.find(
          { tipe: "non partial" },
          "noPo noSuratJalan"
        ).lean(),
      ]);
      const invoicedNumberSet = new Set(
        invoicedSuratJalanNumbers
          .map((value) => String(value || "").trim().toLowerCase())
          .filter(Boolean)
      );
      const readyNoPo = Array.from(
        new Set(
          nonPartialSuratJalan
            .filter(
              (item) =>
                !invoicedNumberSet.has(
                  String(item?.noSuratJalan || "").trim().toLowerCase()
                )
            )
            .map((item) => String(item?.noPo || "").trim())
            .filter(Boolean)
        )
      );
      const noPoCondition = { $in: readyNoPo };

      if (query.noPo) {
        query.$and = [{ noPo: query.noPo }, { noPo: noPoCondition }];
        delete query.noPo;
      } else {
        query.noPo = noPoCondition;
      }
    }

    if (namaBarangRegex) {
      query.$and = [
        ...(query.$and || []),
        {
          $or: [
            { "barang.namaBarang": namaBarangRegex },
            { "barang.spesifikasi": namaBarangRegex },
          ],
        },
      ];
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

    const tanggalInvoiceDari = req.query.tanggalInvoiceDari;
    const tanggalInvoiceSampai = req.query.tanggalInvoiceSampai;

    if (tanggalInvoiceDari || tanggalInvoiceSampai) {
      query.tanggalInvoice = {};

      if (tanggalInvoiceDari) {
        const fromDate = new Date(tanggalInvoiceDari);
        if (!Number.isNaN(fromDate.getTime())) {
          query.tanggalInvoice.$gte = fromDate;
        }
      }

      if (tanggalInvoiceSampai) {
        const toDate = new Date(tanggalInvoiceSampai);
        if (!Number.isNaN(toDate.getTime())) {
          toDate.setHours(23, 59, 59, 999);
          query.tanggalInvoice.$lte = toDate;
        }
      }

      if (Object.keys(query.tanggalInvoice).length === 0) {
        delete query.tanggalInvoice;
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

    const purchaseOrders = await purchaseOrderQuery.lean();
    const noPoList = purchaseOrders.map((row) => row.noPo).filter(Boolean);
    const [suratJalanList, invoiceList] = noPoList.length > 0
      ? await Promise.all([
          SuratJalan.find({ noPo: { $in: noPoList } }).lean(),
          Invoice.find({
            $or: [
              { noPoList: { $in: noPoList } },
              { noPo: { $in: noPoList } },
              { "barang.sources.noPo": { $in: noPoList } },
              { "barang.noPoManual": { $in: noPoList } },
            ],
          }).lean(),
        ])
      : [[], []];
    const relations = indexSalesOrderRelations(suratJalanList, invoiceList);

    return res.json({
      purchaseOrders: purchaseOrders.map((purchaseOrder) => {
        const key = String(purchaseOrder.noPo || "").trim().toLowerCase();
        const workflow = buildSalesOrderWorkflow(
          purchaseOrder,
          relations.suratJalanByNoPo.get(key) || [],
          relations.invoiceByNoPo.get(key) || []
        );
        return sanitizePurchaseOrder(purchaseOrder, workflow);
      }),
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
