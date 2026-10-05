const mongoose = require("mongoose");

const schema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  operation: { type: String, enum: ["cancelUnpaidInvoice"], required: true },
  targetId: { type: mongoose.Schema.Types.ObjectId, required: true },
  reason: { type: String, required: true, minlength: 10, maxlength: 1000 },
  previewHash: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  usedAt: { type: Date, default: null },
  revokedAt: { type: Date, default: null },
}, { timestamps: true });

module.exports = { BreakGlassSession: mongoose.model("BreakGlassSession", schema) };
