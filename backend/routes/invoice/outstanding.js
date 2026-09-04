const express = require("express");

const { Customer } = require("../../models/Customer");
const { Invoice } = require("../../models/Invoice");
const { calculateDueDate } = require("../../utils/payment-term");
const { sanitizeInvoice } = require("./sanitize-invoice");

const router = express.Router();

router.get("/outstanding", async (req, res) => {
  try {
    const query = { isPaid: { $ne: true } };
    const customerId = String(req.query.customerId || "").trim();
    const dueMonth = String(req.query.dueMonth || "").trim();
    const overdueLevel = String(req.query.overdueLevel || "").trim();

    if (customerId) {
      query.idCustomer = customerId;
    }

    const invoices = await Invoice.find(query).sort({ dueDate: 1, tanggal: 1 }).lean();
    const customerIds = [...new Set(invoices.map((invoice) => String(invoice.idCustomer)))];
    const customers = await Customer.find({ _id: { $in: customerIds } }, "nama").lean();
    const customerNames = new Map(customers.map((customer) => [String(customer._id), customer.nama]));
    const now = new Date();
    const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());

    const rows = invoices
      .map((invoice) => {
        const dueDate = invoice.dueDate || calculateDueDate(invoice.tanggal, invoice.paymentTerm);
        const dueUtc = Date.UTC(
          dueDate.getUTCFullYear(),
          dueDate.getUTCMonth(),
          dueDate.getUTCDate()
        );
        const overdueDays = Math.max(0, Math.floor((todayUtc - dueUtc) / 86400000));
        const warningLevel = overdueDays > 7 ? "critical" : overdueDays > 3 ? "warning" : "normal";

        return {
          ...sanitizeInvoice({ ...invoice, dueDate }),
          customerName: customerNames.get(String(invoice.idCustomer)) || "-",
          overdueDays,
          warningLevel,
        };
      })
      .filter((row) => !dueMonth || String(row.dueDate).slice(0, 7) === dueMonth)
      .filter((row) => !overdueLevel || row.warningLevel === overdueLevel);

    return res.json({
      invoices: rows,
      summary: {
        totalRows: rows.length,
        totalOutstanding: rows.reduce((total, row) => total + Number(row.grandTotal || 0), 0),
      },
    });
  } catch (_error) {
    return res.status(500).json({ message: "Tagihan belum dibayar belum bisa dimuat." });
  }
});

module.exports = router;
