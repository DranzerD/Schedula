const test = require("node:test");
const assert = require("node:assert/strict");
const engine = require("../services/schedulingEngine");
const { generateWorkload, DAY_START } = require("../evals/lib/workloads");
const { validateSchedule } = require("../evals/lib/validator");

const H = 3600000;
const NOW = new Date("2026-11-09T04:30:00Z"); // Monday 10:00 in India, 04:30 UTC
const USER = {
  workingHours: { start: "09:00", end: "17:00" },
  bufferMinutes: 15,
  maxDeepFocusMinutes: 240,
  timezone: "Asia/Kolkata",
};
const task = (over) => ({
  _id: over._id,
  title: over._id,
  priority: "medium",
  energyLevel: "low-focus",
  flexibility: "movable",
  estimatedDuration: 30,
  deadline: new Date(NOW.getTime() + 72 * H),
  isCompleted: false,
  ...over,
});
const plan = (tasks, user = USER, date = "2026-11-09", now = NOW) =>
  engine.generateDailySchedule(tasks, user, date, { now });
const slotOf = (s, id) => s.slots.find((x) => String(x.taskId) === id);

/* ---------------- scoring ---------------- */

test("urgency: overdue is 100, distant deadline is low, tight deadline is high", () => {
  assert.equal(engine.calculateUrgencyScore(task({ _id: "a", deadline: new Date(NOW - H) }), NOW), 100);
  assert.ok(engine.calculateUrgencyScore(task({ _id: "b", deadline: new Date(NOW.getTime() + 200 * H) }), NOW) < 5);
  assert.ok(engine.calculateUrgencyScore(task({ _id: "c", estimatedDuration: 60, deadline: new Date(NOW.getTime() + 90 * 60000) }), NOW) >= 80);
});

test("importance: priority + fixed + deep-focus bonuses, capped at 100", () => {
  assert.equal(engine.calculateImportanceScore({ priority: "low" }), 0);
  assert.equal(engine.calculateImportanceScore({ priority: "high" }), 60);
  assert.equal(engine.calculateImportanceScore({ priority: "high", flexibility: "fixed", energyLevel: "deep-focus" }), 100);
});

test("final score is the documented 40/35/25 blend", () => {
  const s = engine.calculateAllScores(task({ _id: "x", priority: "high", deadline: new Date(NOW.getTime() + 5 * H) }), USER, NOW);
  assert.equal(s.finalScore, Math.round(s.urgencyScore * 0.4 + s.importanceScore * 0.35 + s.riskScore * 0.25));
});

test("available work minutes counts only working hours in the user's timezone", () => {
  // 10:00 -> 17:00 IST today = 420 min, then all of tomorrow 09:00 -> 12:00 IST = 180
  const end = new Date("2026-11-10T06:30:00Z"); // 12:00 IST Tuesday
  assert.equal(engine.calculateAvailableWorkMinutes(NOW, end, USER), 420 + 180);
  // overnight only => zero
  assert.equal(engine.calculateAvailableWorkMinutes(new Date("2026-11-09T12:00:00Z"), new Date("2026-11-10T03:00:00Z"), USER), 0);
});

/* ---------------- placement & constraints ---------------- */

test("timezone: 09:00 working day is 03:30 UTC for an Indian user", () => {
  const s = plan([task({ _id: "a" })], USER, "2026-11-10"); // tomorrow, so no 'now' floor
  assert.equal(s.slots[0].scheduledStart, "2026-11-10T03:30:00.000Z");
  assert.equal(s.timezone, "Asia/Kolkata");
});

test("today's plan never starts before 'now'", () => {
  const s = plan([task({ _id: "a" })]);
  assert.ok(new Date(s.slots[0].scheduledStart) >= NOW);
});

test("fixed task appears at exactly the requested time (regression: fixed tasks used to vanish)", () => {
  const start = new Date("2026-11-09T09:30:00Z"); // 15:00 IST
  const s = plan([task({ _id: "fx", flexibility: "fixed", estimatedDuration: 60, scheduledStart: start, deadline: new Date(start.getTime() + 2 * H) })]);
  const slot = slotOf(s, "fx");
  assert.ok(slot, "fixed task must be on the schedule");
  assert.equal(slot.scheduledStart, start.toISOString());
  assert.equal(slot.fixed, true);
});

