const mongoose = require("mongoose");

const cashAccountSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    type: { type: String, required: true, enum: ["cash", "bank"], default: "cash" },
    openingBalance: { type: Number, required: true, default: 0 },
    isActive: { type: Boolean, required: true, default: true },
  },
  { timestamps: true }
);

cashAccountSchema.index({ name: 1 }, { unique: true, collation: { locale: "en", strength: 2 } });

const CashAccount = mongoose.model("CashAccount", cashAccountSchema);

module.exports = { CashAccount };
