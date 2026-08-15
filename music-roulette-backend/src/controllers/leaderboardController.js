const asyncHandler = require("../utils/asyncHandler");
const DailySong = require("../models/DailySong");
const WeeklyWinner = require("../models/WeeklyWinner");
const { rankMembers } = require("../services/scoringService");

const getLeaderboard = asyncHandler(async (req, res) => {
  const period = req.query.period === "monthly" ? "monthly" : "weekly";
  const pointsField = period === "monthly" ? "monthlyPoints" : "weeklyPoints";

  const group = await req.group.populate("members.user", "name avatarEmoji");

  // Earliest submission this period, per member, for the tie-breaker.
  const earliestMap = {};
  const songs = await DailySong.find({ group: group._id }).sort({ submittedAt: 1 });
  for (const s of songs) {
    const key = s.user.toString();
    if (!earliestMap[key]) earliestMap[key] = s.submittedAt;
  }

  const members = group.members.map((m) => ({
    userId: m.user._id,
    name: m.user.name,
    avatarEmoji: m.user.avatarEmoji,
    points: m[pointsField],
    totalPoints: m.totalPoints,
    streakCount: m.streakCount,
    fiveStarCurations: m.fiveStarCurations,
    earliestSubmission: earliestMap[m.user._id.toString()] || null,
  }));

  const ranked = rankMembers(members);

  res.json({ success: true, period, leaderboard: ranked });
});

const getWeeklyHistory = asyncHandler(async (req, res) => {
  const history = await WeeklyWinner.find({ group: req.group._id })
    .sort({ weekStart: -1 })
    .limit(12)
    .populate("rankings.user", "name avatarEmoji");

  res.json({ success: true, history });
});

module.exports = { getLeaderboard, getWeeklyHistory };
