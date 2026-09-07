const mongoose = require("mongoose");

const { AuditLog } = require("../models/AuditLog");
const { Invoice } = require("../models/Invoice");
const { Pembelian } = require("../models/Pembelian");
const { PurchaseOrder } = require("../models/PurchaseOrder");
const { SuratJalan } = require("../models/SuratJalan");

const documentConfigs = [
  { path: "/api/purchase-orders", entityType: "purchaseOrder", model: PurchaseOrder, label: "noPo", responseKey: "purchaseOrder" },
  { path: "/api/surat-jalan", entityType: "suratJalan", model: SuratJalan, label: "noSuratJalan", responseKey: "suratJalan" },
  { path: "/api/invoices", entityType: "invoice", model: Invoice, label: "noInvoice", responseKey: "invoice" },
  { path: "/api/pembelian", entityType: "pembelian", model: Pembelian, label: "noNota", responseKey: "pembelian" },
];

function normalizeSnapshot(value) {
  if (!value) return null;
  const source = typeof value.toObject === "function" ? value.toObject() : value;
  const normalized = JSON.parse(JSON.stringify(source));
  delete normalized.__v;
  delete normalized.createdAt;
  delete normalized.updatedAt;
  return normalized;
}

function buildChanges(before, after) {
  const left = before || {};
  const right = after || {};
  const ignoredFields = new Set(["_id"]);
  const fields = [...new Set([...Object.keys(left), ...Object.keys(right)])]
    .filter((field) => !ignoredFields.has(field));

  return fields.flatMap((field) => {
    const beforeValue = left[field] ?? null;
    const afterValue = right[field] ?? null;
    return JSON.stringify(beforeValue) === JSON.stringify(afterValue)
      ? []
      : [{ field, before: beforeValue, after: afterValue }];
  });
}

function resolveConfig(path) {
  return documentConfigs.find((config) => path === config.path || path.startsWith(`${config.path}/`));
}

function resolveAction(method) {
  if (method === "POST") return "create";
  if (method === "PUT" || method === "PATCH") return "update";
  if (method === "DELETE") return "delete";
  return null;
}

function createDocumentAuditMiddleware() {
  return async (req, res, next) => {
    const config = resolveConfig(req.path);
    const action = resolveAction(req.method);

    if (!config || !action) return next();

    const routeId = String(req.path.slice(config.path.length).split("/").filter(Boolean)[0] || "");
    let beforeDocument = null;

    if (routeId && mongoose.Types.ObjectId.isValid(routeId) && action !== "create") {
      beforeDocument = await config.model.findById(routeId).lean().catch(() => null);
    }

    let responseBody = null;
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      responseBody = body;
      return originalJson(body);
    };

    res.on("finish", () => {
      if (res.statusCode < 200 || res.statusCode >= 300) return;

      void (async () => {
        const responseDocument = responseBody?.[config.responseKey] || null;
        const entityId = routeId || String(responseDocument?.id || responseDocument?._id || "");
        if (!mongoose.Types.ObjectId.isValid(entityId)) return;

        const afterDocument = action === "delete"
          ? null
          : await config.model.findById(entityId).lean().catch(() => null);
        const before = normalizeSnapshot(beforeDocument);
        const after = normalizeSnapshot(afterDocument);
        const changes = buildChanges(before, after);
        if (action === "update" && changes.length === 0) return;

        const labelSource = after || before || responseDocument || {};
        await AuditLog.create({
          entityType: config.entityType,
          entityId,
          entityLabel: String(labelSource[config.label] || "").trim(),
          action,
          actor: {
            userId: req.user?._id || null,
            username: String(req.user?.username || "").trim(),
            role: String(req.user?.role || "").trim(),
          },
          changes,
        });
      })().catch((error) => console.error("Failed to write document audit log:", error.message));
    });

    return next();
  };
}

module.exports = { createDocumentAuditMiddleware };
