const mongoose = require("mongoose");

const cashTransactionSchema = new mongoose.Schema(
  {
    date: { type: Date, required: true, index: true },
    accountId: { type: mongoose.Schema.Types.ObjectId, ref: "CashAccount", required: true, index: true },
    type: { type: String, required: true, enum: ["in", "out"], index: true },
    category: { type: String, required: true, trim: true, maxlength: 100 },
    amount: { type: Number, required: true, min: 0.01 },
    description: { type: String, trim: true, maxlength: 500, default: "" },
    documentNo: { type: String, trim: true, maxlength: 100, default: "" },
    paymentMethod: { type: String, enum: ["cash", "transfer", "other"], default: "cash" },
    purchaseOrderId: { type: mongoose.Schema.Types.ObjectId, ref: "PurchaseOrder", default: null, index: true },
    invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: "Invoice", default: null, index: true },
    pembelianId: { type: mongoose.Schema.Types.ObjectId, ref: "Pembelian", default: null, index: true },
    supplierId: { type: mongoose.Schema.Types.ObjectId, ref: "Supplier", default: null, index: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", default: null, index: true },
    isPpn: { type: Boolean, required: true, default: false },
    pettyCashBatch: { type: String, trim: true, maxlength: 100, default: "", index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

cashTransactionSchema.index({ accountId: 1, date: -1 });
cashTransactionSchema.index({ purchaseOrderId: 1, type: 1 });

const CashTransaction = mongoose.model("CashTransaction", cashTransactionSchema);

module.exports = { CashTransaction };
