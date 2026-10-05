const router = require("express").Router();
const { BreakGlassSession } = require("../../models/BreakGlassSession");
const { documentMutation } = require("../../utils/document-mutation");
const { isValidId } = require("../invoice/validators");
const { audit, reject } = require("./service");
router.post("/sessions/:id/revoke", documentMutation(async (req, res) => {
  if (!isValidId(req.params.id)) reject(400, "ID sesi tidak valid.");
  const session = await BreakGlassSession.findOneAndUpdate({ _id: req.params.id, userId: req.user._id, usedAt: null, revokedAt: null }, { $set: { revokedAt: new Date() } }, { new: true });
  if (!session) reject(409, "Sesi tidak tersedia.");
  await audit(req, "revoked", { sessionId: session._id, targetId: session.targetId, reason: session.reason });
  return res.json({ message: "Sesi dicabut." });
}));
module.exports = router;
