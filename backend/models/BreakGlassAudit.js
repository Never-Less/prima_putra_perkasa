const mongoose = require("mongoose");

const schema = new mongoose.Schema({
  sessionId: { type: mongoose.Schema.Types.ObjectId, default: null, index: true },
  actorId: { type: mongoose.Schema.Types.ObjectId, required: true },
  actorUsername: { type: String, required: true },
  actorRole: { type: String, enum: ["owner", "developer"], required: true },
  event: { type: String, enum: ["activated", "denied", "revoked", "executed"], required: true },
  operation: { type: String, required: true },
  targetId: { type: mongoose.Schema.Types.ObjectId, required: true },
  reason: { type: String, required: true, maxlength: 1000 },
  before: { type: mongoose.Schema.Types.Mixed, default: null },
  after: { type: mongoose.Schema.Types.Mixed, default: null },
}, { timestamps: true });

module.exports = { BreakGlassAudit: mongoose.model("BreakGlassAudit", schema) };