test("every pair of neighbouring tasks keeps the 15-minute buffer (movable-movable and movable-fixed)", () => {
  const start = new Date("2026-11-09T07:00:00Z"); // 12:30 IST
  const s = plan([
    task({ _id: "fx", flexibility: "fixed", estimatedDuration: 60, scheduledStart: start, deadline: new Date(start.getTime() + 2 * H) }),
    ...["a", "b", "c", "d", "e"].map((id) => task({ _id: id, estimatedDuration: 60 })),
  ]);
  const sorted = s.slots.slice().sort((x, y) => new Date(x.scheduledStart) - new Date(y.scheduledStart));
  assert.ok(sorted.length >= 4);
  for (let i = 1; i < sorted.length; i++) {
    const gap = new Date(sorted[i].scheduledStart) - new Date(sorted[i - 1].scheduledEnd);
    assert.ok(gap >= 15 * 60000, `gap of ${gap / 60000} min between ${sorted[i - 1].taskId} and ${sorted[i].taskId}`);
  }
});

test("fixed task without a start time is reported, never silently dropped", () => {
  const s = plan([task({ _id: "fx", flexibility: "fixed" })]);
  assert.equal(s.slots.length, 0);
  assert.match(s.unscheduled[0].reason, /no start time/i);
});

test("overlapping fixed tasks are flagged as a conflict", () => {
  const a = new Date("2026-11-09T07:00:00Z");
  const b = new Date("2026-11-09T07:30:00Z");
  const mk = (id, s) => task({ _id: id, flexibility: "fixed", estimatedDuration: 60, scheduledStart: s, deadline: new Date(s.getTime() + 2 * H) });
  const s = plan([mk("x", a), mk("y", b)]);
  assert.equal(s.conflicts.length, 1);
  assert.equal(s.conflicts[0].type, "fixed-overlap");
});

test("deadline is enforced: when the only free time is after the deadline the task is rejected, not placed late", () => {
  const fxStart = new Date("2026-11-09T05:00:00Z"); // 10:30 IST, blocks until 12:30 IST
  const dl = new Date("2026-11-09T07:30:00Z"); // 13:00 IST
  const s = plan([
    task({ _id: "fx", flexibility: "fixed", estimatedDuration: 120, scheduledStart: fxStart, deadline: new Date(fxStart.getTime() + 3 * H) }),
    task({ _id: "a", estimatedDuration: 60, deadline: dl }),
  ]);
  assert.equal(slotOf(s, "a"), undefined, "free window starts 12:45 IST, ending after the 13:00 deadline");
  assert.match(s.unscheduled.find((u) => String(u.taskId) === "a").reason, /before its .* deadline/);
});

test("a postponable high-score task cannot push a tight-deadline task past its deadline", () => {
  // Regression for the bug found during evaluation: report (due in 30h, high score)
  // used to take the morning and leave the 1pm-deadline email unscheduled.
  const s = plan([
    task({ _id: "report", priority: "high", energyLevel: "deep-focus", estimatedDuration: 120, deadline: new Date(NOW.getTime() + 30 * H) }),
    task({ _id: "email", priority: "low", estimatedDuration: 30, deadline: new Date(NOW.getTime() + 3 * H) }),
  ]);
  assert.ok(slotOf(s, "email"), "email must be scheduled");
  assert.ok(new Date(slotOf(s, "email").scheduledEnd) <= new Date(NOW.getTime() + 3 * H));
  assert.ok(slotOf(s, "report"));
  assert.equal(slotOf(s, "email").mustDoToday, true);
  assert.match(slotOf(s, "email").explanation, /cannot be postponed/);
});

test("overdue tasks are surfaced on today's plan and flagged", () => {
  const s = plan([task({ _id: "late", deadline: new Date(NOW.getTime() - 30 * H) })]);
  assert.ok(slotOf(s, "late"));
  assert.equal(slotOf(s, "late").overdue, true);
  assert.equal(s.stats.overdueTasks, 1);
});

