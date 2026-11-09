/**
 * Timezone utilities (zero dependencies, built on Intl).
 *
 * The scheduling engine reasons in the *user's* timezone ("09:00" means 09:00
 * where the user lives), while servers usually run in UTC. These helpers
 * convert between UTC instants and wall-clock time in an IANA timezone.
 */

const formatterCache = new Map();

function getFormatter(timeZone) {
  let formatter = formatterCache.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    formatterCache.set(timeZone, formatter);
  }
  return formatter;
}

function isValidTimeZone(timeZone) {
  if (!timeZone || typeof timeZone !== "string") return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch (e) {
    return false;
  }
}

/** Returns a valid IANA timezone, falling back to UTC. */
function normalizeTimeZone(timeZone) {
  return isValidTimeZone(timeZone) ? timeZone : "UTC";
}

/** Wall-clock parts of an instant in the given timezone. */
function getZonedParts(date, timeZone) {
  const parts = {};
  for (const { type, value } of getFormatter(timeZone).formatToParts(date)) {
    if (type !== "literal") parts[type] = parseInt(value, 10);
  }
  return {
    year: parts.year,
    month: parts.month,
    day: parts.day,
    hour: parts.hour % 24,
    minute: parts.minute,
    second: parts.second,
  };
}

/** Offset (ms) such that wallClockAsUTC = instant + offset. */
function tzOffsetMs(date, timeZone) {
  const p = getZonedParts(date, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

/**
 * Convert a wall-clock time (year, month, day, minutes-from-midnight) in a
 * timezone to a UTC Date. `minutes` may exceed 1440 (rolls into next day).
 */
function zonedTimeToUtc(year, month, day, minutes, timeZone) {
  const naive = Date.UTC(year, month - 1, day, 0, minutes, 0);
  const firstOffset = tzOffsetMs(new Date(naive), timeZone);
  let guess = naive - firstOffset;
  const secondOffset = tzOffsetMs(new Date(guess), timeZone);
  if (secondOffset !== firstOffset) guess = naive - secondOffset; // DST edge
  return new Date(guess);
}

/** "YYYY-MM-DD" of an instant in the timezone. */
function dateKey(date, timeZone) {
  const p = getZonedParts(date, timeZone);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

/** Minutes since local midnight of an instant in the timezone. */
function minutesOfDay(date, timeZone) {
  const p = getZonedParts(date, timeZone);
  return p.hour * 60 + p.minute;
}

function parseDateKey(key) {
  const [year, month, day] = key.split("-").map(Number);
  return { year, month, day };
}

function addDaysToKey(key, days) {
  const { year, month, day } = parseDateKey(key);
  return new Date(Date.UTC(year, month - 1, day + days))
    .toISOString()
    .slice(0, 10);
}

/** Weekday name (e.g. "Monday") of a date key. */
function weekdayOfKey(key) {
  const { year, month, day } = parseDateKey(key);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-US", {
    weekday: "long",
    timeZone: "UTC",
  });
}

/** Format an instant as a short clock time ("09:30 AM") in the timezone. */
function formatClock(date, timeZone) {
  return new Date(date).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone,
  });
}

/**
 * Parse a local wall-clock string ("YYYY-MM-DDTHH:mm", optionally with
 * seconds) as a time in `timeZone`. Strings carrying an explicit offset or
 * "Z" are parsed as absolute instants. Returns null when unparseable.
 */
function parseLocalDateTime(value, timeZone) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (/(Z|[+-]\d{2}:?\d{2})$/i.test(trimmed) && /T/.test(trimmed)) {
    const abs = new Date(trimmed);
    return isNaN(abs) ? null : abs;
  }
  const m = trimmed.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{1,2}):(\d{2})(?::\d{2})?)?$/,
  );
  if (!m) return null;
  const [, y, mo, d, h = "0", mi = "0"] = m;
  const hour = Number(h);
  const minute = Number(mi);
  if (hour > 23 || minute > 59) return null;
  const month = Number(mo);
  const day = Number(d);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return zonedTimeToUtc(Number(y), month, day, hour * 60 + minute, timeZone);
}

module.exports = {
  isValidTimeZone,
  normalizeTimeZone,
  getZonedParts,
  tzOffsetMs,
  zonedTimeToUtc,
  dateKey,
  minutesOfDay,
  parseDateKey,
  addDaysToKey,
  weekdayOfKey,
  formatClock,
  parseLocalDateTime,
};
