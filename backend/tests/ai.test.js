const test = require("node:test");
const assert = require("node:assert/strict");

// No Groq key in this file: everything here must work on the rule-based path
delete process.env.GROQ_API_KEY;
const ai = require("../services/aiService");
const engine = require("../services/schedulingEngine");

const NOW = new Date("2026-11-09T04:30:00Z"); // Mon 10:00 IST
const CTX = { now: NOW, timezone: "Asia/Kolkata", workingHours: { start: 540, end: 1020 } };
const local = (iso) => new Date(iso).toLocaleString("sv-SE", { timeZone: "Asia/Kolkata" }).slice(0, 16);

/* ---------- normalizeParsedTask: never trust model output ---------- */

test("normalize: clamps duration, fixes enums, converts local deadline to UTC", () => {
  const { task } = ai.normalizeParsedTask(
    { title: "  Write   report ", estimatedDuration: "9999", priority: "URGENT", energyLevel: "deep focus", flexibility: "flexible", deadline: "2026-11-13T17:00" },
    CTX,
  );
  assert.equal(task.title, "Write report");
  assert.equal(task.estimatedDuration, 480);
  assert.equal(task.priority, "high");
  assert.equal(task.energyLevel, "deep-focus");
  assert.equal(task.flexibility, "movable");
  assert.equal(task.deadline, "2026-11-13T11:30:00.000Z");
});

test("normalize: garbage values fall back to safe defaults and say so", () => {
  const r = ai.normalizeParsedTask({ title: "x", estimatedDuration: "soon", priority: "banana", deadline: "whenever" }, CTX);
  assert.equal(r.task.estimatedDuration, 30);
  assert.equal(r.task.priority, "medium");
  assert.equal(local(r.task.deadline), "2026-11-10 17:00");
  assert.ok(r.assumptions.length >= 2);
});

test("normalize: a deadline in the past is replaced, with a warning", () => {
  const r = ai.normalizeParsedTask({ title: "x", deadline: "2026-01-01T10:00" }, CTX);
  assert.ok(new Date(r.task.deadline) > NOW);
  assert.ok(r.warnings.some((w) => /past/i.test(w)));
});

test("normalize: no title means no task; very long titles are truncated", () => {
  assert.equal(ai.normalizeParsedTask({ title: "   " }, CTX).task, null);
  assert.equal(ai.normalizeParsedTask({ title: "a".repeat(500) }, CTX).task.title.length, 200);
});

test("normalize: a start time makes the task fixed and stretches the deadline to cover it", () => {
  const { task } = ai.normalizeParsedTask(
    { title: "Dentist", estimatedDuration: 60, scheduledStart: "2026-11-12T15:00", deadline: "2026-11-12T15:00" },
    CTX,
  );
  assert.equal(task.flexibility, "fixed");
  assert.equal(local(task.scheduledStart), "2026-11-12 15:00");
  assert.ok(new Date(task.deadline) - new Date(task.scheduledStart) >= 60 * 60000);
});

test("normalize: injected fields are ignored (only whitelisted fields come out)", () => {
  const { task } = ai.normalizeParsedTask({ title: "x", isAdmin: true, user: "someone-else", __proto__: { polluted: 1 } }, CTX);
  assert.deepEqual(Object.keys(task).sort(), ["deadline", "description", "energyLevel", "estimatedDuration", "flexibility", "priority", "scheduledStart", "title"]);
});

/* ---------- heuristic parser (the no-key fallback) ---------- */

test("heuristic: parses a typical sentence completely", () => {
  const raw = ai.heuristicParse("Finish the quarterly report by Friday 5pm, 3 hours, high priority, deep focus", CTX);
  const { task } = ai.normalizeParsedTask(raw, CTX);
  assert.equal(task.estimatedDuration, 180);
  assert.equal(task.priority, "high");
  assert.equal(task.energyLevel, "deep-focus");
  assert.equal(local(task.deadline), "2026-11-13 17:00");
  assert.match(task.title, /quarterly report/i);
});

test("heuristic: durations in many spellings", () => {
  const dur = (t) => ai.heuristicParse(t, CTX).estimatedDuration;
  assert.equal(dur("do x for 45 minutes"), 45);
  assert.equal(dur("do x 2h"), 120);
  assert.equal(dur("do x, an hour and a half"), 90);
  assert.equal(dur("do x half an hour"), 30);
  assert.equal(dur("do x 1.5 hours"), 90);
});

