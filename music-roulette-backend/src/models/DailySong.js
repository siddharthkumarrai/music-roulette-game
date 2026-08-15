const mongoose = require("mongoose");

const dailySongSchema = new mongoose.Schema(
  {
    group: { type: mongoose.Schema.Types.ObjectId, ref: "Group", required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    youtubeVideoId: { type: String, required: true },
    title: { type: String, default: null },
    artist: { type: String, default: null },
    thumbnailUrl: { type: String, default: null },
    durationSeconds: { type: Number, default: 0 },
    audioUrl: { type: String, default: null },
    streamReady: { type: Boolean, default: false },
    dropDate: { type: String, required: true },
    submittedAt: { type: Date, default: Date.now },
    avgRating: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
    isBestOfDay: { type: Boolean, default: false },
  },
  { timestamps: true }
);

dailySongSchema.index({ group: 1, user: 1, dropDate: 1 }, { unique: true });
dailySongSchema.index({ group: 1, dropDate: 1 });

module.exports = mongoose.model("DailySong", dailySongSchema);
