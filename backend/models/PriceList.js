const mongoose = require("mongoose");

const purchaseHistorySchema = new mongoose.Schema(
  {
    sumber: { type: String, required: true, trim: true, maxlength: 150 },
    tanggal: { type: Date, required: true },
    hargaBeli: { type: Number, required: true, min: 0 },
  },
  { _id: true }
);

const priceListSchema = new mongoose.Schema(
  {
    legacyId: { type: String, trim: true },
    namaBarang: { type: String, required: true, trim: true, maxlength: 200 },
    hargaJual: { type: Number, required: true, min: 0 },
    tanggalJual: { type: Date, required: true },
    unit: { type: String, required: true, trim: true, maxlength: 50 },
    idCustomer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      default: null,
      index: true,
    },
    namaCustomer: { type: String, required: true, trim: true, maxlength: 120 },
    deskripsi: { type: String, trim: true, maxlength: 1000, default: "" },
    images: { type: [String], default: [] },
    riwayatPembelian: { type: [purchaseHistorySchema], default: [] },
  },
  { timestamps: true }
);

priceListSchema.index({ legacyId: 1 }, { unique: true, sparse: true });
priceListSchema.index({ namaCustomer: 1, namaBarang: 1 });
priceListSchema.index({ namaBarang: "text", deskripsi: "text", unit: "text" });

const PriceList = mongoose.model("PriceList", priceListSchema);

module.exports = { PriceList };
