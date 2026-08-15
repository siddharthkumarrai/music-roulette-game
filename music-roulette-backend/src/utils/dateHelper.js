// Returns 'YYYY-MM-DD' for "now" in the given IANA timezone.
// Using Intl instead of a date library keeps the backend dependency-light.
function todayInTimezone(timezone = "Asia/Kolkata") {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(new Date()); // en-CA locale gives YYYY-MM-DD
}

function currentHourInTimezone(timezone = "Asia/Kolkata") {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "numeric",
    hour12: false,
  });
  return parseInt(formatter.format(new Date()), 10) % 24;
}

// Returns the weekday name (e.g. "Sun", "Mon") for a date string in the given timezone.
function weekdayInTimezone(dateStr, timezone = "Asia/Kolkata") {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short",
  });
  return formatter.format(new Date(dateStr + "T12:00:00Z"));
}

// Checks if a date string is the last day of its month in the given timezone.
function isLastDayOfMonth(dateStr, timezone = "Asia/Kolkata") {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const thisDay = fmt.format(new Date(dateStr + "T12:00:00Z"));
  const nextDay = fmt.format(new Date(new Date(dateStr + "T12:00:00Z").getTime() + 86400000));
  return thisDay.slice(0, 7) !== nextDay.slice(0, 7);
}

// Monday-start ISO week bounds as 'YYYY-MM-DD' strings, in the given timezone.
function currentWeekBounds(timezone = "Asia/Kolkata") {
  const now = new Date(todayInTimezone(timezone) + "T00:00:00Z");
  const day = now.getUTCDay(); // 0 = Sunday
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setUTCDate(now.getUTCDate() + diffToMonday);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);

  const fmt = (d) => d.toISOString().slice(0, 10);
  return { weekStart: fmt(monday), weekEnd: fmt(sunday) };
}

function currentMonthKey(timezone = "Asia/Kolkata") {
  return todayInTimezone(timezone).slice(0, 7); // 'YYYY-MM'
}

module.exports = { todayInTimezone, currentHourInTimezone, currentWeekBounds, currentMonthKey, weekdayInTimezone, isLastDayOfMonth };
