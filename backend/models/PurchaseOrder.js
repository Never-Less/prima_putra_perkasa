const mongoose = require("mongoose");

const barangPurchaseOrderSchema = new mongoose.Schema(
  {
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
  },
  { timestamps: true }
);

const PurchaseOrder = mongoose.model("PurchaseOrder", purchaseOrderSchema);

module.exports = {
  PurchaseOrder,
};
