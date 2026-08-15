const cron = require("node-cron");
const Group = require("../models/Group");
const DailySong = require("../models/DailySong");
const ListeningLog = require("../models/ListeningLog");
const WeeklyWinner = require("../models/WeeklyWinner");
const { nextStreakCount, hasCompletedDailyQuest } = require("../services/scoringService");
const {
  todayInTimezone,
  currentHourInTimezone,
  currentWeekBounds,
  weekdayInTimezone,
  isLastDayOfMonth,
} = require("../utils/dateHelper");

/**
 * Processes a single group's deadline for "today" in its own timezone.
 * Runs once per group per day (guarded by group.lastProcessedDate),
 * regardless of how many members the group has.
 */
async function processGroup(group) {
  const { timezone, penaltyUnexcusedSkip, pointsBestCurationBonus, streakLengthForBonus, pointsStreakBonus } =
    group.settings;
  const dropDate = todayInTimezone(timezone);

  if (group.lastProcessedDate === dropDate) return; // already processed today

  const songs = await DailySong.find({ group: group._id, dropDate });
  const songsByUser = Object.fromEntries(songs.map((s) => [s.user.toString(), s]));

  // 1) Unexcused-skip detection: for every member, for every OTHER member's
  //    song today, if there's no 'completed' log and they didn't use a busy
  //    pass today, mark it skipped and apply the penalty.
  for (const member of group.members) {
    const uid = member.user.toString();
    const usedBusyPassToday = member.lastBusyPassUsedDate === dropDate;

    const otherSongs = songs.filter((s) => s.user.toString() !== uid);
    if (otherSongs.length === 0) continue;

    const myLogs = await ListeningLog.find({
      group: group._id,
      listener: member.user,
      song: { $in: otherSongs.map((s) => s._id) },
    });
    const completedSongIds = new Set(
      myLogs.filter((l) => l.status === "completed").map((l) => l.song.toString())
    );
    const loggedSongIds = new Set(myLogs.map((l) => l.song.toString()));

    let penaltyTotal = 0;
    for (const song of otherSongs) {
      const sid = song._id.toString();
      if (!completedSongIds.has(sid) && !usedBusyPassToday) {
        if (!loggedSongIds.has(sid)) {
          await ListeningLog.create({
            group: group._id,
            song: song._id,
            listener: member.user,
            status: "skipped",
          });
        }
        penaltyTotal += penaltyUnexcusedSkip;
      }
    }

    const questCompleted = hasCompletedDailyQuest({
      totalOtherMembers: otherSongs.length,
      completedLogsCount: completedSongIds.size,
    });

    const newStreak = nextStreakCount({
      currentStreak: member.streakCount,
      questCompletedToday: questCompleted,
      usedBusyPass: usedBusyPassToday,
    });

    let streakBonus = 0;
    if (newStreak > 0 && newStreak % streakLengthForBonus === 0) {
      streakBonus = pointsStreakBonus;
    }

    const totalDelta = penaltyTotal + streakBonus;

    await Group.updateOne(
      { _id: group._id, "members.user": member.user },
      {
        $set: {
          "members.$.streakCount": newStreak,
          "members.$.bestStreak": Math.max(member.bestStreak, newStreak),
        },
        $inc: {
          "members.$.totalPoints": totalDelta,
          "members.$.weeklyPoints": totalDelta,
          "members.$.monthlyPoints": totalDelta,
        },
      }
    );
  }

  // 2) Best-of-day curation bonus: highest avgRating among today's songs
  //    (needs at least one rating to qualify, avoids empty-song abuse).
  const ratedSongs = songs.filter((s) => s.ratingCount > 0);
  if (ratedSongs.length > 0) {
    const best = ratedSongs.reduce((a, b) => (b.avgRating > a.avgRating ? b : a));
    await DailySong.updateOne({ _id: best._id }, { isBestOfDay: true });
    await Group.updateOne(
      { _id: group._id, "members.user": best.user },
      {
        $inc: {
          "members.$.totalPoints": pointsBestCurationBonus,
          "members.$.weeklyPoints": pointsBestCurationBonus,
          "members.$.monthlyPoints": pointsBestCurationBonus,
        },
      }
    );
  }

  // 3) Weekly reset on Sunday (day 0 in the group's timezone)
  const { weekStart, weekEnd } = currentWeekBounds(timezone);
  const weekday = weekdayInTimezone(dropDate, timezone);
  const isSunday = weekday === "Sun";

  if (isSunday) {
    // Compute weekly rankings based on ratings received (most ratings wins)
    const weekSongs = await DailySong.find({
      group: group._id,
      dropDate: { $gte: weekStart, $lte: weekEnd },
    });

    const memberStats = {};
    for (const member of group.members) {
      const uid = member.user.toString();
      memberStats[uid] = {
        user: member.user,
        points: member.weeklyPoints,
        ratingsReceived: 0,
        songsSubmitted: 0,
      };
    }

    for (const song of weekSongs) {
      const uid = song.user.toString();
      if (memberStats[uid]) {
        memberStats[uid].songsSubmitted += 1;
        memberStats[uid].ratingsReceived += song.ratingCount;
      }
    }

    const ranked = Object.values(memberStats).sort((a, b) => {
      if (b.ratingsReceived !== a.ratingsReceived) return b.ratingsReceived - a.ratingsReceived;
      if (b.points !== a.points) return b.points - a.points;
      return a.songsSubmitted - b.songsSubmitted;
    });

    const rankings = ranked.map((m, i) => ({
      user: m.user,
      position: i + 1,
      points: m.points,
      ratingsReceived: m.ratingsReceived,
      songsSubmitted: m.songsSubmitted,
    }));

    if (rankings.length > 0) {
      await WeeklyWinner.updateOne(
        { group: group._id, weekStart },
        {
          group: group._id,
          weekStart,
          weekEnd,
          rankings,
        },
        { upsert: true }
      );
    }

    await Group.updateOne(
      { _id: group._id },
      { $set: { "members.$[].weeklyPoints": 0 } }
    );
  }

  // 4) Monthly reset on the last day of the month
  if (isLastDayOfMonth(dropDate, timezone)) {
    await Group.updateOne({ _id: group._id }, { $set: { "members.$[].monthlyPoints": 0 } });
  }

  // 5) Weekly busy-pass refill (Monday = fresh week)
  const isMonday = weekday === "Mon";
  if (isMonday) {
    await Group.updateOne(
      { _id: group._id },
      { $set: { "members.$[].busyPassesLeft": group.settings.busyPassesPerWeek } }
    );
  }

  await Group.updateOne({ _id: group._id }, { $set: { lastProcessedDate: dropDate } });
}

