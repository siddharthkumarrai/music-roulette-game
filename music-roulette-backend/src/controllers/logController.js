const Joi = require("joi");
const DailySong = require("../models/DailySong");
const ListeningLog = require("../models/ListeningLog");
const Group = require("../models/Group");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const { isValidReaction, hasCompletedDailyQuest, nextStreakCount } = require("../services/scoringService");
const { todayInTimezone } = require("../utils/dateHelper");

const submitLogSchema = Joi.object({
  songId: Joi.string().required(),
  status: Joi.string().valid("completed", "skipped").required(),
  rating: Joi.number().integer().min(1).max(5).when("status", {
    is: "completed",
    then: Joi.required(),
  }),
  reactionText: Joi.string().when("status", { is: "completed", then: Joi.required() }),
  listenedSeconds: Joi.number().integer().min(0).optional(),
  durationSeconds: Joi.number().integer().min(0).optional(),
});

const submitLog = asyncHandler(async (req, res) => {
  const { error, value } = submitLogSchema.validate(req.body);
  if (error) throw new ApiError(400, error.details[0].message);

  const song = await DailySong.findOne({ _id: value.songId, group: req.group._id });
  if (!song) throw new ApiError(404, "Song not found in this group.");
  if (song.user.toString() === req.user._id.toString()) {
    throw new ApiError(400, "You can't log a listen against your own song.");
  }

  const { minReactionLength, pointsDailyComplete, penaltyUnexcusedSkip } = req.group.settings;

  if (value.status === "completed" && !isValidReaction(value.reactionText, minReactionLength)) {
    throw new ApiError(
      400,
      `Reaction must be at least ${minReactionLength} characters and specific — no generic "nice song" comments.`
    );
  }

  if (value.status === "completed" && value.listenedSeconds != null && value.durationSeconds > 0) {
    const required = Math.floor(value.durationSeconds * 0.9);
    if (value.listenedSeconds < required) {
      throw new ApiError(
        400,
        `You must listen to at least 90% of the track (${required}s of ${value.durationSeconds}s) before submitting.`
      );
    }
  }

  const existingLog = await ListeningLog.findOne({ song: song._id, listener: req.user._id });
  if (existingLog && existingLog.status === "completed") {
    throw new ApiError(409, "You've already logged this song as completed.");
  }

  const log = await ListeningLog.findOneAndUpdate(
    { song: song._id, listener: req.user._id },
    {
      group: req.group._id,
      song: song._id,
      listener: req.user._id,
      status: value.status,
      rating: value.status === "completed" ? value.rating : null,
      reactionText: value.status === "completed" ? value.reactionText.trim() : null,
      listenedSeconds: value.listenedSeconds || 0,
      completedAt: value.status === "completed" ? new Date() : null,
    },
    { upsert: true, new: true }
  );

  let pointsAwarded = 0;

  if (value.status === "completed") {
    const newCount = song.ratingCount + 1;
    const newAvg = (song.avgRating * song.ratingCount + value.rating) / newCount;
    song.avgRating = newAvg;
    song.ratingCount = newCount;
    await song.save();

    if (value.rating === 5) {
      await Group.updateOne(
        { _id: req.group._id, "members.user": song.user },
        { $inc: { "members.$.fiveStarCurations": 1 } }
      );
    }

    const dropDate = song.dropDate;
    const [othersSongs, myCompletedLogs] = await Promise.all([
      DailySong.find({ group: req.group._id, dropDate, user: { $ne: req.user._id } }),
      ListeningLog.find({
        group: req.group._id,
        listener: req.user._id,
        status: "completed",
      }).populate({ path: "song", match: { dropDate } }),
    ]);
    const completedTodayCount = myCompletedLogs.filter((l) => l.song).length;

    const questNowComplete = hasCompletedDailyQuest({
      totalOtherMembers: othersSongs.length,
      completedLogsCount: completedTodayCount,
    });

    if (questNowComplete && completedTodayCount === othersSongs.length) {
      pointsAwarded = pointsDailyComplete;
      const member = req.group.getMember(req.user._id);
      const newStreak = nextStreakCount({
        currentStreak: member ? member.streakCount : 0,
        questCompletedToday: true,
        usedBusyPass: false,
      });
      await Group.updateOne(
        { _id: req.group._id, "members.user": req.user._id },
        {
          $inc: {
            "members.$.totalPoints": pointsAwarded,
            "members.$.weeklyPoints": pointsAwarded,
            "members.$.monthlyPoints": pointsAwarded,
          },
          $set: {
            "members.$.streakCount": newStreak,
            "members.$.bestStreak": Math.max(member ? member.bestStreak : 0, newStreak),
          },
        }
      );
    }
  } else if (value.status === "skipped") {
    pointsAwarded = penaltyUnexcusedSkip;
    await Group.updateOne(
      { _id: req.group._id, "members.user": req.user._id },
      {
        $inc: {
          "members.$.totalPoints": pointsAwarded,
          "members.$.weeklyPoints": pointsAwarded,
          "members.$.monthlyPoints": pointsAwarded,
        },
      }
    );
  }

  res.json({ success: true, log, pointsAwarded });
});

// One busy pass per week, applied at the group-day level (not per song) —
// preserves the streak without requiring the full quest today.
const useBusyPass = asyncHandler(async (req, res) => {
  if (req.member.busyPassesLeft <= 0) {
    throw new ApiError(400, "No busy passes left this week.");
  }

  const today = todayInTimezone(req.group.settings.timezone);
  if (req.member.lastBusyPassUsedDate === today) {
    throw new ApiError(400, "Busy pass already used today.");
  }

  await Group.updateOne(
    { _id: req.group._id, "members.user": req.user._id },
    { $inc: { "members.$.busyPassesLeft": -1 }, $set: { "members.$.lastBusyPassUsedDate": today } }
  );

  res.json({ success: true, message: "Busy pass used. Streak preserved for today." });
});

module.exports = { submitLog, useBusyPass };
