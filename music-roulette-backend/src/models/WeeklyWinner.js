const mongoose = require("mongoose");

const rankingSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    position: { type: Number, required: true }, // 1, 2, 3...
    points: { type: Number, default: 0 },
    ratingsReceived: { type: Number, default: 0 }, // total ratings their songs got this week
    songsSubmitted: { type: Number, default: 0 },
  },
  { _id: false }
);

const weeklyWinnerSchema = new mongoose.Schema(
  {
    group: { type: mongoose.Schema.Types.ObjectId, ref: "Group", required: true },
    weekStart: { type: String, required: true }, // 'YYYY-MM-DD'
    weekEnd: { type: String, required: true },
    rankings: { type: [rankingSchema], default: [] },
    rewardNote: { type: String, default: null },
  },
  { timestamps: true }
);

weeklyWinnerSchema.index({ group: 1, weekStart: 1 }, { unique: true });

module.exports = mongoose.model("WeeklyWinner", weeklyWinnerSchema);