test("heuristic: relative dates resolve in the user's timezone", () => {
  const dl = (t) => local(ai.heuristicParse(t, CTX).deadline);
  assert.equal(dl("task today 4pm"), "2026-11-09 16:00");
  assert.equal(dl("task tomorrow at 9am"), "2026-11-10 09:00");
  assert.equal(dl("task by Saturday"), "2026-11-14 17:00");
  assert.equal(dl("task by Nov 20"), "2026-11-20 17:00");
});

/* ---------- grounding ---------- */

test("isGrounded accepts numbers from the facts and rejects invented ones", () => {
  const facts = { scores: { final: 45, urgency: 64 }, hours: 2.8 };
  assert.equal(ai.isGrounded("Score 45 driven by urgency 64 with 2.8 hours left.", facts), true);
  assert.equal(ai.isGrounded("Score 45 plus a 99 bonus.", facts), false);
  assert.equal(ai.isGrounded("No numbers at all.", facts), true);
});

/* ---------- insights (rule path) ---------- */

test("insights: overdue and unscheduled work produce high-priority, factual suggestions", () => {
  const user = { workingHours: { start: "09:00", end: "17:00" }, bufferMinutes: 15, maxDeepFocusMinutes: 240, timezone: "Asia/Kolkata" };
  const H = 3600000;
  const mk = (id, over) => ({ _id: id, title: id, priority: "medium", energyLevel: "low-focus", flexibility: "movable", estimatedDuration: 120, deadline: new Date(NOW.getTime() + 72 * H), isCompleted: false, ...over });
  const tasks = [mk("late", { deadline: new Date(NOW.getTime() - 5 * H) }), ...["a", "b", "c", "d", "e"].map((id) => mk(id, { deadline: new Date(NOW.getTime() + 6 * H) }))];
  const schedule = engine.generateDailySchedule(tasks, user, "2026-11-09", { now: NOW });
  const { insights, facts } = ai.buildInsightFacts({ schedule, tasks, user, now: NOW });
  const ids = insights.map((i) => i.id);
  assert.ok(ids.includes("overdue"));
  assert.ok(ids.includes("unscheduled"));
  assert.equal(insights[0].priority, "high");
  assert.equal(facts.overdueCount, 1);
  assert.equal(facts.unscheduledCount, schedule.unscheduled.length);
});

test("insights: with no key, generateInsights returns the rule-based result", async () => {
  const user = { workingHours: { start: "09:00", end: "17:00" }, timezone: "UTC" };
  const schedule = engine.generateDailySchedule([], user, "2026-11-09", { now: NOW });
  const out = await ai.generateInsights({ schedule, tasks: [], user, now: NOW });
  assert.equal(out.source, "rules");
  assert.ok(out.briefing.length > 0);
  assert.equal(out.suggestions[0].id, "clear");
});

/* ---------- parseTask / narrate without a key ---------- */

test("parseTask: with no key it still works (heuristic) and says so", async () => {
  const out = await ai.parseTask("Call mom tomorrow at 6pm for 20 minutes", { timezone: "Asia/Kolkata" }, { now: NOW });
  assert.equal(out.source, "heuristic");
  assert.equal(out.fallbackReason, "not_configured");
  assert.equal(out.task.estimatedDuration, 20);
});

test("parseTask: empty input is rejected, input is capped at 500 chars", async () => {
  assert.equal((await ai.parseTask("   ", {}, { now: NOW })).task, null);
  const out = await ai.parseTask("x ".repeat(1000), {}, { now: NOW });
  assert.ok(out.task.title.length <= 200);
});

test("narrate: no key => deterministic narrative that quotes the real scores", async () => {
  const task = { title: "Report", priority: "high", energyLevel: "deep-focus", flexibility: "movable", estimatedDuration: 90, deadline: new Date(NOW.getTime() + 5 * 3600000) };
  const scores = engine.calculateAllScores(task, { timezone: "UTC", workingHours: { start: "09:00", end: "17:00" } }, NOW);
  const facts = ai.buildTaskFacts(task, scores, { timezone: "UTC" }, { now: NOW });
  const out = await ai.narrate(facts);
  assert.equal(out.source, "rules");
  assert.ok(out.narrative.includes(`${scores.finalScore}/100`));
  assert.ok(ai.isGrounded(out.narrative, facts), "the fallback text must itself pass the grounding check");
});

test("TtlCache expires entries and evicts when full", async () => {
  const c = new ai.TtlCache(20, 2);
  c.set("a", 1);
  c.set("b", 2);
  c.set("c", 3);
  assert.equal(c.get("a"), undefined);
  assert.equal(c.get("c"), 3);
  await new Promise((r) => setTimeout(r, 40));
  assert.equal(c.get("c"), undefined);
});
