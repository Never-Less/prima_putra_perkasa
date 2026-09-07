const express = require("express");

const { Invoice } = require("../../models/Invoice");

const router = express.Router();

function getPeriodStart(value) {
  const months = Math.min(Math.max(Number.parseInt(value, 10) || 12, 1), 24);
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - months + 1, 1));
}

router.get("/sales", async (req, res) => {
  try {
    const fromDate = getPeriodStart(req.query.months);
    const match = { tanggal: { $gte: fromDate } };
    const [summaryRows, monthly, topCustomers, topProducts, paymentStatus] = await Promise.all([
      Invoice.aggregate([
        { $match: match },
        {
          $group: {
            _id: null,
            revenue: { $sum: "$grandTotal" },
            subtotal: { $sum: "$subtotal" },
            invoiceCount: { $sum: 1 },
            averageInvoice: { $avg: "$grandTotal" },
          },
        },
      ]),
      Invoice.aggregate([
        { $match: match },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m", date: "$tanggal" } },
            revenue: { $sum: "$grandTotal" },
            invoiceCount: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      Invoice.aggregate([
        { $match: match },
        { $group: { _id: "$idCustomer", revenue: { $sum: "$grandTotal" }, invoiceCount: { $sum: 1 } } },
        { $sort: { revenue: -1 } },
        { $limit: 8 },
        { $lookup: { from: "customers", localField: "_id", foreignField: "_id", as: "customer" } },
        { $project: { _id: 0, customerId: "$_id", name: { $ifNull: [{ $arrayElemAt: ["$customer.nama", 0] }, "-"] }, revenue: 1, invoiceCount: 1 } },
      ]),
      Invoice.aggregate([
        { $match: match },
        { $unwind: "$barang" },
        {
          $group: {
            _id: {
              name: "$barang.namaBarang",
              specification: { $ifNull: ["$barang.spesifikasi", ""] },
              unit: "$barang.unit",
            },
            quantity: { $sum: "$barang.kuantitas" },
            revenue: { $sum: "$barang.jumlah" },
          },
        },
        { $sort: { revenue: -1 } },
        { $limit: 8 },
        { $project: { _id: 0, name: "$_id.name", specification: "$_id.specification", unit: "$_id.unit", quantity: 1, revenue: 1 } },
      ]),
      Invoice.aggregate([
        { $match: match },
        { $group: { _id: "$isPaid", count: { $sum: 1 }, amount: { $sum: "$grandTotal" } } },
      ]),
    ]);
    const summary = summaryRows[0] || { revenue: 0, subtotal: 0, invoiceCount: 0, averageInvoice: 0 };
    const paid = paymentStatus.find((row) => row._id === true) || { count: 0, amount: 0 };
    const unpaid = paymentStatus.find((row) => row._id !== true) || { count: 0, amount: 0 };

    return res.json({
      period: { from: fromDate, to: new Date() },
      summary: { ...summary, paidCount: paid.count, unpaidCount: unpaid.count, paidAmount: paid.amount, unpaidAmount: unpaid.amount },
      monthly: monthly.map((row) => ({ month: row._id, revenue: row.revenue, invoiceCount: row.invoiceCount })),
      topCustomers,
      topProducts,
    });
  } catch (_error) {
    return res.status(500).json({ message: "failed to get sales dashboard" });
  }
});

module.exports = router;