async function runDeadlineSweep() {
  const groups = await Group.find({ isActive: true });
  for (const group of groups) {
    try {
      const hour = currentHourInTimezone(group.settings.timezone);
      const today = todayInTimezone(group.settings.timezone);
      const alreadyDone = group.lastProcessedDate === today;

      if (hour >= group.settings.dailyDeadlineHour && !alreadyDone) {
        await processGroup(group);
        console.log(`✅ Processed deadline sweep for group "${group.name}" (${group._id})`);
      }
    } catch (err) {
      console.error(`❌ Failed processing group ${group._id}:`, err.message);
    }
  }
}

// Runs every hour on the hour. Each group is only actually processed
// once its OWN deadline hour + timezone has passed, so this one cron
// definition scales to groups in different timezones with different
// deadlines — no per-group cron jobs needed.
function startCronJobs() {
  const interval = parseInt(process.env.CRON_CHECK_INTERVAL_MINUTES || "60", 10);
  const cronExpr = interval >= 60 ? "0 * * * *" : `*/${interval} * * * *`;

  cron.schedule(cronExpr, () => {
    runDeadlineSweep().catch((err) => console.error("Cron sweep error:", err));
  });

  console.log(`⏰ Deadline sweep cron scheduled (${cronExpr})`);
}

module.exports = { startCronJobs, runDeadlineSweep, processGroup };
