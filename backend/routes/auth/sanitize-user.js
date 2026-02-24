function sanitizeUser(user) {
  return {
    id: user._id,
    Username: user.Username,
    Role: user.Role,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

module.exports = {
  sanitizeUser,
};
