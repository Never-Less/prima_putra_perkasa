const mongoose = require("mongoose");

// Keep binary data out of supplier queries and below MongoDB's per-document limit.
const SupplierDocument = mongoose.model("SupplierDocument", new mongoose.Schema({
  supplierId: { type: mongoose.Schema.Types.ObjectId, ref: "Supplier", required: true, index: true },
  name: { type: String, required: true, maxlength: 200 },
  size: { type: Number, required: true },
  data: { type: Buffer, required: true, select: false },
}, { timestamps: true }));

module.exports = { SupplierDocument };
