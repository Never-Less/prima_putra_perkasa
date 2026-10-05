const router = require("express").Router();
const { Invoice } = require("../../models/Invoice");
router.get("/invoice-options", async (req, res, next) => {
  const q = typeof req.query.q === "string" ? req.query.q.trim().slice(0, 100) : "";
  if (q.length < 2) return res.json({ options: [] });
  try {
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const rows = await Invoice.find({ isPaid: false, noInvoice: { $regex: escaped, $options: "i" } }).sort({ tanggal: -1, _id: -1 }).limit(25).select("_id noInvoice").lean();
    return res.json({ options: rows.map((row) => ({ value: String(row._id), label: row.noInvoice })) });
  } catch (error) { next(error); }
});
module.exports = router;
