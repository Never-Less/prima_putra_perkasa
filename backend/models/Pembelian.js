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
    idSupplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supplier",
      default: null,
      index: true,
    },
    noNota: {
      type: String,
      trim: true,
      maxlength: 50,
      default: "",
    },
    note: {
      type: String,
      trim: true,
      maxlength: 500,
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
        "Isi tanggal jatuh tempo saat status hutang aktif."
      );
    }

    if (!Number.isFinite(this.lamaHutang) || this.lamaHutang <= 0) {
      this.invalidate(
        "lamaHutang",
        "Isi lama hutang lebih dari 0 hari saat status hutang aktif."
      );
    }
  } else {
    this.lamaHutang = 0;
  }
});

pembelianSchema.index({ hutang: 1, tanggalBayar: 1 });
pembelianSchema.index({ tanggalNota: -1 });

const Pembelian = mongoose.model("Pembelian", pembelianSchema);

module.exports = {
  Pembelian,
};
