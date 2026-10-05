// Privileged identities are configured by deployment operators, never by User CRUD.
function configuredIds(name) {
  return String(process.env[name] || "").split(",").map((id) => id.trim().toLowerCase())
    .filter((id) => /^[a-f0-9]{24}$/.test(id));
}

function getBreakGlassRole(userId) {
  const id = String(userId || "").toLowerCase();
  if (configuredIds("BREAK_GLASS_OWNER_IDS").includes(id)) return "owner";
  if (configuredIds("BREAK_GLASS_DEVELOPER_IDS").includes(id)) return "developer";
  return null;
}

function protectedUserIds() {
  return [...new Set([...configuredIds("BREAK_GLASS_OWNER_IDS"), ...configuredIds("BREAK_GLASS_DEVELOPER_IDS")])];
}

function requireBreakGlassAccess(req, res, next) {
  if (!getBreakGlassRole(req.user?._id)) return res.status(403).json({ message: "Break-glass hanya untuk owner/developer yang ditunjuk." });
  return next();
}

module.exports = { getBreakGlassRole, protectedUserIds, requireBreakGlassAccess };
