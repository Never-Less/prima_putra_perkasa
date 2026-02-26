const mongoose = require("mongoose");

const customerSchema = new mongoose.Schema(
  {
    nama: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    alamat: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    atasNama: {
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
