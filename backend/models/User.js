const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");

const ROLE_ADMIN = "admin";
const ROLE_STAFF = "staff";
const ALLOWED_ROLES = [ROLE_ADMIN, ROLE_STAFF];
const EXPORT_ALLOWED_ROLES = [ROLE_ADMIN];

function normalizeRole(value) {
  if (typeof value === "string") {
    return value.trim().toLowerCase();
  }

  if (value === null || value === undefined) {
    return "";
  }

  return String(value).trim().toLowerCase();
}

function canRoleExport(role) {
  return EXPORT_ALLOWED_ROLES.includes(normalizeRole(role));
}

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      minlength: 3,
      maxlength: 50,
    },
    password: {
      type: String,
      required: true,
      minlength: 8,
      select: false,
    },
    role: {
      type: String,
      required: true,
      enum: ALLOWED_ROLES,
      default: "staff",
    },
  },
  { timestamps: true }
);

userSchema.pre("save", async function hashPassword() {
  if (!this.isModified("password")) {
    return;
  }

  this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.comparePassword = function comparePassword(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model("User", userSchema);

async function cleanupLegacyUserIndexes() {
  const collection = User.collection;

  if (!collection) {
    return;
  }

  const indexes = await collection.indexes();
  const legacyIndexNames = indexes
    .map((index) => index.name)
    .filter((name) => typeof name === "string" && name === "Username_1");

  for (const indexName of legacyIndexNames) {
    await collection.dropIndex(indexName);
  }
}

module.exports = {
  User,
  ALLOWED_ROLES,
  ROLE_ADMIN,
  ROLE_STAFF,
  EXPORT_ALLOWED_ROLES,
  canRoleExport,
  cleanupLegacyUserIndexes,
};
