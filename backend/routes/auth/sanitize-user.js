const { getBreakGlassRole } = require("../../utils/break-glass-access");
function sanitizeUser(user) {
  return {
    id: user._id,
    username: user.username,
    role: user.role,
    breakGlassRole: getBreakGlassRole(user._id),
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

module.exports = {
  sanitizeUser,
};
