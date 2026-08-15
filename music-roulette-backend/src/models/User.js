const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 40 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    avatarEmoji: { type: String, default: "🎧" },
    avatarUrl: { type: String, default: null },
    bio: { type: String, default: "", maxlength: 200 },
    favoriteGenre: { type: String, default: "" },
  },
  { timestamps: true }
);

userSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

userSchema.methods.toPublicJSON = function () {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    avatarEmoji: this.avatarEmoji,
    avatarUrl: this.avatarUrl,
    bio: this.bio,
    favoriteGenre: this.favoriteGenre,
    createdAt: this.createdAt,
  };
};

userSchema.statics.hashPassword = function (plain) {
  return bcrypt.hash(plain, 10);
};

module.exports = mongoose.model("User", userSchema);
