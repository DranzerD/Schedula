const test = require("node:test");
const assert = require("node:assert/strict");
const tz = require("../utils/timezone");

test("zonedTimeToUtc: 09:00 in India is 03:30 UTC", () => {
  const d = tz.zonedTimeToUtc(2026, 11, 9, 9 * 60, "Asia/Kolkata");
  assert.equal(d.toISOString(), "2026-11-09T03:30:00.000Z");
});

test("zonedTimeToUtc: handles US daylight-saving change", () => {
  // New York is UTC-5 in winter (EST) and UTC-4 in summer (EDT)
  assert.equal(tz.zonedTimeToUtc(2026, 1, 15, 9 * 60, "America/New_York").toISOString(), "2026-01-15T14:00:00.000Z");
  assert.equal(tz.zonedTimeToUtc(2026, 7, 15, 9 * 60, "America/New_York").toISOString(), "2026-07-15T13:00:00.000Z");
});

test("zonedTimeToUtc: minutes beyond 1440 roll into the next day", () => {
  assert.equal(tz.zonedTimeToUtc(2026, 11, 9, 1440, "UTC").toISOString(), "2026-11-10T00:00:00.000Z");
});

test("dateKey / minutesOfDay respect the timezone", () => {
  const instant = new Date("2026-11-09T20:00:00Z"); // 01:30 next day in India
  assert.equal(tz.dateKey(instant, "UTC"), "2026-11-09");
  assert.equal(tz.dateKey(instant, "Asia/Kolkata"), "2026-11-10");
  assert.equal(tz.minutesOfDay(instant, "Asia/Kolkata"), 90);
});

test("addDaysToKey crosses month and year boundaries", () => {
  assert.equal(tz.addDaysToKey("2026-12-31", 1), "2027-01-01");
  assert.equal(tz.addDaysToKey("2026-03-01", -1), "2026-02-28");
});

test("normalizeTimeZone falls back to UTC for junk", () => {
  assert.equal(tz.normalizeTimeZone("Not/AZone"), "UTC");
  assert.equal(tz.normalizeTimeZone(undefined), "UTC");
  assert.equal(tz.normalizeTimeZone("Asia/Tokyo"), "Asia/Tokyo");
});

test("parseLocalDateTime: local strings use the zone, offsets are absolute, junk is null", () => {
  assert.equal(tz.parseLocalDateTime("2026-11-13T17:00", "Asia/Kolkata").toISOString(), "2026-11-13T11:30:00.000Z");
  assert.equal(tz.parseLocalDateTime("2026-11-13T17:00:00Z", "Asia/Kolkata").toISOString(), "2026-11-13T17:00:00.000Z");
  assert.equal(tz.parseLocalDateTime("2026-11-13", "UTC").toISOString(), "2026-11-13T00:00:00.000Z");
  assert.equal(tz.parseLocalDateTime("next friday", "UTC"), null);
  assert.equal(tz.parseLocalDateTime("2026-13-40T25:00", "UTC"), null);
});
