const mongoose = require("mongoose");

const supplierSchema = new mongoose.Schema(
  {
    namaSupplier: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },
    hutang: {
      type: Boolean,
      required: true,
      default: false,
    },
    lamaHutang: {
      type: Number,
      min: 0,
      default: null,
    },
  },
  { timestamps: true }
);

supplierSchema.pre("validate", function validateSupplier() {
  if (this.hutang) {
    if (!Number.isFinite(this.lamaHutang) || this.lamaHutang <= 0) {
      this.invalidate(
        "lamaHutang",
        "Isi lama hutang lebih dari 0 hari saat status hutang aktif."
      );
    }

    return;
  }

  this.lamaHutang = null;
});

const Supplier = mongoose.model("Supplier", supplierSchema);

module.exports = {
  Supplier,
};
