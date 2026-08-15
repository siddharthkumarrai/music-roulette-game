const mongoose = require("mongoose");
const { customAlphabet } = require("nanoid");

const generateCode = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 6);

// Per-member game state, embedded so leaderboard reads are a single query.
const memberSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    role: { type: String, enum: ["owner", "member"], default: "member" },
    totalPoints: { type: Number, default: 0 },
    weeklyPoints: { type: Number, default: 0 },
    monthlyPoints: { type: Number, default: 0 },
    streakCount: { type: Number, default: 0 },
    bestStreak: { type: Number, default: 0 },
    busyPassesLeft: { type: Number, default: 1 },
    lastBusyPassUsedDate: { type: String, default: null }, // 'YYYY-MM-DD', so cron knows it covered *today*
    fiveStarCurations: { type: Number, default: 0 },
    joinedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

// Configurable rules per group -> lets each friend-group tune the game
// without touching code, and makes future features (custom point values,
// different deadlines) additive rather than breaking changes.
const settingsSchema = new mongoose.Schema(
  {
    minMembers: { type: Number, default: 2 },
    maxMembers: { type: Number, default: 10 },
    dailyDeadlineHour: { type: Number, default: 20, min: 0, max: 23 }, // 24h, group's local time
    timezone: { type: String, default: "Asia/Kolkata" },
    pointsDailyComplete: { type: Number, default: 10 },
    pointsBestCurationBonus: { type: Number, default: 5 },
    pointsStreakBonus: { type: Number, default: 20 },
    streakLengthForBonus: { type: Number, default: 5 },
    penaltyUnexcusedSkip: { type: Number, default: -10 },
    busyPassesPerWeek: { type: Number, default: 1 },
    minReactionLength: { type: Number, default: 20 },
  },
  { _id: false }
);

const groupSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    inviteCode: { type: String, unique: true, default: () => generateCode() },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    members: { type: [memberSchema], default: [] },
    settings: { type: settingsSchema, default: () => ({}) },
    lastProcessedDate: { type: String, default: null }, // 'YYYY-MM-DD', cron idempotency guard
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

groupSchema.index({ "members.user": 1 });

groupSchema.methods.isMember = function (userId) {
  return this.members.some((m) => m.user.toString() === userId.toString());
};

groupSchema.methods.getMember = function (userId) {
  return this.members.find((m) => m.user.toString() === userId.toString());
};

groupSchema.methods.otherMemberIds = function (userId) {
  return this.members
    .filter((m) => m.user.toString() !== userId.toString())
    .map((m) => m.user);
};

module.exports = mongoose.model("Group", groupSchema);
