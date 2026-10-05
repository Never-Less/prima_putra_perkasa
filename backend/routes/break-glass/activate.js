const router = require("express").Router();
const { User } = require("../../models/User");
const { BreakGlassSession } = require("../../models/BreakGlassSession");
const { createRateLimit } = require("../../middlewares/rate-limit");
const { documentMutation } = require("../../utils/document-mutation");
const { isValidId } = require("../invoice/validators");
const { operation, snapshot, hashSnapshot, audit } = require("./service");

router.post("/sessions", createRateLimit({ max: 5 }), async (req, res, next) => {
  const { targetId, reason, password } = req.body || {};
  if (req.body?.operation !== operation || !isValidId(targetId) || typeof reason !== "string" || reason.trim().length < 10 || reason.trim().length > 1000 || typeof password !== "string" || password.length > 200) {
    return res.status(400).json({ message: "Pilih operasi dan ID invoice yang valid, isi password serta alasan 10–1000 karakter." });
  }
  try {
    const user = await User.findById(req.user._id).select("+password");
    if (!user || !await user.comparePassword(password)) {
      await audit(req, "denied", { targetId, reason: "Verifikasi password gagal." });
      return res.status(403).json({ message: "Verifikasi password gagal." });
    }
    return documentMutation(async (request, response) => {
      const before = await snapshot(targetId);
      const session = await BreakGlassSession.create({ userId: user._id, operation, targetId, reason: reason.trim(), previewHash: hashSnapshot(before), expiresAt: new Date(Date.now() + 5 * 60 * 1000) });
      await audit(request, "activated", { sessionId: session._id, targetId, reason: session.reason });
      return response.status(201).json({ sessionId: session._id, expiresAt: session.expiresAt, preview: { noInvoice: before.invoice.noInvoice, noPoList: before.orders.map((order) => order.noPo), noSuratJalan: before.invoice.noSuratJalan, grandTotal: before.invoice.grandTotal } });
    })(req, res, next);
  } catch (error) { next(error); }
});
module.exports = router;
