function escapeRegex(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildSearchRegex(value) {
  const text = String(value || "").trim();

  if (!text) {
    return null;
  }

  return new RegExp(escapeRegex(text), "i");
}

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(String(value || ""), 10);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}

function buildPaginationMeta(totalItems, page, limit) {
  const safeLimit = Math.max(1, parsePositiveInt(limit, 1));
  const totalPages = Math.max(1, Math.ceil(totalItems / safeLimit));
  const currentPage = Math.min(Math.max(1, parsePositiveInt(page, 1)), totalPages);

  return {
    page: currentPage,
    limit: safeLimit,
    totalItems,
    totalPages,
  };
}

module.exports = {
  buildPaginationMeta,
  buildSearchRegex,
  parsePositiveInt,
};
