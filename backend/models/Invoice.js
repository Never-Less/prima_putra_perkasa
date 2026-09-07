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

const barangInvoiceSourceSchema = new mongoose.Schema(
  {
    suratJalanId: {
      type: String,
      trim: true,
      maxlength: 100,
      default: "",
    },
    noSuratJalan: {
      type: String,
      trim: true,
      maxlength: 100,
      default: "",
    },
    noPo: {
      type: String,
      trim: true,
      maxlength: 100,
      default: "",
    },
    barangId: {
      type: String,
      trim: true,
      maxlength: 120,
      default: "",
    },
    kuantitas: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false }
);

const barangInvoiceSchema = new mongoose.Schema(
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
    noPoManual: {
      type: String,
      trim: true,
      maxlength: 100,
      default: "",
    },
    sources: {
      type: [barangInvoiceSourceSchema],
      default: [],
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
        message: "Pilih minimal satu No. SO.",
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
      default: [],
      index: true,
      validate: {
        validator(value) {
          return (
            Array.isArray(value) &&
            value.every(
              (item) => typeof item === "string" && item.trim().length > 0
            )
          );
        },
        message: "No. Surat Jalan yang dipilih tidak valid.",
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
        message: "Isi minimal satu barang invoice.",
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
    paymentTerm: {
      type: paymentTermSchema,
      default: () => ({
        type: "net",
        netDays: 30,
        downPaymentPercent: 0,
        remainingPaymentPercent: 100,
      }),
    },
    dueDate: {
      type: Date,
      required: true,
      index: true,
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

invoiceSchema.index({ tanggal: -1 });
invoiceSchema.index({ isPaid: 1, dueDate: 1 });
invoiceSchema.index({ isPaid: 1, tanggalBayar: -1 });

const Invoice = mongoose.model("Invoice", invoiceSchema);

module.exports = {
  Invoice,
};
