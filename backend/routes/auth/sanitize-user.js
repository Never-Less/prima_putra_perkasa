function sanitizeUser(user) {
  return {
    id: user._id,
    username: user.username,
    role: user.role,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

module.exports = {
  sanitizeUser,
};
