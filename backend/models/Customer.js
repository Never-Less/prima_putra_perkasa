const mongoose = require("mongoose");

const paymentTermSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["net", "cashBeforeDelivery", "cashOnDelivery", "dpNet"],
      default: "net",
    },
    netDays: { type: Number, min: 0, max: 3650, default: 30 },
    downPaymentPercent: { type: Number, min: 0, max: 100, default: 0 },
    remainingPaymentPercent: { type: Number, min: 0, max: 100, default: 100 },
  },
  { _id: false }
);

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
    npwp: {
      type: String,
      trim: true,
      maxlength: 100,
      default: "",
    },
    atasNama: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    defaultPaymentTerm: {
      type: paymentTermSchema,
      default: () => ({
        type: "net",
        netDays: 30,
        downPaymentPercent: 0,
        remainingPaymentPercent: 100,
      }),
    },
  },
  { timestamps: true }
);

const Customer = mongoose.model("Customer", customerSchema);

module.exports = {
  Customer,
};
