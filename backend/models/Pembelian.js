const mongoose = require("mongoose");

const pembelianSchema = new mongoose.Schema(
  {
    tanggalNota: {
      type: Date,
      required: true,
    },
    namaSupplier: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },
    noNpwp: {
      type: String,
      trim: true,
      maxlength: 50,
      default: "",
    },
    idInvoice: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Invoice",
      default: null,
      index: true,
    },
    hutang: {
      type: Boolean,
      required: true,
      default: false,
    },
    ppn: {
      type: Boolean,
      required: true,
      default: false,
    },
    lamaHutang: {
      type: Number,
      min: 0,
      default: 0,
    },
    nilaiNota: {
      type: Number,
      required: true,
      min: 0,
    },
    tanggalJatuhTempo: {
      type: Date,
      default: null,
    },
    tanggalBayar: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

pembelianSchema.pre("validate", function validatePembelian() {
  if (this.hutang) {
    if (!this.tanggalJatuhTempo) {
      this.invalidate(
        "tanggalJatuhTempo",
        "tanggalJatuhTempo wajib diisi saat hutang bernilai true"
      );
    }

    if (!Number.isFinite(this.lamaHutang) || this.lamaHutang <= 0) {
      this.invalidate("lamaHutang", "lamaHutang wajib lebih dari 0 saat hutang bernilai true");
    }
  } else {
    this.lamaHutang = 0;
  }

  if (this.tanggalBayar && this.tanggalBayar < this.tanggalNota) {
    this.invalidate("tanggalBayar", "tanggalBayar tidak boleh lebih kecil dari tanggalNota");
  }
});

const Pembelian = mongoose.model("Pembelian", pembelianSchema);

module.exports = {
  Pembelian,
};
