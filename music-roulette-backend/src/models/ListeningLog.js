const mongoose = require("mongoose");

const listeningLogSchema = new mongoose.Schema(
  {
    group: { type: mongoose.Schema.Types.ObjectId, ref: "Group", required: true },
    song: { type: mongoose.Schema.Types.ObjectId, ref: "DailySong", required: true },
    listener: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    status: {
      type: String,
      enum: ["pending", "completed", "skipped", "busy_pass"],
      default: "pending",
    },
    reactionText: { type: String, default: null },
    rating: { type: Number, min: 1, max: 5, default: null },
    listenedSeconds: { type: Number, default: 0 },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// A listener logs each song exactly once — upsert target for the API.
listeningLogSchema.index({ song: 1, listener: 1 }, { unique: true });
listeningLogSchema.index({ group: 1, listener: 1, createdAt: -1 });

module.exports = mongoose.model("ListeningLog", listeningLogSchema);
