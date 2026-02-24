const mongoose = require("mongoose");

const barangInvoiceSchema = new mongoose.Schema(
  {
    Kuantitas: {
      type: Number,
      required: true,
      min: 0,
    },
    Unit: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },
    HargaSatuan: {
      type: Number,
      required: true,
      min: 0,
    },
    Jumlah: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false }
);

const invoiceSchema = new mongoose.Schema(
  {
    Tanggal: {
      type: Date,
      required: true,
    },
    NoInvoice: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    NoPO: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    NoSuratJalan: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    IdCustomer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
      index: true,
    },
    Barang: {
      type: [barangInvoiceSchema],
      required: true,
      validate: {
        validator(value) {
          return Array.isArray(value) && value.length > 0;
        },
        message: "Barang minimal 1 item",
      },
    },
    IsPpn: {
      type: Boolean,
      required: true,
      default: true,
    },
    PpnRate: {
      type: Number,
      required: true,
      default: 11,
      min: 0,
      max: 100,
    },
    PpnAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    Subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    GrandTotal: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { timestamps: true }
);

const Invoice = mongoose.model("Invoice", invoiceSchema);

module.exports = {
  Invoice,
};
