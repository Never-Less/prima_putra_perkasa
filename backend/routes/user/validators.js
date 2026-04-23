const { Types } = require("mongoose");

function isValidId(value) {
  return Types.ObjectId.isValid(String(value || "").trim());
}

function normalizeRole(value) {
  if (typeof value === "string") {
    return value.trim().toLowerCase();
  }

  if (value === null || value === undefined) {
    return "";
  }

  return String(value).trim().toLowerCase();
}

module.exports = {
  isValidId,
  normalizeRole,
};
