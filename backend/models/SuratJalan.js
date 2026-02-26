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
    noSuratJalan: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    noPo: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    tanggal: {
      type: Date,
      required: true,
    },
    idCustomer: {
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
  },
  { timestamps: true }
);

const SuratJalan = mongoose.model("SuratJalan", suratJalanSchema);

module.exports = {
  SuratJalan,
};
