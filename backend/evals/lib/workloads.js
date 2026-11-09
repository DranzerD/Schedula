/**
 * Synthetic-but-realistic workload generator (seeded, reproducible).
 * Mix: ~12% overdue, ~25% due today, ~25% due tomorrow, rest within a week;
 * 20% high / 50% medium / 30% low priority; 30% deep-focus; ~10% fixed.
 */
const { mulberry32, pick, int } = require("./rng");

const MIN = 60000;
const HOUR = 3600000;
const DAY = 24 * HOUR;

// Monday 9 Nov 2026, user timezone UTC (the validator is offset-aware, so
// timezone handling is covered by dedicated unit tests with fixed offsets)
const DAY_START = Date.UTC(2026, 10, 9);

const DEFAULT_USER = {
  workingHours: { start: "09:00", end: "17:00" },
  bufferMinutes: 15,
  maxDeepFocusMinutes: 240,
  timezone: "UTC",
};

const DURATIONS = [15, 30, 30, 45, 60, 60, 90, 120, 180];

/**
 * @param {number} seed
 * @param {number} n          number of tasks
 * @param {Object} [opts]     { nowMinutes: minutes after midnight UTC, user }
 */
function generateWorkload(seed, n, opts = {}) {
  const rand = mulberry32(seed);
  const user = { ...DEFAULT_USER, ...(opts.user || {}) };
  const nowMinutes = opts.nowMinutes ?? 8 * 60 + 30; // 08:30 — before work starts
  const now = new Date(DAY_START + nowMinutes * MIN);
  const workStart = 9 * 60;
  const workEnd = 17 * 60;

  const tasks = [];
  const fixedWindows = [];

  for (let i = 0; i < n; i++) {
    const estimatedDuration = pick(rand, DURATIONS);
    const pr = rand();
    const priority = pr < 0.2 ? "high" : pr < 0.7 ? "medium" : "low";
    const energyLevel = rand() < 0.3 ? "deep-focus" : "low-focus";
    const base = {
      _id: `t${String(i).padStart(4, "0")}`,
      title: `Task ${i}`,
      priority,
      energyLevel,
      flexibility: "movable",
      estimatedDuration,
      isCompleted: false,
      createdIndex: i,
    };

    // ~10% fixed-time commitments (non-overlapping, still in the future)
    if (rand() < 0.1) {
      for (let attempt = 0; attempt < 12; attempt++) {
        const startMin = int(rand, Math.ceil((Math.max(workStart, nowMinutes + 5)) / 15), Math.floor((workEnd - estimatedDuration) / 15)) * 15;
        const endMin = startMin + estimatedDuration;
        if (endMin > workEnd) continue;
        if (fixedWindows.some((w) => startMin < w.end + 15 && endMin > w.start - 15)) continue;
        fixedWindows.push({ start: startMin, end: endMin });
        const start = new Date(DAY_START + startMin * MIN);
        tasks.push({
          ...base,
          flexibility: "fixed",
          scheduledStart: start,
          scheduledEnd: new Date(start.getTime() + estimatedDuration * MIN),
          deadline: new Date(start.getTime() + estimatedDuration * MIN + int(rand, 0, 6) * 30 * MIN),
        });
        base._placed = true;
        break;
      }
      if (base._placed) continue;
    }

    const r = rand();
    let deadline;
    if (r < 0.12) {
      deadline = new Date(now.getTime() - int(rand, 1, 48) * HOUR);
    } else if (r < 0.37) {
      const minDeadline = nowMinutes + 30;
      const dMin = int(rand, Math.ceil(Math.max(minDeadline, 10 * 60) / 15), (18 * 60) / 15) * 15;
      deadline = new Date(DAY_START + dMin * MIN);
    } else if (r < 0.62) {
      deadline = new Date(DAY_START + DAY + int(rand, 9 * 4, 18 * 4) * 15 * MIN);
    } else {
      deadline = new Date(DAY_START + int(rand, 2, 7) * DAY + int(rand, 9 * 4, 18 * 4) * 15 * MIN);
    }
    tasks.push({ ...base, deadline });
  }

  tasks.forEach((t) => delete t._placed);
  return { tasks, user, now, dateKey: "2026-11-09", dayStartMs: DAY_START };
}

module.exports = { generateWorkload, DEFAULT_USER, DAY_START, MIN, HOUR, DAY };
