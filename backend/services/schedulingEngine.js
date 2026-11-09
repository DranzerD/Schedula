/**
 * Schedula - Scheduling Engine
 *
 * The deterministic, explainable core. Given tasks + a user's preferences it
 * produces a conflict-free daily plan and a human-readable reason for every
 * decision. No randomness, no network, no LLM: same input => same output.
 *
 * Components
 *  1. Score calculators   urgency / importance / risk -> final score
 *  2. Schedule generator  daily + multi-day (range) planning
 *  3. Explanation builder reasons + text for every slot
 *  4. Rescheduler         re-plans and reports what moved and why
 *
 * Guarantees (verified independently by backend/evals):
 *  - no two tasks overlap and every movable task respects the buffer
 *  - movable tasks never run outside working hours or past their deadline
 *  - deep-focus minutes never exceed the user's daily cap
 *  - all times are computed in the user's timezone (servers run in UTC)
 */

const {
  normalizeTimeZone,
  dateKey,
  addDaysToKey,
  parseDateKey,
  zonedTimeToUtc,
  minutesOfDay,
  formatClock,
} = require("../utils/timezone");

const WEIGHTS = {
  urgency: 0.4, // How urgent based on deadline
  importance: 0.35, // How important based on priority/flexibility
  risk: 0.25, // Risk of missing deadline
};

const PRIORITY_VALUES = { low: 1, medium: 2, high: 3 };
const ENERGY_VALUES = { "low-focus": 1, "deep-focus": 2 };

const DEFAULT_BUFFER = 15;
const DEFAULT_DEEP_FOCUS_CAP = 240;
const MAX_RANGE_DAYS = 14;

/* ------------------------------------------------------------------ */
/* Helpers                                                              */
/* ------------------------------------------------------------------ */

function parseTimeToMinutes(timeStr) {
  const [hours, minutes] = String(timeStr).split(":").map(Number);
  return hours * 60 + (minutes || 0);
}

function minutesToTime(minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
}

/** Working window in minutes from midnight (falls back to 09:00-17:00). */
function workWindow(user = {}) {
  const start = parseTimeToMinutes(user.workingHours?.start || "09:00");
  const end = parseTimeToMinutes(user.workingHours?.end || "17:00");
  return end > start ? { start, end } : { start: 540, end: 1020 };
}

const toPlain = (task) => (task && typeof task.toObject === "function" ? task.toObject() : { ...task });
const idOf = (task) => String(task._id ?? task.id);

function resolveDayKey(date, timeZone) {
  if (typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d)) throw new Error("Invalid date");
  return dateKey(d, timeZone);
}

/* ------------------------------------------------------------------ */
/* Score calculation                                                    */
/* ------------------------------------------------------------------ */

/** Urgency 0-100: how much of the remaining time the task consumes. */
function calculateUrgencyScore(task, now = new Date()) {
  const deadline = new Date(task.deadline);
  const minutesRemaining = Math.max(0, (deadline - now) / 60000);
  const duration = task.estimatedDuration;

  if (minutesRemaining <= 0) return 100;

  const timeRatio = duration / minutesRemaining;
  let urgency;
  if (timeRatio >= 1) urgency = 100;
  else if (timeRatio >= 0.5) urgency = 80 + (timeRatio - 0.5) * 40;
  else if (timeRatio >= 0.25) urgency = 50 + (timeRatio - 0.25) * 120;
  else if (timeRatio >= 0.1) urgency = 20 + (timeRatio - 0.1) * 200;
  else urgency = timeRatio * 200;

  return Math.min(100, Math.max(0, Math.round(urgency)));
}

/** Importance 0-100: priority (0-60) + fixed bonus (30) + deep-focus bonus (10). */
function calculateImportanceScore(task) {
  const priorityValue = PRIORITY_VALUES[task.priority] || 2;
  const priorityScore = ((priorityValue - 1) / 2) * 60;
  const flexibilityBonus = task.flexibility === "fixed" ? 30 : 0;
  const energyBonus = task.energyLevel === "deep-focus" ? 10 : 0;
  return Math.min(100, Math.max(0, Math.round(priorityScore + flexibilityBonus + energyBonus)));
}

