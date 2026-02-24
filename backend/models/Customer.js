const mongoose = require("mongoose");

const customerSchema = new mongoose.Schema(
  {
    Nama: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    Alamat: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    AtasNama: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
  },
  { timestamps: true }
);

const Customer = mongoose.model("Customer", customerSchema);

module.exports = {
  Customer,
};
