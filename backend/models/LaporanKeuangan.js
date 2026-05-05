const mongoose = require("mongoose");

const BULAN_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

const rincianBiayaSchema = new mongoose.Schema(
  {
    namaBiaya: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    jumlah: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false }
);

const laporanKeuanganSchema = new mongoose.Schema(
  {
    bulan: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      match: BULAN_PATTERN,
    },
    rincianBiaya: {
      type: [rincianBiayaSchema],
      default: [],
    },
  },
  { timestamps: true }
);

laporanKeuanganSchema.pre("validate", function validateLaporanKeuangan() {
  if (!Array.isArray(this.rincianBiaya) || this.rincianBiaya.length === 0) {
    this.invalidate("rincianBiaya", "minimal satu rincianBiaya wajib diisi");
  }
});

const LaporanKeuangan = mongoose.model("LaporanKeuangan", laporanKeuanganSchema);

module.exports = {
  BULAN_PATTERN,
  LaporanKeuangan,
};