/** Risk 0-100: how little slack exists in the user's working time before the deadline. */
function calculateRiskScore(task, userSettings = {}, now = new Date()) {
  const deadline = new Date(task.deadline);
  const minutesRemaining = Math.max(0, (deadline - now) / 60000);
  const duration = task.estimatedDuration;

  if (minutesRemaining <= 0 || minutesRemaining < duration) return 100;

  const availableWorkMinutes = calculateAvailableWorkMinutes(now, deadline, userSettings);
  if (availableWorkMinutes < duration) return 100;

  const bufferRatio = (availableWorkMinutes - duration) / duration;
  let risk;
  if (bufferRatio < 0.5) risk = 100 - bufferRatio * 60;
  else if (bufferRatio < 1) risk = 70 - (bufferRatio - 0.5) * 60;
  else if (bufferRatio < 2) risk = 40 - (bufferRatio - 1) * 20;
  else risk = Math.max(0, 20 - (bufferRatio - 2) * 10);

  if (task.flexibility === "fixed") risk += 10;

  return Math.min(100, Math.max(0, Math.round(risk)));
}

/**
 * Working minutes (in the user's timezone) between two instants.
 * Counts only the overlap with each day's [workStart, workEnd] window.
 */
function calculateAvailableWorkMinutes(start, end, userSettings = {}) {
  const tz = normalizeTimeZone(userSettings.timezone);
  const { start: ws, end: we } = workWindow(userSettings);
  const startMs = new Date(start).getTime();
  const endMs = new Date(end).getTime();
  if (!(endMs > startMs)) return 0;

  let key = dateKey(new Date(startMs), tz);
  const lastKey = dateKey(new Date(endMs), tz);
  let totalMs = 0;
  for (let guard = 0; key <= lastKey && guard < 800; guard++) {
    const { year, month, day } = parseDateKey(key);
    const winStart = zonedTimeToUtc(year, month, day, ws, tz).getTime();
    const winEnd = zonedTimeToUtc(year, month, day, we, tz).getTime();
    const lo = Math.max(winStart, startMs);
    const hi = Math.min(winEnd, endMs);
    if (hi > lo) totalMs += hi - lo;
    key = addDaysToKey(key, 1);
  }
  return Math.round(totalMs / 60000);
}

function calculateAllScores(task, userSettings, now = new Date()) {
  const urgencyScore = calculateUrgencyScore(task, now);
  const importanceScore = calculateImportanceScore(task);
  const riskScore = calculateRiskScore(task, userSettings, now);

  const finalScore = Math.round(
    urgencyScore * WEIGHTS.urgency +
      importanceScore * WEIGHTS.importance +
      riskScore * WEIGHTS.risk,
  );

  return {
    urgencyScore,
    importanceScore,
    riskScore,
    finalScore: Math.min(100, Math.max(0, finalScore)),
  };
}

/* ------------------------------------------------------------------ */
/* Slot search                                                          */
/* ------------------------------------------------------------------ */

/**
 * First-fit search for a free window.
 *
 * @param {number} startFrom   earliest start (minutes from midnight)
 * @param {number} workEnd     latest allowed END (work end or earlier deadline)
 * @param {number} duration    minutes needed
 * @param {number} buffer      required gap to neighbouring tasks
 * @param {Array}  occupiedSlots [{start,end}]
 * @param {number|null} preferAfter optional: try starting here first (energy-aware placement)
 */
function findAvailableSlot(startFrom, workEnd, duration, buffer, occupiedSlots, preferAfter = null) {
  const search = (from) => {
    let candidate = from;
    for (let guard = 0; candidate + duration <= workEnd && guard < 10000; guard++) {
      const candidateEnd = candidate + duration;
      let conflict = false;
      for (const slot of occupiedSlots) {
        if (candidate < slot.end + buffer && candidateEnd > slot.start - buffer) {
          candidate = slot.end + buffer; // jump past the blocker
          conflict = true;
          break;
        }
      }
      if (!conflict) return { start: candidate, end: candidateEnd };
    }
    return null;
  };

  if (preferAfter !== null && preferAfter > startFrom) {
    const preferred = search(preferAfter);
    if (preferred) return preferred;
  }
  return search(startFrom);
}

