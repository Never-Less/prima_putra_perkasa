function normalizeDocumentLinks(value = []) {
  if (!Array.isArray(value) || value.length > 10) return null;
  const links = [];
  for (const row of value) {
    if (!row || typeof row.label !== "string" || typeof row.url !== "string") return null;
    const label = row.label.trim();
    const url = row.url.trim();
    if (!label || label.length > 100 || !url || url.length > 1000) return null;
    try {
      const parsed = new URL(url);
      if (!/^https?:\/\//i.test(url) || !["http:", "https:"].includes(parsed.protocol) || !parsed.hostname || parsed.username || parsed.password) return null;
    } catch { return null; }
    if (!links.some((link) => link.url === url && link.label === label)) links.push({ label, url });
  }
  return links;
}

function validateDocumentLinks(req, res, next) {
  if (req.body.documentLinks !== undefined) {
    const links = normalizeDocumentLinks(req.body.documentLinks);
    if (!links) return res.status(400).json({ code: "supplierOnboarding.error.documentLinks" });
    req.body.documentLinks = links;
  }
  next();
}

module.exports = { normalizeDocumentLinks, validateDocumentLinks };
