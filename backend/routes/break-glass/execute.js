const router = require("express").Router();
const { BreakGlassSession } = require("../../models/BreakGlassSession");
const { Invoice } = require("../../models/Invoice");
const { PurchaseOrder } = require("../../models/PurchaseOrder");
const { AuditLog } = require("../../models/AuditLog");
const { documentMutation } = require("../../utils/document-mutation");
const { syncPurchaseOrderByNoPo } = require("../../utils/sync-purchase-order-from-invoice");
const { getInvoiceNoPoList } = require("../invoice/sanitize-invoice");
const { isValidId } = require("../invoice/validators");
const { snapshot, hashSnapshot, audit, reject } = require("./service");

router.post("/sessions/:id/execute", documentMutation(async (req, res) => {
  if (!isValidId(req.params.id)) reject(400, "ID sesi tidak valid.");
  const session = await BreakGlassSession.findOneAndUpdate({ _id: req.params.id, userId: req.user._id, operation: "cancelUnpaidInvoice", usedAt: null, revokedAt: null, expiresAt: { $gt: new Date() } }, { $set: { usedAt: new Date() } }, { new: true });
  if (!session) reject(409, "Sesi kedaluwarsa, dicabut, sudah digunakan, atau bukan milik Anda.");
  const before = await snapshot(session.targetId);
  if (hashSnapshot(before) !== session.previewHash) reject(409, "Data berubah sejak preview. Aktifkan sesi baru dan tinjau ulang.");
  if (req.body?.confirmation !== before.invoice.noInvoice) reject(400, "Ketik nomor invoice persis untuk konfirmasi.");
  await Invoice.deleteOne({ _id: session.targetId });
  const noPoList = [...new Set([...getInvoiceNoPoList(before.invoice), ...before.orders.map((order) => order.noPo)])];
  for (const noPo of noPoList) await syncPurchaseOrderByNoPo(noPo);
  const after = { invoice: null, orders: await PurchaseOrder.find({ _id: { $in: before.orders.map((order) => order._id) } }).sort({ _id: 1 }).lean() };
  await audit(req, "executed", { sessionId: session._id, targetId: session.targetId, reason: session.reason, before, after });
  await AuditLog.create({ entityType: "invoice", entityId: session.targetId, entityLabel: before.invoice.noInvoice, action: "delete", actor: { userId: req.user._id, username: req.user.username, role: req.user.role }, changes: [{ field: "breakGlass", before: { invoice: before.invoice, reason: session.reason, sessionId: session._id }, after: null }] });
  return res.json({ message: "Invoice dibatalkan dan referensi SO disinkronkan.", sessionId: session._id });
}));
module.exports = router;