/* ------------------------------------------------------------------ */
/* Explanations                                                         */
/* ------------------------------------------------------------------ */

/** Ordered list of short reasons for a scored task. */
function buildReasons(task, now = new Date()) {
  const scores = task.scores || {};
  const reasons = [];

  if (task.priority === "high") reasons.push("high priority");
  else if (task.priority === "medium") reasons.push("medium priority");
  else if (task.priority === "low") reasons.push("low priority");

  const msUntil = new Date(task.deadline) - now;
  if (msUntil <= 0) {
    reasons.push("is overdue");
  } else {
    const minutes = Math.round(msUntil / 60000);
    const hours = Math.round(msUntil / 3600000);
    if (minutes < 60) reasons.push(`deadline in ${minutes} minutes`);
    else if (hours <= 24) reasons.push(`deadline in ${hours} hours`);
    else {
      const days = Math.round(hours / 24);
      reasons.push(`deadline in ${days} day${days > 1 ? "s" : ""}`);
    }
  }

  if (task.plan?.mustDoToday && msUntil > 0) {
    reasons.push("cannot be postponed (not enough working time left before the deadline)");
  }
  if (task.energyLevel === "deep-focus") reasons.push("requires deep focus");
  if (task.flexibility === "fixed") reasons.push("has fixed time constraint");
  else if (scores.finalScore > 70) reasons.push("limited scheduling flexibility");

  if (scores.riskScore > 70) reasons.push("high risk of missing deadline if delayed");
  else if (scores.riskScore > 40) reasons.push("moderate deadline risk");

  return reasons;
}

/** Human-readable explanation for a placed task. */
function generateExplanation(task, scheduledTime, user = {}, now = new Date()) {
  const tz = normalizeTimeZone(user.timezone);
  const scores = task.scores;
  const start = new Date(scheduledTime);
  const end = new Date(start.getTime() + task.estimatedDuration * 60000);

  const lines = [];
  const reasons = buildReasons(task, now);
  let head = `Scheduled at ${formatClock(start, tz)}–${formatClock(end, tz)}`;
  if (reasons.length) head += ` because the task has ${reasons.join(", ")}.`;
  lines.push(head);

  lines.push("");
  lines.push(`📊 Scheduling Score: ${scores.finalScore}/100`);
  lines.push(`• Urgency: ${scores.urgencyScore}/100`);
  lines.push(`• Importance: ${scores.importanceScore}/100`);
  lines.push(`• Risk: ${scores.riskScore}/100`);
  return lines.join("\n");
}

/* ------------------------------------------------------------------ */
/* Daily schedule                                                       */
/* ------------------------------------------------------------------ */

const byScoreThenDeadline = (a, b) =>
  b.scores.finalScore - a.scores.finalScore ||
  new Date(a.deadline) - new Date(b.deadline) ||
  b.estimatedDuration - a.estimatedDuration ||
  idOf(a).localeCompare(idOf(b));

/**
 * Generate one day's plan.
 *
 * @param {Array}  tasks
 * @param {Object} user     { workingHours, maxDeepFocusMinutes, bufferMinutes, timezone }
 * @param {Date|string} date  a Date, or "YYYY-MM-DD" in the user's timezone
 * @param {Object} [options]  { now: Date, excludeIds: Set<string> }
 */
