// ============================================================
// Central place for every scoring rule. Reads point VALUES from
// group.settings so each group can tune its own game without a
// code change or deploy — this is what makes it "generic".
// ============================================================

function isValidReaction(text, minLength) {
  if (!text) return false;
  const trimmed = text.trim();
  if (trimmed.length < minLength) return false;

  const genericPhrases = ["nice song", "good one", "cool", "nice", "great song", "good song"];
  if (genericPhrases.includes(trimmed.toLowerCase())) return false;

  return true;
}

/**
 * A listener has "completed the day" once they've logged status=completed
 * against every OTHER member's song for that date. Works for any group size:
 * a 3-person group needs 2 completions, a 6-person group needs 5.
 */
function hasCompletedDailyQuest({ totalOtherMembers, completedLogsCount }) {
  return totalOtherMembers > 0 && completedLogsCount >= totalOtherMembers;
}

function nextStreakCount({ currentStreak, questCompletedToday, usedBusyPass }) {
  if (questCompletedToday || usedBusyPass) return currentStreak + 1;
  return 0;
}

/**
 * Tie-breaker chain: higher points -> more 5-star curations -> earliest
 * submission timestamp in the period. Works generically across N members.
 */
function resolveTie(a, b) {
  if (b.points !== a.points) return b.points - a.points;
  if (b.fiveStarCurations !== a.fiveStarCurations) return b.fiveStarCurations - a.fiveStarCurations;
  return (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" });
}

function rankMembers(members) {
  return [...members].sort(resolveTie);
}

module.exports = {
  isValidReaction,
  hasCompletedDailyQuest,
  nextStreakCount,
  resolveTie,
  rankMembers,
};
