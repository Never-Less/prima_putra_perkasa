const express = require("express");
const mongoose = require("mongoose");
const { documentMutation } = require("../../utils/document-mutation");

const { requireAuth } = require("../../middlewares/auth");
const { CashAccount } = require("../../models/CashAccount");
const { CashTransaction } = require("../../models/CashTransaction");
const { Customer } = require("../../models/Customer");
const { Invoice } = require("../../models/Invoice");
const { Pembelian } = require("../../models/Pembelian");
const { PurchaseOrder } = require("../../models/PurchaseOrder");
const { Supplier } = require("../../models/Supplier");

const router = express.Router();
router.use(requireAuth);

function validId(value) {
  return !value || mongoose.Types.ObjectId.isValid(String(value));
}

function serializeAccount(account, movement = 0) {
  return {
    id: account._id,
    name: account.name,
    type: account.type,
    openingBalance: Number(account.openingBalance || 0),
    balance: Number(account.openingBalance || 0) + Number(movement || 0),
    isActive: account.isActive,
  };
}

function serializeTransaction(row) {
  const reference = (value, label) => value && ({ id: value._id || value, label: value[label] || "" });
  return {
    id: row._id,
    date: row.date,
    account: reference(row.accountId, "name"),
    type: row.type,
    category: row.category,
    amount: row.amount,
    description: row.description,
    documentNo: row.documentNo,
    paymentMethod: row.paymentMethod,
    salesOrder: reference(row.purchaseOrderId, "noPo"),
    invoice: reference(row.invoiceId, "noInvoice"),
    pembelian: reference(row.pembelianId, "noNota"),
    supplier: reference(row.supplierId, "namaSupplier"),
    customer: reference(row.customerId, "nama"),
    isPpn: row.isPpn,
    pettyCashBatch: row.pettyCashBatch,
    createdAt: row.createdAt,
  };
}

router.get("/accounts", async (_req, res) => {
  try {
    const [accounts, movements] = await Promise.all([
      CashAccount.find().sort({ isActive: -1, name: 1 }).lean(),
      CashTransaction.aggregate([
        { $group: { _id: "$accountId", movement: { $sum: { $cond: [{ $eq: ["$type", "in"] }, "$amount", { $multiply: ["$amount", -1] }] } } } },
      ]),
    ]);
    const byAccount = new Map(movements.map((row) => [String(row._id), row.movement]));
    return res.json({ accounts: accounts.map((row) => serializeAccount(row, byAccount.get(String(row._id)))) });
  } catch (_error) {
    return res.status(500).json({ message: "Daftar kas dan rekening belum bisa dimuat." });
  }
});

router.post("/accounts", async (req, res) => {
  const name = String(req.body.name || "").trim();
  const type = String(req.body.type || "cash").trim();
  const openingBalance = Number(req.body.openingBalance || 0);
  if (!name || !["cash", "bank"].includes(type) || !Number.isFinite(openingBalance)) {
    return res.status(400).json({ message: "Lengkapi nama, jenis, dan saldo awal akun." });
  }
  try {
    const account = await CashAccount.create({ name, type, openingBalance });
    return res.status(201).json({ account: serializeAccount(account) });
  } catch (error) {
    return res.status(error?.code === 11000 ? 409 : 500).json({ message: error?.code === 11000 ? "Nama kas atau rekening sudah digunakan." : "Akun belum bisa disimpan." });
  }
});

router.get("/options", async (_req, res) => {
  try {
    const [accounts, salesOrders, invoices, purchases, suppliers, customers] = await Promise.all([
      CashAccount.find({ isActive: true }).sort({ name: 1 }).select("name type").lean(),
      PurchaseOrder.find().sort({ tanggalPo: -1 }).limit(500).select("noPo").lean(),
      Invoice.find().sort({ tanggal: -1 }).limit(500).select("noInvoice").lean(),
      Pembelian.find().sort({ tanggalNota: -1 }).limit(500).select("noNota namaSupplier").lean(),
      Supplier.find().sort({ namaSupplier: 1 }).select("namaSupplier").lean(),
      Customer.find().sort({ nama: 1 }).select("nama").lean(),
    ]);
    const map = (rows, label) => rows.map((row) => ({ id: row._id, label: row[label] || "-" }));
    return res.json({ accounts: accounts.map((row) => ({ id: row._id, label: row.name, type: row.type })), salesOrders: map(salesOrders, "noPo"), invoices: map(invoices, "noInvoice"), purchases: purchases.map((row) => ({ id: row._id, label: row.noNota || `${row.namaSupplier} (tanpa nomor)` })), suppliers: map(suppliers, "namaSupplier"), customers: map(customers, "nama") });
  } catch (_error) {
    return res.status(500).json({ message: "Pilihan transaksi belum bisa dimuat." });
  }
});