function generateDailySchedule(tasks, user, date = new Date(), options = {}) {
  const now = options.now ? new Date(options.now) : new Date();
  const tz = normalizeTimeZone(user.timezone);
  const dayKey = resolveDayKey(date, tz);
  const { year, month, day } = parseDateKey(dayKey);
  const at = (minutes) => zonedTimeToUtc(year, month, day, minutes, tz);
  const dayStart = at(0);
  const dayEnd = at(1440);
  const exclude = options.excludeIds || new Set();

  const { start: workStart, end: workEnd } = workWindow(user);
  const maxDeepFocus = Number.isFinite(user.maxDeepFocusMinutes) ? user.maxDeepFocusMinutes : DEFAULT_DEEP_FOCUS_CAP;
  const buffer = Number.isFinite(user.bufferMinutes) ? user.bufferMinutes : DEFAULT_BUFFER;

  const isToday = dayKey === dateKey(now, tz);
  const earliest = isToday
    ? Math.max(workStart, Math.ceil(minutesOfDay(now, tz) / 5) * 5)
    : workStart;
  const peakEnd = workStart + Math.floor((workEnd - workStart) / 2);

  // ---- classify tasks relevant to this day
  const movable = [];
  const fixedToday = [];
  const fixedNoStart = [];
  for (const raw of tasks) {
    if (raw.isCompleted || exclude.has(idOf(raw))) continue;
    const task = toPlain(raw);
    const deadline = new Date(task.deadline);

    if (task.flexibility === "fixed") {
      if (task.scheduledStart) {
        const s = new Date(task.scheduledStart);
        if (s >= dayStart && s < dayEnd) fixedToday.push(task);
      } else if (deadline >= dayStart) {
        fixedNoStart.push(task);
      }
      continue;
    }
    const overdue = deadline < now;
    if (deadline >= dayStart || (isToday && overdue)) movable.push(task);
  }

  const score = (t) => ({ ...t, scores: calculateAllScores(t, user, now) });

  // A task "must be done today" when no later working time can absorb it
  // (deadline is today / already passed, or the working time between the end
  // of today and the deadline is shorter than the task). Those are placed
  // first, earliest-deadline-first, so a higher-scoring but postponable task
  // can never push them past their deadline.
  const planMeta = (t) => {
    const deadline = new Date(t.deadline);
    const overdue = deadline < now;
    const deadlineToday = !overdue && deadline < dayEnd;
    const latestEnd = deadlineToday ? Math.min(workEnd, minutesOfDay(deadline, tz)) : workEnd;
    const laterCapacity = deadline >= dayEnd ? calculateAvailableWorkMinutes(dayEnd, deadline, user) : 0;
    const mustDoToday = overdue || deadlineToday || laterCapacity < t.estimatedDuration + buffer;
    return { overdue, deadlineToday, latestEnd, mustDoToday };
  };
  const scoredMovable = movable
    .map((t) => {
      const scored = score(t);
      return { ...scored, plan: planMeta(scored) };
    })
    .sort((a, b) => {
      if (a.plan.mustDoToday !== b.plan.mustDoToday) return a.plan.mustDoToday ? -1 : 1;
      if (a.plan.mustDoToday && a.plan.latestEnd !== b.plan.latestEnd) {
        return a.plan.latestEnd - b.plan.latestEnd;
      }
      return byScoreThenDeadline(a, b);
    });
  const scoredFixed = fixedToday.map(score);

  const schedule = {
    date: dayKey,
    timezone: tz,
    workingHours: { start: minutesToTime(workStart), end: minutesToTime(workEnd) },
    slots: [],
    unscheduled: [],
    conflicts: [],
    stats: {
      totalTasks: scoredMovable.length + scoredFixed.length + fixedNoStart.length,
      scheduledTasks: 0,
      totalScheduledMinutes: 0,
      deepFocusMinutes: 0,
      utilizationPercent: 0,
      overdueTasks: 0,
    },
  };

  const occupied = [];
  let deepFocusUsed = 0;

  const addSlot = (task, startDate, endDate, extra = {}) => {
    schedule.slots.push({
      taskId: task._id,
      task: {
        _id: task._id,
        id: task._id,
        title: task.title,
        description: task.description,
        priority: task.priority,
        energyLevel: task.energyLevel,
        flexibility: task.flexibility,
        deadline: task.deadline,
        estimatedDuration: task.estimatedDuration,
      },
      scheduledStart: startDate.toISOString(),
      scheduledEnd: endDate.toISOString(),
      durationMinutes: task.estimatedDuration,
      scores: task.scores,
      reasons: buildReasons(task, now),
      explanation: generateExplanation(task, startDate, user, now),
      overdue: new Date(task.deadline) < now,
      mustDoToday: !!task.plan?.mustDoToday,
      ...extra,
    });
    schedule.stats.scheduledTasks++;
    schedule.stats.totalScheduledMinutes += task.estimatedDuration;
    if (new Date(task.deadline) < now) schedule.stats.overdueTasks++;
    if (task.energyLevel === "deep-focus") deepFocusUsed += task.estimatedDuration;
  };

  // ---- 1. fixed tasks are honoured exactly where the user put them
  for (const task of scoredFixed.sort((a, b) => new Date(a.scheduledStart) - new Date(b.scheduledStart))) {
    const s = new Date(task.scheduledStart);
    const e = new Date(s.getTime() + task.estimatedDuration * 60000);
    const startMin = minutesOfDay(s, tz);
    const slot = { start: startMin, end: startMin + task.estimatedDuration, task };

    for (const other of occupied) {
      if (slot.start < other.end && slot.end > other.start) {
        schedule.conflicts.push({
          type: "fixed-overlap",
          taskIds: [idOf(other.task), idOf(task)],
          message: `Fixed tasks "${other.task.title}" and "${task.title}" overlap`,
        });
      }
    }
    occupied.push(slot);
    addSlot(task, s, e, { fixed: true });
  }

  for (const task of fixedNoStart) {
    schedule.unscheduled.push({
      taskId: task._id,
      task: { ...task, scores: calculateAllScores(task, user, now) },
      reason: "Fixed-time task has no start time — set one so it can be placed",
      permanent: true,
    });
  }

  // ---- 2. movable tasks, highest score first
  let pendingDeepDemand = scoredMovable
    .filter((t) => t.energyLevel === "deep-focus")
    .reduce((sum, t) => sum + t.estimatedDuration, 0);

  for (const task of scoredMovable) {
    const isDeep = task.energyLevel === "deep-focus";
    if (isDeep) pendingDeepDemand -= task.estimatedDuration;

    if (isDeep && deepFocusUsed + task.estimatedDuration > maxDeepFocus) {
      schedule.unscheduled.push({
        taskId: task._id,
        task,
        reason: `Exceeds daily deep-focus capacity (${maxDeepFocus} minutes)`,
      });
      continue;
    }

    const deadline = new Date(task.deadline);
    const { latestEnd, deadlineToday, mustDoToday } = task.plan;

    // Energy-aware: keep the first half of the day free for deep-focus work
    // while deep tasks are still waiting, unless the task cannot wait.
    const preferAfter = !isDeep && pendingDeepDemand > 0 && !mustDoToday ? peakEnd : null;

    const slot = findAvailableSlot(earliest, latestEnd, task.estimatedDuration, buffer, occupied, preferAfter);

    if (!slot) {
      let reason = "No available time slot within working hours";
      if (earliest >= workEnd) reason = "Today's working hours are over";
      else if (deadlineToday && latestEnd < workEnd) {
        reason = `Not enough free time before its ${formatClock(deadline, tz)} deadline`;
      }
      schedule.unscheduled.push({ taskId: task._id, task, reason });
      continue;
    }

    occupied.push({ start: slot.start, end: slot.end, task });
    addSlot(task, at(slot.start), at(slot.end));
  }

  // ---- stats & ordering
  schedule.stats.deepFocusMinutes = deepFocusUsed;
  schedule.stats.utilizationPercent = Math.round(
    (schedule.stats.totalScheduledMinutes / (workEnd - workStart)) * 100,
  );
  schedule.slots.sort((a, b) => new Date(a.scheduledStart) - new Date(b.scheduledStart));
  return schedule;
}

