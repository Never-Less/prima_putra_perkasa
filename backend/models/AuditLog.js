const mongoose = require("mongoose");

const auditChangeSchema = new mongoose.Schema(
  {
    field: { type: String, required: true },
    before: { type: mongoose.Schema.Types.Mixed, default: null },
    after: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { _id: false }
);

const auditLogSchema = new mongoose.Schema(
  {
    entityType: {
      type: String,
      required: true,
      enum: ["purchaseOrder", "suratJalan", "invoice", "pembelian"],
      index: true,
    },
    entityId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    entityLabel: { type: String, trim: true, maxlength: 200, default: "" },
    action: { type: String, required: true, enum: ["create", "update", "delete"] },
    actor: {
      userId: { type: mongoose.Schema.Types.ObjectId, default: null },
      username: { type: String, trim: true, maxlength: 100, default: "" },
      role: { type: String, trim: true, maxlength: 50, default: "" },
    },
    changes: { type: [auditChangeSchema], default: [] },
  },
  { timestamps: true }
);

auditLogSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });

const AuditLog = mongoose.model("AuditLog", auditLogSchema);

module.exports = { AuditLog };
