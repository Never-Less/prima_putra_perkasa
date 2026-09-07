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
    alamat: { type: String, trim: true, maxlength: 500, default: "" },
    npwp: { type: String, trim: true, maxlength: 100, default: "" },
    picName: { type: String, trim: true, maxlength: 120, default: "" },
    phone: { type: String, trim: true, maxlength: 50, default: "" },
    email: { type: String, trim: true, lowercase: true, maxlength: 150, default: "" },
    productCategories: {
      type: [{ type: String, trim: true, maxlength: 100 }],
      default: [],
    },
    notes: { type: String, trim: true, maxlength: 1000, default: "" },
    documentLinks: {
      type: [{
        label: { type: String, trim: true, maxlength: 100, required: true },
        url: { type: String, trim: true, maxlength: 1000, required: true },
      }],
      default: [],
    },
    isActive: { type: Boolean, required: true, default: true },
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
