const mongoose = require("mongoose");

const barangSchema = new mongoose.Schema(
  {
    nama: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    jumlah: {
      type: Number,
      required: true,
      min: 1,
    },
  },
  { _id: false }
);

const suratJalanSchema = new mongoose.Schema(
  {
    NoSuratJalan: {
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
    tanggal: {
      type: Date,
      required: true,
    },
    IdCustomer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
      index: true,
    },
    barang: {
      type: [barangSchema],
      required: true,
      validate: {
        validator(value) {
          return Array.isArray(value) && value.length > 0;
        },
        message: "barang minimal 1 item",
      },
    },
    kendaraan: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    tipe: {
      type: String,
      required: true,
      enum: ["partial", "non partial"],
      lowercase: true,
      trim: true,
    },
    SudahSelesai: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

const SuratJalan = mongoose.model("SuratJalan", suratJalanSchema);

module.exports = {
  SuratJalan,
};
