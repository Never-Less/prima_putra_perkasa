const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");

const ALLOWED_ROLES = ["admin", "staff"];

const userSchema = new mongoose.Schema(
  {
    Username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      minlength: 3,
      maxlength: 50,
    },
    Password: {
      type: String,
      required: true,
      minlength: 8,
      select: false,
    },
    Role: {
      type: String,
      required: true,
      enum: ALLOWED_ROLES,
      default: "staff",
    },
  },
  { timestamps: true }
);

userSchema.pre("save", async function hashPassword() {
  if (!this.isModified("Password")) {
    return;
  }

  this.Password = await bcrypt.hash(this.Password, 12);
});

userSchema.methods.comparePassword = function comparePassword(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.Password);
};

const User = mongoose.model("User", userSchema);

module.exports = {
  User,
  ALLOWED_ROLES,
};
