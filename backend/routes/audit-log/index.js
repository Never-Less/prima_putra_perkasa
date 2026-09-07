const express = require("express");
const mongoose = require("mongoose");

const { requireAuth } = require("../../middlewares/auth");
const { AuditLog } = require("../../models/AuditLog");

const router = express.Router();
const allowedEntityTypes = ["purchaseOrder", "suratJalan", "invoice", "pembelian"];

router.use(requireAuth);

router.get("/", async (req, res) => {
  const entityType = String(req.query.entityType || "").trim();
  const entityId = String(req.query.entityId || "").trim();

  if (!allowedEntityTypes.includes(entityType) || !mongoose.Types.ObjectId.isValid(entityId)) {
    return res.status(400).json({ message: "Dokumen untuk riwayat perubahan tidak valid." });
  }

  try {
    const logs = await AuditLog.find({ entityType, entityId })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    return res.json({
      logs: logs.map((log) => ({
        id: log._id,
        entityType: log.entityType,
        entityId: log.entityId,
        entityLabel: log.entityLabel,
        action: log.action,
        actor: log.actor,
        changes: log.changes,
        createdAt: log.createdAt,
      })),
    });
  } catch (_error) {
    return res.status(500).json({ message: "Riwayat perubahan belum bisa dimuat." });
  }
});

module.exports = router;
