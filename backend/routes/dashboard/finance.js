const express = require("express");

const { Invoice } = require("../../models/Invoice");
const { Pembelian } = require("../../models/Pembelian");
const { CashTransaction } = require("../../models/CashTransaction");

const router = express.Router();

function getPeriodStart(value) {
  const months = Math.min(Math.max(Number.parseInt(value, 10) || 12, 1), 24);
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - months + 1, 1));
}

router.get("/", async (req, res) => {
  try {
    const now = new Date();
    const fromDate = getPeriodStart(req.query.months);
    const nextThirtyDays = new Date(now.getTime() + 30 * 86400000);
    const unpaidMatch = { isPaid: { $ne: true } };
    const [billingRows, cashInRows, outstandingRows, overdueRows, payableRows, cashOutRows, cashInMonthly, cashOutMonthly, aging, upcoming] = await Promise.all([
      Invoice.aggregate([{ $match: { tanggal: { $gte: fromDate } } }, { $group: { _id: null, billed: { $sum: "$grandTotal" }, vat: { $sum: "$ppnAmount" } } }]),
      CashTransaction.aggregate([{ $match: { type: "in", date: { $gte: fromDate } } }, { $group: { _id: null, amount: { $sum: "$amount" } } }]),
      Invoice.aggregate([{ $match: unpaidMatch }, { $group: { _id: null, amount: { $sum: "$grandTotal" }, count: { $sum: 1 } } }]),
      Invoice.aggregate([{ $match: { ...unpaidMatch, dueDate: { $lt: now } } }, { $group: { _id: null, amount: { $sum: "$grandTotal" }, count: { $sum: 1 } } }]),
      Pembelian.aggregate([{ $match: { hutang: true, $or: [{ tanggalBayar: null }, { tanggalBayar: { $exists: false } }] } }, { $group: { _id: null, amount: { $sum: "$nilaiNota" }, count: { $sum: 1 } } }]),
      CashTransaction.aggregate([{ $match: { type: "out", date: { $gte: fromDate } } }, { $group: { _id: null, amount: { $sum: "$amount" } } }]),
      CashTransaction.aggregate([
        { $match: { type: "in", date: { $gte: fromDate } } },
        { $group: { _id: { $dateToString: { format: "%Y-%m", date: "$date" } }, amount: { $sum: "$amount" } } },
        { $sort: { _id: 1 } },
      ]),
      CashTransaction.aggregate([
        { $match: { type: "out", date: { $gte: fromDate } } },
        { $group: { _id: { $dateToString: { format: "%Y-%m", date: "$date" } }, amount: { $sum: "$amount" } } },
        { $sort: { _id: 1 } },
      ]),
      Invoice.aggregate([
        { $match: { ...unpaidMatch, dueDate: { $type: "date" } } },
        { $addFields: { overdueDays: { $dateDiff: { startDate: "$dueDate", endDate: now, unit: "day" } } } },
        { $group: { _id: { $switch: { branches: [
          { case: { $lte: ["$overdueDays", 0] }, then: "current" },
          { case: { $lte: ["$overdueDays", 30] }, then: "1-30" },
          { case: { $lte: ["$overdueDays", 60] }, then: "31-60" },
          { case: { $lte: ["$overdueDays", 90] }, then: "61-90" },
        ], default: "90+" } }, amount: { $sum: "$grandTotal" }, count: { $sum: 1 } } },
      ]),
      Invoice.find({ ...unpaidMatch, dueDate: { $gte: now, $lte: nextThirtyDays } }, "noInvoice dueDate grandTotal idCustomer")
        .sort({ dueDate: 1 }).limit(8).populate("idCustomer", "nama").lean(),
    ]);
    const billing = billingRows[0] || { billed: 0, vat: 0 };
    const cashIn = cashInRows[0] || { amount: 0 };
    const cashOut = cashOutRows[0] || { amount: 0 };

    return res.json({
      period: { from: fromDate, to: now },
      summary: {
        billed: billing.billed,
        vat: billing.vat,
        cashIn: cashIn.amount,
        cashOut: cashOut.amount,
        netCashFlow: cashIn.amount - cashOut.amount,
        outstanding: outstandingRows[0] || { amount: 0, count: 0 },
        overdue: overdueRows[0] || { amount: 0, count: 0 },
        payable: payableRows[0] || { amount: 0, count: 0 },
        cashFlowSource: "cashLedger",
      },
      monthly: {
        cashIn: cashInMonthly.map((row) => ({ month: row._id, amount: row.amount })),
        cashOut: cashOutMonthly.map((row) => ({ month: row._id, amount: row.amount })),
      },
      aging: aging.map((row) => ({ bucket: row._id, amount: row.amount, count: row.count })),
      upcoming: upcoming.map((row) => ({ id: row._id, noInvoice: row.noInvoice, dueDate: row.dueDate, amount: row.grandTotal, customerName: row.idCustomer?.nama || "-" })),
    });
  } catch (_error) {
    return res.status(500).json({ message: "failed to get finance dashboard" });
  }
});

module.exports = router;
