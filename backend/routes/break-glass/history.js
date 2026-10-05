const router = require("express").Router();
const { BreakGlassAudit } = require("../../models/BreakGlassAudit");
router.get("/history", async (_req, res, next) => {
  try {
    const events = await BreakGlassAudit.find().sort({ createdAt: -1, _id: -1 }).limit(50).select("actorUsername actorRole event operation targetId reason createdAt sessionId").lean();
    return res.json({ events });
  } catch (error) { next(error); }
});
module.exports = router;