test("deep-focus cap is respected and the overflow is explained", () => {
  const user = { ...USER, maxDeepFocusMinutes: 120 };
  const deep = (id) => task({ _id: id, energyLevel: "deep-focus", estimatedDuration: 90, priority: "high" });
  const s = plan([deep("a"), deep("b")], user);
  assert.equal(s.slots.length, 1);
  assert.match(s.unscheduled[0].reason, /deep-focus capacity \(120 minutes\)/);
});

test("bufferMinutes = 0 is honoured (regression: 0 used to be coerced to 15)", () => {
  const s = plan([task({ _id: "a", estimatedDuration: 60 }), task({ _id: "b", estimatedDuration: 60 })], { ...USER, bufferMinutes: 0 }, "2026-11-10");
  const [first, second] = s.slots;
  assert.equal(new Date(second.scheduledStart).getTime(), new Date(first.scheduledEnd).getTime());
});

test("completed tasks are never scheduled", () => {
  const s = plan([task({ _id: "done", isCompleted: true })]);
  assert.equal(s.slots.length + s.unscheduled.length, 0);
});

test("an infeasible task is reported with a human reason", () => {
  const s = plan([task({ _id: "huge", estimatedDuration: 480 })], USER, "2026-11-09");
  assert.equal(s.slots.length, 0);
  assert.ok(s.unscheduled[0].reason.length > 10);
});

/* ---------------- range, determinism, explanations ---------------- */

test("range plan never schedules the same task on two days (regression)", () => {
  const tasks = ["a", "b", "c", "d", "e", "f", "g", "h"].map((id) => task({ _id: id, estimatedDuration: 120 }));
  const days = engine.generateRangeSchedule(tasks, USER, "2026-11-09", "2026-11-12", { now: NOW });
  const ids = days.flatMap((d) => d.slots.map((s) => String(s.taskId)));
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(ids.length, 8, "carry-over lets every task find a day");
});

test("deterministic: same input twice, and shuffled input, give the same plan", () => {
  const w = generateWorkload(99, 25);
  const sig = (tasks) => JSON.stringify(engine.generateDailySchedule(tasks, w.user, w.dateKey, { now: w.now }).slots.map((s) => [s.taskId, s.scheduledStart]).sort());
  assert.equal(sig(w.tasks), sig(w.tasks));
  assert.equal(sig(w.tasks), sig(w.tasks.slice().reverse()));
});

test("every slot has an explanation whose numbers match its scores", () => {
  const w = generateWorkload(5, 15);
  const s = engine.generateDailySchedule(w.tasks, w.user, w.dateKey, { now: w.now });
  assert.ok(s.slots.length > 0);
  for (const slot of s.slots) {
    assert.match(slot.explanation, new RegExp(`Scheduling Score: ${slot.scores.finalScore}/100`));
    assert.match(slot.explanation, new RegExp(`Urgency: ${slot.scores.urgencyScore}/100`));
    assert.ok(slot.reasons.length > 0);
    assert.ok(slot.task._id, "slot.task needs _id so the UI can open its explanation");
  }
});

test("reschedule reports tasks that moved and why", () => {
  const a = task({ _id: "a", estimatedDuration: 60, scheduledStart: new Date("2026-11-09T09:30:00Z"), priority: "low" });
  const b = task({ _id: "b", estimatedDuration: 60, priority: "high", deadline: new Date(NOW.getTime() + 8 * H) });
  const result = engine.reschedule([a, b], USER, { date: "2026-11-09", now: NOW });
  const moved = result.changes.find((c) => c.type === "moved");
  assert.ok(moved, "task a had a stored slot that is no longer where the plan puts it");
  assert.match(moved.explanation, /moved from/);
});

/* ---------------- property test: independent validator over many random days ---------------- */

test("property: 150 random workloads produce zero hard-rule violations", () => {
  for (let seed = 1; seed <= 150; seed++) {
    const n = [5, 10, 20, 40][seed % 4];
    const w = generateWorkload(seed, n, { nowMinutes: seed % 5 === 0 ? 13 * 60 + 20 : 8 * 60 + 30 });
    const s = engine.generateDailySchedule(w.tasks, w.user, w.dateKey, { now: w.now });
    const { violations } = validateSchedule(s, w.tasks, w.user, w.now, { dayStartMs: DAY_START });
    assert.deepEqual(violations, [], `seed ${seed}: ${JSON.stringify(violations[0])}`);
  }
});