/**
 * Multi-day plan. A task placed on an earlier day is not planned again on a
 * later one; tasks that did not fit carry over to the next day.
 */
function generateRangeSchedule(tasks, user, startDate, endDate, options = {}) {
  const tz = normalizeTimeZone(user.timezone);
  const startKey = resolveDayKey(startDate, tz);
  const endKey = resolveDayKey(endDate, tz);
  const placed = new Set(options.excludeIds || []);
  const schedules = [];

  let key = startKey;
  for (let i = 0; key <= endKey && i < MAX_RANGE_DAYS; i++) {
    const day = generateDailySchedule(tasks, user, key, { ...options, excludeIds: placed });
    day.slots.forEach((s) => placed.add(String(s.taskId)));
    day.unscheduled.filter((u) => u.permanent).forEach((u) => placed.add(String(u.taskId)));
    schedules.push(day);
    key = addDaysToKey(key, 1);
  }
  return schedules;
}

/* ------------------------------------------------------------------ */
/* Rescheduling                                                         */
/* ------------------------------------------------------------------ */

/**
 * Re-plan and explain what changed relative to the previously stored slots.
 */
function reschedule(tasks, user, options = {}) {
  const { incompleteTaskId, actualDuration, date = new Date(), now } = options;
  const tz = normalizeTimeZone(user.timezone);
  const newSchedule = generateDailySchedule(tasks, user, date, { now });
  const changes = [];

  if (incompleteTaskId) {
    const task = tasks.find((t) => String(t._id) === String(incompleteTaskId));
    if (task && actualDuration) {
      const overrun = actualDuration - task.estimatedDuration;
      if (overrun > 0) {
        changes.push({
          type: "overrun",
          taskId: incompleteTaskId,
          taskTitle: task.title,
          overrunMinutes: overrun,
          explanation: `Task "${task.title}" took ${overrun} minutes longer than estimated, causing schedule adjustment.`,
        });
      }
    }
  }

  const previous = new Map();
  for (const t of tasks) {
    if (t.scheduledStart && !t.isCompleted) previous.set(idOf(t), new Date(t.scheduledStart));
  }
  const dayKey = newSchedule.date;
  const placedIds = new Set();

  for (const slot of newSchedule.slots) {
    const id = String(slot.taskId);
    placedIds.add(id);
    const before = previous.get(id);
    if (before && dateKey(before, tz) === dayKey && before.getTime() !== new Date(slot.scheduledStart).getTime()) {
      changes.push({
        type: "moved",
        taskId: slot.taskId,
        taskTitle: slot.task.title,
        from: before.toISOString(),
        to: slot.scheduledStart,
        explanation: `"${slot.task.title}" moved from ${formatClock(before, tz)} to ${formatClock(slot.scheduledStart, tz)}.`,
      });
    }
  }
  for (const item of newSchedule.unscheduled) {
    const before = previous.get(String(item.taskId));
    if (before && dateKey(before, tz) === dayKey) {
      changes.push({
        type: "unscheduled",
        taskId: item.taskId,
        taskTitle: item.task.title,
        explanation: `"${item.task.title}" no longer fits today: ${item.reason}.`,
      });
    }
  }

  return {
    schedule: newSchedule,
    changes,
    summary:
      changes.length > 0
        ? `Schedule adjusted due to ${changes.length} change(s).`
        : "Schedule regenerated with current tasks.",
  };
}

module.exports = {
  // Score calculations
  calculateUrgencyScore,
  calculateImportanceScore,
  calculateRiskScore,
  calculateAllScores,

  // Schedule generation
  generateDailySchedule,
  generateRangeSchedule,
  findAvailableSlot,

  // Explanations
  generateExplanation,
  buildReasons,

  // Rescheduling
  reschedule,

  // Utilities
  parseTimeToMinutes,
  minutesToTime,
  calculateAvailableWorkMinutes,
  workWindow,
  resolveDayKey,

  // Constants (for testing)
  WEIGHTS,
  PRIORITY_VALUES,
  ENERGY_VALUES,
};
