/**
 * Independent schedule validator.
 *
 * Deliberately shares NO code with the scheduling engine: it only looks at
 * raw timestamps and the original task list, and re-derives every rule from
 * the spec. That is what makes it a cross-check rather than a tautology.
 *
 * Works for any timezone with a fixed UTC offset (offsetMinutes), which is
 * enough for the synthetic workloads (UTC) and for IST fixtures (+330).
 */

const MIN = 60000;

const toMin = (hhmm) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

/**
 * @param {Object} schedule  { slots:[{taskId, scheduledStart, scheduledEnd, fixed}], unscheduled:[{taskId, reason, permanent}] }
 * @param {Array}  tasks     original tasks
 * @param {Object} user
 * @param {Date}   now
 * @param {Object} ctx       { dayStartMs (local midnight as UTC ms), offsetMinutes=0 }
 * @returns {{violations: Array<{rule, detail}>, checks: Object}}
 */
function validateSchedule(schedule, tasks, user, now, ctx) {
  const { dayStartMs } = ctx;
  const dayEndMs = dayStartMs + 24 * 60 * MIN;
  const ws = toMin(user.workingHours.start);
  const we = toMin(user.workingHours.end);
  const windowStart = dayStartMs + ws * MIN;
  const windowEnd = dayStartMs + we * MIN;
  const buffer = Number.isFinite(user.bufferMinutes) ? user.bufferMinutes : 15;
  const cap = Number.isFinite(user.maxDeepFocusMinutes) ? user.maxDeepFocusMinutes : 240;
  const isToday = now.getTime() >= dayStartMs && now.getTime() < dayEndMs;

  const byId = new Map(tasks.map((t) => [String(t._id), t]));
  const violations = [];
  const fail = (rule, detail) => violations.push({ rule, detail });
  const checks = { slots: schedule.slots.length, rules: {} };
  const tally = (rule, ok) => {
    checks.rules[rule] = checks.rules[rule] || { checked: 0, failed: 0 };
    checks.rules[rule].checked++;
    if (!ok) checks.rules[rule].failed++;
  };

  const slots = schedule.slots.map((s) => ({
    id: String(s.taskId),
    start: new Date(s.scheduledStart).getTime(),
    end: new Date(s.scheduledEnd).getTime(),
    fixed: !!s.fixed,
  }));

  // R1: each slot belongs to a real, incomplete task, appears once, right length
  const seen = new Set();
  for (const s of slots) {
    const t = byId.get(s.id);
    tally("known-task", !!t);
    if (!t) {
      fail("known-task", `slot for unknown task ${s.id}`);
      continue;
    }
    tally("not-completed", !t.isCompleted);
    if (t.isCompleted) fail("not-completed", `${s.id} is completed but scheduled`);
    tally("unique", !seen.has(s.id));
    if (seen.has(s.id)) fail("unique", `${s.id} scheduled twice`);
    seen.add(s.id);
    const lengthOk = s.end - s.start === t.estimatedDuration * MIN;
    tally("duration", lengthOk);
    if (!lengthOk) fail("duration", `${s.id} slot length ${(s.end - s.start) / MIN} != ${t.estimatedDuration}`);
  }

  // R2: no overlaps; buffer respected unless both are fixed
  const sorted = slots.slice().sort((a, b) => a.start - b.start);
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const cur = sorted[i];
    const overlap = cur.start < prev.end;
    tally("no-overlap", !overlap || (prev.fixed && cur.fixed));
    if (overlap && !(prev.fixed && cur.fixed)) fail("no-overlap", `${prev.id} overlaps ${cur.id}`);
    if (!(prev.fixed && cur.fixed)) {
      const gapOk = cur.start - prev.end >= buffer * MIN;
      tally("buffer", gapOk);
      if (!gapOk) fail("buffer", `gap ${(cur.start - prev.end) / MIN}m between ${prev.id} and ${cur.id} < ${buffer}m`);
    }
  }

  // R3-R5: movable slots stay in the working window, before their deadline, not in the past
  let movableDeep = 0;
  let fixedDeep = 0;
  for (const s of slots) {
    const t = byId.get(s.id);
    if (!t) continue;
    if (t.energyLevel === "deep-focus") {
      if (s.fixed) fixedDeep += t.estimatedDuration;
      else movableDeep += t.estimatedDuration;
    }
    if (s.fixed) {
      const exact = new Date(t.scheduledStart).getTime() === s.start;
      tally("fixed-at-requested-time", exact);
      if (!exact) fail("fixed-at-requested-time", `${s.id} moved from its requested start`);
      continue;
    }
    const inWindow = s.start >= windowStart && s.end <= windowEnd;
    tally("within-working-hours", inWindow);
    if (!inWindow) fail("within-working-hours", `${s.id} outside working hours`);

    const overdue = new Date(t.deadline).getTime() < now.getTime();
    if (!overdue) {
      const ok = s.end <= new Date(t.deadline).getTime();
      tally("before-deadline", ok);
      if (!ok) fail("before-deadline", `${s.id} ends after its deadline`);
    }
    if (isToday) {
      const ok = s.start >= now.getTime();
      tally("not-in-past", ok);
      if (!ok) fail("not-in-past", `${s.id} starts before now`);
    }
  }

  // R6: deep-focus cap (fixed commitments are honoured regardless; then no movable deep work)
  const deepOk = movableDeep === 0 || movableDeep + fixedDeep <= cap;
  tally("deep-focus-cap", deepOk);
  if (!deepOk) fail("deep-focus-cap", `${movableDeep + fixedDeep}m deep-focus > cap ${cap}m`);

  // R7: conservation — every relevant task is either scheduled or listed as unscheduled
  const accounted = new Set([...seen, ...schedule.unscheduled.map((u) => String(u.taskId))]);
  for (const t of tasks) {
    if (t.isCompleted) continue;
    const dl = new Date(t.deadline).getTime();
    let relevant;
    if (t.flexibility === "fixed") {
      relevant = t.scheduledStart
        ? new Date(t.scheduledStart).getTime() >= dayStartMs && new Date(t.scheduledStart).getTime() < dayEndMs
        : dl >= dayStartMs;
    } else {
      relevant = dl >= dayStartMs || (isToday && dl < now.getTime());
    }
    if (!relevant) continue;
    tally("conservation", accounted.has(String(t._id)));
    if (!accounted.has(String(t._id))) fail("conservation", `${t._id} silently dropped`);
  }

  // R8: work-conserving — an unscheduled movable task must genuinely not fit
  // (checked by brute force over every start minute in the final schedule)
  const earliest = isToday ? Math.max(windowStart, Math.ceil(now.getTime() / (5 * MIN)) * 5 * MIN) : windowStart;
  for (const u of schedule.unscheduled) {
    const t = byId.get(String(u.taskId));
    if (!t || t.flexibility === "fixed" || /deep-focus capacity/i.test(u.reason)) continue;
    const dl = new Date(t.deadline).getTime();
    const overdue = dl < now.getTime();
    const latestEnd = !overdue && dl < dayEndMs ? Math.min(windowEnd, dl) : windowEnd;
    let fits = false;
    for (let start = earliest; start + t.estimatedDuration * MIN <= latestEnd && !fits; start += MIN) {
      const end = start + t.estimatedDuration * MIN;
      fits = !slots.some((s) => start < s.end + buffer * MIN && end > s.start - buffer * MIN);
    }
    tally("work-conserving", !fits);
    if (fits) fail("work-conserving", `${t._id} was rejected ("${u.reason}") but a free window exists`);
  }

  return { violations, checks };
}

module.exports = { validateSchedule };
