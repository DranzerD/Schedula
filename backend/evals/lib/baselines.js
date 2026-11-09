/**
 * Baseline planners used to put the engine's numbers in context.
 * Each one gets the SAME hard constraints as the engine (working hours,
 * buffer, deadline, deep-focus cap, fixed tasks pinned) and differs only in
 * the ORDER in which movable tasks are offered a slot. Placement itself is
 * an independent brute-force first-fit, not the engine's slot finder.
 */

const MIN = 60000;
const toMin = (hhmm) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

const PRIORITY_RANK = { high: 3, medium: 2, low: 1 };

const ORDERINGS = {
  fifo: (a, b) => a.createdIndex - b.createdIndex,
  edf: (a, b) => new Date(a.deadline) - new Date(b.deadline) || a.createdIndex - b.createdIndex,
  priority: (a, b) =>
    PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority] ||
    new Date(a.deadline) - new Date(b.deadline) ||
    a.createdIndex - b.createdIndex,
};

/**
 * @param {Array} tasks
 * @param {Object} user
 * @param {Date} now
 * @param {Object} ctx  { dayStartMs }
 * @param {Function|Array} order  comparator, or a pre-ordered array of ids (for "random")
 */
function planBaseline(tasks, user, now, ctx, order) {
  const { dayStartMs } = ctx;
  const dayEndMs = dayStartMs + 24 * 60 * MIN;
  const windowStart = dayStartMs + toMin(user.workingHours.start) * MIN;
  const windowEnd = dayStartMs + toMin(user.workingHours.end) * MIN;
  const buffer = user.bufferMinutes;
  const cap = user.maxDeepFocusMinutes;
  const isToday = now.getTime() >= dayStartMs && now.getTime() < dayEndMs;
  const earliest = isToday
    ? Math.max(windowStart, Math.ceil(now.getTime() / (5 * MIN)) * 5 * MIN)
    : windowStart;

  const slots = [];
  const unscheduled = [];
  let deepUsed = 0;

  const pending = tasks.filter((t) => !t.isCompleted);
  const fixed = pending.filter(
    (t) =>
      t.flexibility === "fixed" &&
      t.scheduledStart &&
      new Date(t.scheduledStart).getTime() >= dayStartMs &&
      new Date(t.scheduledStart).getTime() < dayEndMs,
  );
  let movable = pending.filter((t) => {
    if (t.flexibility === "fixed") return false;
    const dl = new Date(t.deadline).getTime();
    return dl >= dayStartMs || (isToday && dl < now.getTime());
  });

  if (Array.isArray(order)) {
    const rank = new Map(order.map((id, i) => [id, i]));
    movable = movable.sort((a, b) => rank.get(a._id) - rank.get(b._id));
  } else {
    movable = movable.sort(order);
  }

  for (const t of fixed) {
    const start = new Date(t.scheduledStart).getTime();
    slots.push({
      taskId: t._id,
      scheduledStart: new Date(start).toISOString(),
      scheduledEnd: new Date(start + t.estimatedDuration * MIN).toISOString(),
      fixed: true,
    });
    if (t.energyLevel === "deep-focus") deepUsed += t.estimatedDuration;
  }

  const overlapsAny = (start, end) =>
    slots.some((s) => {
      const ss = new Date(s.scheduledStart).getTime();
      const se = new Date(s.scheduledEnd).getTime();
      return start < se + buffer * MIN && end > ss - buffer * MIN;
    });

  for (const t of movable) {
    const dur = t.estimatedDuration * MIN;
    if (t.energyLevel === "deep-focus" && deepUsed + t.estimatedDuration > cap) {
      unscheduled.push({ taskId: t._id, reason: "Exceeds daily deep-focus capacity" });
      continue;
    }
    const dl = new Date(t.deadline).getTime();
    const overdue = dl < now.getTime();
    const latestEnd = !overdue && dl < dayEndMs ? Math.min(windowEnd, dl) : windowEnd;

    let placed = null;
    for (let start = earliest; start + dur <= latestEnd; start += MIN) {
      if (!overlapsAny(start, start + dur)) {
        placed = start;
        break;
      }
    }
    if (placed === null) {
      unscheduled.push({ taskId: t._id, reason: "No available time slot" });
      continue;
    }
    slots.push({
      taskId: t._id,
      scheduledStart: new Date(placed).toISOString(),
      scheduledEnd: new Date(placed + dur).toISOString(),
      fixed: false,
    });
    if (t.energyLevel === "deep-focus") deepUsed += t.estimatedDuration;
  }

  return { slots, unscheduled };
}

module.exports = { planBaseline, ORDERINGS };
