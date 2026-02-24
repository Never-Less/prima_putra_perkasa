const mongoose = require("mongoose");

const barangSchema = new mongoose.Schema(
  {
    Nama: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    Jumlah: {
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
    Tanggal: {
      type: Date,
      required: true,
    },
    IdCustomer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
      index: true,
    },
    Barang: {
      type: [barangSchema],
      required: true,
      validate: {
        validator(value) {
          return Array.isArray(value) && value.length > 0;
        },
        message: "Barang minimal 1 item",
      },
    },
    Kendaraan: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    Tipe: {
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
