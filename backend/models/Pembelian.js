const mongoose = require("mongoose");

const pembelianSchema = new mongoose.Schema(
  {
    TanggalNota: {
      type: Date,
      required: true,
    },
    NamaSupplier: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },
    NoNpwp: {
      type: String,
      trim: true,
      maxlength: 50,
      default: "",
    },
    IdInvoice: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Invoice",
      default: null,
      index: true,
    },
    Hutang: {
      type: Boolean,
      required: true,
      default: false,
    },
    Ppn: {
      type: Boolean,
      required: true,
      default: false,
    },
    LamaHutang: {
      type: Number,
      min: 0,
      default: 0,
    },
    NilaiNota: {
      type: Number,
      required: true,
      min: 0,
    },
    TanggalJatuhTempo: {
      type: Date,
      default: null,
    },
    TanggalBayar: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

pembelianSchema.pre("validate", function validatePembelian(next) {
  if (this.Hutang) {
    if (!this.TanggalJatuhTempo) {
      this.invalidate(
        "TanggalJatuhTempo",
        "TanggalJatuhTempo wajib diisi saat Hutang bernilai true"
      );
    }

    if (!Number.isFinite(this.LamaHutang) || this.LamaHutang <= 0) {
      this.invalidate("LamaHutang", "LamaHutang wajib lebih dari 0 saat Hutang bernilai true");
    }
  } else {
    this.LamaHutang = 0;
  }

  if (this.TanggalBayar && this.TanggalBayar < this.TanggalNota) {
    this.invalidate("TanggalBayar", "TanggalBayar tidak boleh lebih kecil dari TanggalNota");
  }

  next();
});

const Pembelian = mongoose.model("Pembelian", pembelianSchema);

module.exports = {
  Pembelian,
};
