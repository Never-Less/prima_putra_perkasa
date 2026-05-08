const mongoose = require("mongoose");

const barangInvoiceSchema = new mongoose.Schema(
  {
    namaBarang: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
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

const invoiceSchema = new mongoose.Schema(
  {
    tanggal: {
      type: Date,
      required: true,
    },
    noInvoice: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    noPo: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    noPoList: {
      type: [
        {
          type: String,
          trim: true,
          maxlength: 100,
        },
      ],
      default: undefined,
      index: true,
      validate: {
        validator(value) {
          return (
            value === undefined ||
            (Array.isArray(value) &&
              value.length > 0 &&
              value.every(
                (item) => typeof item === "string" && item.trim().length > 0
              ))
          );
        },
        message: "noPoList minimal 1 item",
      },
    },
    noSuratJalan: {
      type: [
        {
          type: String,
          trim: true,
          maxlength: 100,
        },
      ],
      required: true,
      validate: {
        validator(value) {
          return (
            Array.isArray(value) &&
            value.length > 0 &&
            value.every(
              (item) => typeof item === "string" && item.trim().length > 0
            )
          );
        },
        message: "noSuratJalan minimal 1 item",
      },
    },
    idCustomer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
      index: true,
    },
    barang: {
      type: [barangInvoiceSchema],
      required: true,
      validate: {
        validator(value) {
          return Array.isArray(value) && value.length > 0;
        },
        message: "barang minimal 1 item",
      },
    },
    isPpn: {
      type: Boolean,
      required: true,
      default: true,
    },
    isPaid: {
      type: Boolean,
      required: true,
      default: false,
    },
    tanggalBayar: {
      type: Date,
      default: null,
    },
    ppnRate: {
      type: Number,
      required: true,
      default: 11,
      min: 0,
      max: 100,
    },
    ppnAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    grandTotal: {
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
