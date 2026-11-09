/**
 * Controller-level tests (schedule + AI-enhanced explain/suggestions) against
 * an in-memory fake of the Task model, so no MongoDB is required.
 * NOTE: the Mongoose schema itself is not exercised here.
 */
const test = require("node:test");
const assert = require("node:assert/strict");

delete process.env.GROQ_API_KEY; // rule-based path

/* ---------- fake Task model ---------- */
let store = [];
let idCounter = 0;
class FakeTask {
  constructor(data) {
    Object.assign(this, { _id: `t${++idCounter}`, isCompleted: false, rescheduleHistory: [], scheduling: {}, ...data });
    store.push(this);
  }
  async save() {
    if (!store.includes(this)) store.push(this);
    return this;
  }
  toObject() {
    const { save, toObject, ...rest } = this;
    return { ...rest };
  }
  static async find(q) {
    return store.filter((t) => String(t.user) === String(q.user) && (q.isCompleted === undefined || t.isCompleted === q.isCompleted));
  }
  static async findOne(q) {
    return store.find((t) => String(t._id) === String(q._id) && String(t.user) === String(q.user)) || null;
  }
}
const taskModelPath = require.resolve("../models/Task");
require.cache[taskModelPath] = { id: taskModelPath, filename: taskModelPath, loaded: true, exports: FakeTask };

const controller = require("../controllers/scheduleController");
const { addDaysToKey, dateKey, zonedTimeToUtc, parseDateKey } = require("../utils/timezone");

const TZ = "Asia/Kolkata";
const user = {
  id: "u1",
  timezone: TZ,
  workingHours: { start: "09:00", end: "17:00" },
  bufferMinutes: 15,
  maxDeepFocusMinutes: 240,
};
const tomorrow = addDaysToKey(dateKey(new Date(), TZ), 1);
const at = (key, hhmm) => {
  const { year, month, day } = parseDateKey(key);
  const [h, m] = hhmm.split(":").map(Number);
  return zonedTimeToUtc(year, month, day, h * 60 + m, TZ);
};
const farDeadline = () => new Date(Date.now() + 10 * 86400000);

const mk = (over) =>
  new FakeTask({
    user: "u1",
    title: over.title || "Task",
    priority: "medium",
    energyLevel: "low-focus",
    flexibility: "movable",
    estimatedDuration: 60,
    deadline: farDeadline(),
    ...over,
  });

const res = () => ({
  code: 200,
  body: null,
  status(c) {
    this.code = c;
    return this;
  },
  json(b) {
    this.body = b;
    return this;
  },
});
const call = async (fn, req) => {
  const r = res();
  await fn({ user, query: {}, body: {}, params: {}, ...req }, r);
  return r;
};

test.beforeEach(() => {
  store = [];
  idCounter = 0;
});

test("GET schedule: includes fixed tasks at their time, in the user's timezone", async () => {
  mk({ title: "Dentist", flexibility: "fixed", scheduledStart: at(tomorrow, "15:00"), deadline: at(tomorrow, "18:00") });
  mk({ title: "Report", priority: "high" });
  const r = await call(controller.getSchedule, { query: { date: tomorrow } });
  assert.equal(r.code, 200);
  const slots = r.body.data.schedule.slots;
  const dentist = slots.find((s) => s.task.title === "Dentist");
  assert.equal(dentist.scheduledStart, at(tomorrow, "15:00").toISOString());
  assert.ok(slots.find((s) => s.task.title === "Report"));
  assert.equal(r.body.data.schedule.timezone, TZ);
});

test("POST regenerate: persists movable slots only, never touches a fixed task's time", async () => {
  const fixedStart = at(tomorrow, "10:00");
  const fixed = mk({ title: "Standup", flexibility: "fixed", estimatedDuration: 30, scheduledStart: fixedStart, deadline: at(tomorrow, "12:00") });
  const mov = mk({ title: "Write" });
  const r = await call(controller.regenerateSchedule, { body: { date: tomorrow } });
  assert.equal(r.code, 200);
  assert.equal(new Date(fixed.scheduledStart).toISOString(), fixedStart.toISOString());
  assert.ok(mov.scheduledStart, "movable task got a slot");
  assert.ok(mov.scheduling.explanation.includes("Scheduling Score"));
  assert.ok(mov.scheduling.lastComputedAt);
});

test("POST regenerate: moving a task is recorded in rescheduleHistory with a reason", async () => {
  const a = mk({ title: "A", priority: "low" });
  await call(controller.regenerateSchedule, { body: { date: tomorrow } });
  const firstStart = new Date(a.scheduledStart).getTime();

  // an urgent task arrives and takes the first slot
  mk({ title: "B", priority: "high", deadline: at(tomorrow, "11:00"), estimatedDuration: 60 });
  const r = await call(controller.regenerateSchedule, { body: { date: tomorrow } });
  assert.equal(r.code, 200);
  assert.notEqual(new Date(a.scheduledStart).getTime(), firstStart);
  assert.equal(a.rescheduleHistory.length, 1);
  assert.match(a.rescheduleHistory[0].reason, /moved from/);
  assert.ok(r.body.data.changes.some((c) => c.type === "moved"));
});

test("GET range: validates input, caps at 7 days, never repeats a task across days", async () => {
  for (let i = 0; i < 8; i++) mk({ title: `T${i}`, estimatedDuration: 120 });
  const bad = await call(controller.getScheduleRange, { query: { startDate: tomorrow } });
  assert.equal(bad.code, 400);
  const backwards = await call(controller.getScheduleRange, { query: { startDate: tomorrow, endDate: addDaysToKey(tomorrow, -2) } });
  assert.equal(backwards.code, 400);
  const tooLong = await call(controller.getScheduleRange, { query: { startDate: tomorrow, endDate: addDaysToKey(tomorrow, 8) } });
  assert.equal(tooLong.code, 400);

  const ok = await call(controller.getScheduleRange, { query: { startDate: tomorrow, endDate: addDaysToKey(tomorrow, 3) } });
  assert.equal(ok.code, 200);
  const ids = ok.body.data.schedules.flatMap((d) => d.slots.map((s) => String(s.taskId)));
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(ids.length, 8);
});

test("GET explain: returns scores, deterministic markdown and a plain-English narrative", async () => {
  const t = mk({ title: "Report", priority: "high", deadline: new Date(Date.now() + 5 * 3600000) });
  const r = await call(controller.getTaskExplanation, { params: { taskId: t._id } });
  assert.equal(r.code, 200);
  const d = r.body.data;
  assert.ok(d.scores.finalScore >= 0);
  assert.match(d.explanation, /Scoring Breakdown/);
  assert.equal(d.narrativeSource, "rules");
  assert.ok(d.narrative.includes(`${d.scores.finalScore}/100`));
});

test("GET explain: someone else's task is a 404", async () => {
  const t = mk({ user: "u2" });
  const r = await call(controller.getTaskExplanation, { params: { taskId: t._id } });
  assert.equal(r.code, 404);
});

test("GET suggestions: works with no key (rules) and reflects real overdue work", async () => {
  mk({ title: "Late", deadline: new Date(Date.now() - 3600000) });
  mk({ title: "Fine" });
  const r = await call(controller.getSuggestions, { query: {} });
  assert.equal(r.code, 200);
  assert.equal(r.body.data.source, "rules");
  assert.ok(r.body.data.suggestions.some((s) => s.id === "overdue"));
  assert.ok(r.body.data.briefing.length > 0);
});
