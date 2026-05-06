const mongoose = require("mongoose");

const purchaseOrderSchema = new mongoose.Schema(
  {
    noPo: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    tanggalPo: {
      type: Date,
      required: true,
    },
    namaCustomer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
      index: true,
    },
    nominalPo: {
      type: Number,
      required: true,
      min: 0,
    },
    tanggalInvoice: {
      type: Date,
      default: null,
    },
    noInvoice: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Invoice",
      default: null,
      index: true,
    },
  },
  { timestamps: true }
);

const PurchaseOrder = mongoose.model("PurchaseOrder", purchaseOrderSchema);

module.exports = {
  PurchaseOrder,
};
