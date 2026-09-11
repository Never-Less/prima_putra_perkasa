const mongoose = require("mongoose");

const paymentTermSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["net", "cashBeforeDelivery", "cashOnDelivery", "dpNet"],
      required: true,
      default: "net",
    },
    netDays: { type: Number, min: 0, max: 3650, required: true, default: 30 },
    downPaymentPercent: { type: Number, min: 0, max: 100, required: true, default: 0 },
    remainingPaymentPercent: { type: Number, min: 0, max: 100, required: true, default: 100 },
  },
  { _id: false }
);

const barangPurchaseOrderSchema = new mongoose.Schema(
  {
    urutan: {
      type: Number,
      min: 1,
      default: null,
    },
    namaBarang: {
      type: String,
      required: true,
      trim: true,
    },
    spesifikasi: {
      type: String,
      trim: true,
      maxlength: 300,
      default: "",
    },
    kuantitas: {
      type: Number,
      required: true,
      min: 0,
    },
    unit: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },
    hargaSatuan: {
      type: Number,
      required: true,
      min: 0,
    },
    jumlah: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false }
);

const purchaseOrderSchema = new mongoose.Schema(
  {
    noPo: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    tanggalPo: {
      type: Date,
      required: true,
    },
    namaCustomer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
      index: true,
    },
    nominalPo: {
      type: Number,
      required: true,
      min: 0,
    },
    barang: {
      type: [barangPurchaseOrderSchema],
      default: [],
    },
    paymentTerm: {
      type: paymentTermSchema,
      default: () => ({
        type: "net",
        netDays: 30,
        downPaymentPercent: 0,
        remainingPaymentPercent: 100,
      }),
    },
    tanggalInvoice: {
      type: Date,
      default: null,
    },
    noInvoice: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Invoice",
      default: null,
      index: true,
    },
    revision: { type: Number, required: true, min: 0, default: 0 },
    revisionHistory: {
      type: [{
        revision: { type: Number, required: true },
        reason: { type: String, trim: true, maxlength: 500, default: "" },
        revisedAt: { type: Date, required: true, default: Date.now },
        revisedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
        snapshot: { type: mongoose.Schema.Types.Mixed, required: true },
        affectedSuratJalan: { type: Number, default: 0 },
        affectedInvoices: { type: Number, default: 0 },
      }],
      default: [],
    },
  },
  { timestamps: true }
);

purchaseOrderSchema.index(
  { noPo: 1 },
  {
    unique: true,
    collation: { locale: "en", strength: 2 },
    name: "uniq_purchase_order_no_po_ci",
  }
);

const PurchaseOrder = mongoose.model("PurchaseOrder", purchaseOrderSchema);

module.exports = {
  PurchaseOrder,
};