router.get("/transactions", async (req, res) => {
  const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 500);
  const query = {};
  if (req.query.accountId && mongoose.Types.ObjectId.isValid(req.query.accountId)) query.accountId = req.query.accountId;
  if (["in", "out"].includes(req.query.type)) query.type = req.query.type;
  if (req.query.from || req.query.to) {
    query.date = {};
    if (req.query.from) query.date.$gte = new Date(req.query.from);
    if (req.query.to) { const end = new Date(req.query.to); end.setUTCHours(23, 59, 59, 999); query.date.$lte = end; }
  }
  try {
    const rows = await CashTransaction.find(query).sort({ date: -1, createdAt: -1 }).limit(limit)
      .populate("accountId", "name").populate("purchaseOrderId", "noPo").populate("invoiceId", "noInvoice")
      .populate("pembelianId", "noNota").populate("supplierId", "namaSupplier").populate("customerId", "nama").lean();
    return res.json({ transactions: rows.map(serializeTransaction) });
  } catch (_error) {
    return res.status(500).json({ message: "Transaksi kas dan bank belum bisa dimuat." });
  }
});

router.post("/transactions", documentMutation(async (req, res) => {
  const payload = {
    date: new Date(req.body.date), accountId: req.body.accountId, type: String(req.body.type || ""),
    category: String(req.body.category || "").trim(), amount: Number(req.body.amount),
    description: String(req.body.description || "").trim(), documentNo: String(req.body.documentNo || "").trim(),
    paymentMethod: String(req.body.paymentMethod || "cash"), purchaseOrderId: req.body.purchaseOrderId || null,
    invoiceId: req.body.invoiceId || null, pembelianId: req.body.pembelianId || null,
    supplierId: req.body.supplierId || null, customerId: req.body.customerId || null,
    isPpn: Boolean(req.body.isPpn), pettyCashBatch: String(req.body.pettyCashBatch || "").trim(), createdBy: req.user?._id || null,
  };
  const refs = [payload.accountId, payload.purchaseOrderId, payload.invoiceId, payload.pembelianId, payload.supplierId, payload.customerId];
  if (Number.isNaN(payload.date.getTime()) || !validId(payload.accountId) || refs.some((value) => !validId(value)) || !["in", "out"].includes(payload.type) || !payload.category || !Number.isFinite(payload.amount) || payload.amount <= 0) {
    return res.status(400).json({ message: "Lengkapi tanggal, akun, jenis, kategori, dan nominal transaksi." });
  }
  try {
    if (!(await CashAccount.exists({ _id: payload.accountId, isActive: true }))) return res.status(404).json({ message: "Kas atau rekening tidak ditemukan." });
    if (payload.invoiceId && !(await Invoice.exists({ _id: payload.invoiceId }))) return res.status(409).json({ message: "Invoice tidak tersedia. Muat ulang pilihan invoice." });
    const row = await CashTransaction.create(payload);
    await row.populate("accountId", "name");
    return res.status(201).json({ transaction: serializeTransaction(row) });
  } catch (_error) {
    if (_error?.hasErrorLabel?.("TransientTransactionError")) throw _error;
    return res.status(500).json({ message: "Transaksi belum bisa disimpan." });
  }
}));

router.delete("/transactions/:id", async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ message: "Transaksi tidak valid." });
  const deleted = await CashTransaction.findByIdAndDelete(req.params.id);
  return deleted ? res.json({ message: "transaction deleted" }) : res.status(404).json({ message: "Transaksi tidak ditemukan." });
});

router.get("/profitability", async (_req, res) => {
  try {
    const [salesOrders, invoices, costs] = await Promise.all([
      PurchaseOrder.find().sort({ tanggalPo: -1 }).limit(500).select("noPo nominalPo tanggalPo namaCustomer").populate("namaCustomer", "nama").lean(),
      Invoice.find().select("noPo noPoList subtotal barang.sources barang.noPoManual").lean(),
      CashTransaction.aggregate([{ $match: { type: "out", purchaseOrderId: { $ne: null } } }, { $group: { _id: "$purchaseOrderId", actualCost: { $sum: "$amount" } } }]),
    ]);
    const costMap = new Map(costs.map((row) => [String(row._id), Number(row.actualCost || 0)]));
    const revenueMap = new Map();
    invoices.forEach((invoice) => {
      const numbers = Array.isArray(invoice.noPoList) && invoice.noPoList.length
        ? invoice.noPoList.map(String)
        : String(invoice.noPo || "").split(",").map((value) => value.trim()).filter(Boolean);
      if (numbers.length === 1) revenueMap.set(numbers[0].toLowerCase(), (revenueMap.get(numbers[0].toLowerCase()) || 0) + Number(invoice.subtotal || 0));
    });
    return res.json({ rows: salesOrders.map((row) => {
      const revenue = revenueMap.get(String(row.noPo || "").toLowerCase()) || Number(row.nominalPo || 0);
      const actualCost = costMap.get(String(row._id)) || 0;
      return { id: row._id, noPo: row.noPo, tanggalPo: row.tanggalPo, customerName: row.namaCustomer?.nama || "-", revenue, actualCost, grossProfit: revenue - actualCost, marginPercent: revenue > 0 ? ((revenue - actualCost) / revenue) * 100 : 0, hasActualCost: actualCost > 0 };
    }) });
  } catch (_error) {
    return res.status(500).json({ message: "Laporan profit per SO belum bisa dimuat." });
  }
});

module.exports = router;
