const { createHash } = require("node:crypto");
const { Invoice } = require("../../models/Invoice");
const { PurchaseOrder } = require("../../models/PurchaseOrder");
const { CashTransaction } = require("../../models/CashTransaction");
const { BreakGlassAudit } = require("../../models/BreakGlassAudit");
const { getBreakGlassRole } = require("../../utils/break-glass-access");
const { getInvoiceNoPoList } = require("../invoice/sanitize-invoice");

const operation = "cancelUnpaidInvoice";
function reject(status, message) {
  const error = new Error(message);
  error.documentResponse = { status, body: { message } };
  throw error;
}
function hashSnapshot(snapshot) {
  return createHash("sha256").update(JSON.stringify(snapshot)).digest("hex");
}
async function snapshot(targetId) {
  const invoice = await Invoice.findById(targetId).lean();
  if (!invoice) reject(404, "Invoice tidak ditemukan.");
  if (invoice.isPaid || invoice.tanggalBayar) reject(409, "Invoice yang sudah dibayar tidak dapat dibatalkan lewat operasi ini.");
  if (await CashTransaction.exists({ $or: [{ invoiceId: invoice._id }, { documentNo: invoice.noInvoice }] })) {
    reject(409, "Invoice memiliki transaksi kas/bank. Selesaikan rekonsiliasi terlebih dahulu.");
  }
  const orders = await PurchaseOrder.find({ $or: [{ noPo: { $in: getInvoiceNoPoList(invoice) } }, { noInvoice: invoice._id }] }).sort({ _id: 1 }).lean();
  return { invoice, orders };
}
function audit(req, event, data) {
  return BreakGlassAudit.create({
    actorId: req.user._id, actorUsername: req.user.username,
    actorRole: getBreakGlassRole(req.user._id), event, operation, ...data,
  });
}
module.exports = { operation, reject, hashSnapshot, snapshot, audit };
