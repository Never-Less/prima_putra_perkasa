function validateTags(req, res, next) {
  for (const field of ["productCategories", "productBrands"]) {
    if (req.body?.[field] === undefined) continue;
    const source = Array.isArray(req.body[field]) ? req.body[field] : typeof req.body[field] === "string" ? req.body[field].split(",") : null;
    if (!source || source.some((tag) => typeof tag !== "string")) return res.status(400).json({ code: "supplierOnboarding.tagLimit" });
    const tags = [...new Map(source.map((tag) => tag.trim()).filter(Boolean).map((tag) => [tag.toLowerCase(), tag])).values()];
    if (tags.length > 50 || tags.some((tag) => tag.length > 100)) return res.status(400).json({ code: "supplierOnboarding.tagLimit" });
    req.body[field] = tags;
  }
  next();
}
module.exports = { validateTags };
