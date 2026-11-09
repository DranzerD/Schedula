/**
 * Groq evaluation — run:  npm run eval:groq
 *
 * Measures the three Groq-powered features against objective checks:
 *
 *  A. Task parsing   30 hand-labelled sentences (evals/data/parseGold.js).
 *                    Field-level + all-fields accuracy, JSON-validity /
 *                    fallback rate, latency p50/p95, tokens.  The rule-based
 *                    heuristic parser is scored on the same key, so you can
 *                    see what Groq actually adds.
 *  B. Narratives     Are Groq explanations faithful? A narrative is accepted
 *                    only if every number it contains appears in the facts it
 *                    was given; we report the acceptance rate.
 *  C. Insights       Same grounding rule for the daily briefing/suggestions.
 *
 * Options:  --models=openai/gpt-oss-120b,openai/gpt-oss-20b   compare models for parsing
 *           --delay=400                                       ms between calls (rate limits)
 */

require("../config/env").loadEnv();

const fs = require("fs");
const path = require("path");
const groq = require("../services/groqService");
const ai = require("../services/aiService");
const engine = require("../services/schedulingEngine");
const { getZonedParts } = require("../utils/timezone");
const { CASES, HARD_CASES, REFERENCE_NOW, TIMEZONE, WORKING_HOURS } = require("./data/parseGold");
const { generateWorkload } = require("./lib/workloads");
const { mean, percentile } = require("./lib/rng");

const arg = (name, fallback) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split("=").slice(1).join("=") : fallback;
};
// Free-tier Groq limits are tight (tokens/minute): pace calls and allow long back-offs
// so the eval measures the model, not the rate limiter. Production defaults are unchanged.
process.env.GROQ_MAX_RETRIES = process.env.GROQ_MAX_RETRIES || "6";
process.env.GROQ_MAX_BACKOFF_MS = process.env.GROQ_MAX_BACKOFF_MS || "20000";
process.env.GROQ_TIMEOUT_MS = process.env.GROQ_TIMEOUT_MS || "60000";
const DELAY = parseInt(arg("delay", "1000"), 10);
const MODELS = arg("models", groq.config().model).split(",").map((s) => s.trim()).filter(Boolean);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const pct = (n, d) => (d ? `${((100 * n) / d).toFixed(1)}%` : "n/a");

const now = new Date(REFERENCE_NOW);
const user = { timezone: TIMEZONE, workingHours: WORKING_HOURS };
const localParts = (iso) => {
  const p = getZonedParts(new Date(iso), TIMEZONE);
  const pad = (n) => String(n).padStart(2, "0");
  return { date: `${p.year}-${pad(p.month)}-${pad(p.day)}`, time: `${pad(p.hour)}:${pad(p.minute)}` };
};

/** Score one parsed task against one gold case. Returns {field: true|false|undefined(not scored)}. */
function scoreCase(gold, task) {
  const r = {};
  if (!task) return { title: false, duration: gold.duration ? false : undefined, priority: false, energy: gold.energy ? false : undefined };
  const t = task.title.toLowerCase();
  r.title = gold.title.every((k) => t.includes(k.toLowerCase()));
  if (gold.duration) r.duration = task.estimatedDuration === gold.duration;
  if (gold.priority) r.priority = task.priority === gold.priority;
  if (gold.energy) r.energy = task.energyLevel === gold.energy;
  if (gold.flexibility) r.flexibility = task.flexibility === gold.flexibility;
  if ((gold.date || gold.dateAny) && !gold.minimal) {
    const d = localParts(task.deadline);
    const startLocal = task.scheduledStart ? localParts(task.scheduledStart) : null;
    const got = startLocal && (gold.start || gold.at) ? startLocal.date : d.date;
    r.date = gold.dateAny ? gold.dateAny.includes(got) : got === gold.date;
  }
  if (gold.time) r.time = localParts(task.deadline).time === gold.time;
  if (gold.at) {
    r.time =
      localParts(task.deadline).time === gold.at ||
      (!!task.scheduledStart && localParts(task.scheduledStart).time === gold.at);
  }
  if (gold.start) r.start = !!task.scheduledStart && localParts(task.scheduledStart).time === gold.start;
  return r;
}

function aggregate(rows) {
  const fields = {};
  let allCorrect = 0;
  for (const r of rows) {
    const scored = Object.entries(r.score).filter(([, v]) => v !== undefined);
    for (const [f, v] of scored) {
      fields[f] = fields[f] || { right: 0, total: 0 };
      fields[f].total++;
      if (v) fields[f].right++;
    }
    if (scored.every(([, v]) => v)) allCorrect++;
  }
  return { fields, allCorrect, total: rows.length };
}

async function evalParsing(model, cases) {
  const rows = [];
  for (const gold of cases) {
    const out = await ai.parseTask(gold.text, user, { now, model });
    rows.push({ gold, out, score: scoreCase(gold, out.task) });
    await sleep(DELAY);
  }
  const groqRows = rows.filter((r) => r.out.source === "groq");
  const lat = groqRows.map((r) => r.out.latencyMs);
  const tokens = groqRows.map((r) => (r.out.usage?.total_tokens || 0));
  return {
    model,
    ...aggregate(rows),
    groqServed: groqRows.length,
    fellBack: rows.length - groqRows.length,
    fallbackReasons: [...new Set(rows.filter((r) => r.out.source !== "groq").map((r) => r.out.fallbackReason))],
    latencyP50: Math.round(percentile(lat, 50)),
    latencyP95: Math.round(percentile(lat, 95)),
    tokensAvg: Math.round(mean(tokens)),
    failures: rows
      .filter((r) => Object.values(r.score).some((v) => v === false))
      .map((r) => ({
        text: r.gold.text,
        wrong: Object.entries(r.score).filter(([, v]) => v === false).map(([k]) => k),
        got: r.out.task && { title: r.out.task.title, min: r.out.task.estimatedDuration, pr: r.out.task.priority, en: r.out.task.energyLevel, fx: r.out.task.flexibility, deadline: r.out.task.deadline && `${localParts(r.out.task.deadline).date} ${localParts(r.out.task.deadline).time}`, start: r.out.task.scheduledStart && localParts(r.out.task.scheduledStart).time },
      })),
  };
}

function evalHeuristic(cases) {
  const rows = cases.map((gold) => {
    const ctx = { now, timezone: TIMEZONE, workingHours: { start: 540, end: 1020 } };
    const { task } = ai.normalizeParsedTask(ai.heuristicParse(gold.text, ctx), ctx);
    return { gold, score: scoreCase(gold, task), out: {} };
  });
  return aggregate(rows);
}

async function evalNarratives() {
  const w = generateWorkload(7, 12);
  const u = { ...w.user, timezone: "UTC" };
  const facts = w.tasks.slice(0, 12).map((t) => {
    const scores = engine.calculateAllScores(t, u, w.now);
    return ai.buildTaskFacts(t, scores, u, { now: w.now });
  });
  let groqUsed = 0;
  let rejected = 0;
  let fellBack = 0;
  const rejectReasons = {};
  const rejectedExamples = [];
  const lat = [];
  const words = [];
  const samples = [];
  for (const f of facts) {
    const res = await ai.narrate(f);
    if (res.source === "groq") {
      groqUsed++;
      lat.push(res.latencyMs);
      words.push(res.narrative.split(/\s+/).length);
      samples.push({ facts: f, narrative: res.narrative });
    } else if (res.rejected) {
      rejected++;
      rejectReasons[res.rejected] = (rejectReasons[res.rejected] || 0) + 1;
      rejectedExamples.push(res.rejected + ": " + (res.rawText || ""));
    } else fellBack++;
    await sleep(DELAY);
  }
  return { total: facts.length, groqUsed, rejectReasons, rejectedUngrounded: rejected, fellBackOther: fellBack, avgWords: Math.round(mean(words)), latencyP50: Math.round(percentile(lat, 50)), samples };
}

async function evalInsights() {
  const results = [];
  for (const [seed, n] of [[3, 8], [11, 15], [19, 25], [23, 5]]) {
    const w = generateWorkload(seed, n);
    const u = { ...w.user };
    const schedule = engine.generateDailySchedule(w.tasks, u, w.dateKey, { now: w.now });
    const out = await ai.generateInsights({ schedule, tasks: w.tasks, user: u, now: w.now });
    const groqCount = out.suggestions.filter((s) => s.source === "groq").length;
    results.push({ scenario: `${n} tasks`, source: out.source, suggestions: out.suggestions.length, groqWorded: groqCount, briefing: out.briefing, fallbackReason: out.fallbackReason });
    await sleep(DELAY);
  }
  return results;
}

function pctField(f) {
  return f ? `${((100 * f.right) / f.total).toFixed(0)}% (${f.right}/${f.total})` : "n/a";
}

async function main() {
  if (!groq.isConfigured()) {
    console.log("GROQ_API_KEY is not set (backend/.env). Nothing to evaluate.");
    process.exit(2);
  }
  console.log(`\nGroq evaluation — models for parsing: ${MODELS.join(", ")}\n`);

  const SETS = [
    { key: "standard", label: "standard set", cases: CASES },
    { key: "holdout", label: "HOLDOUT set (messier phrasing)", cases: HARD_CASES },
  ].filter((x) => !process.argv.includes("--skip-parsing") && (!arg("set") || x.key === arg("set")));
  const report = { generatedAt: new Date().toISOString(), referenceNow: REFERENCE_NOW, timezone: TIMEZONE, sets: {}, narratives: null, insights: null };

  const FIELDS = ["title", "duration", "priority", "energy", "flexibility", "date", "time", "start"];
  const row = (label, a, extra = "") =>
    "   " + label.padEnd(24) + FIELDS.map((f) => (a.fields[f] ? `${((100 * a.fields[f].right) / a.fields[f].total).toFixed(0)}%` : "-").padEnd(6)).join("") + `${pct(a.allCorrect, a.total)}`.padEnd(8) + extra;

  for (const set of SETS) {
    const heuristic = evalHeuristic(set.cases);
    report.sets[set.key] = { cases: set.cases.length, heuristic, parsing: [] };
    console.log(`-- A. Task parsing - ${set.label} (${set.cases.length} labelled sentences)`);
    console.log("   " + "parser".padEnd(24) + FIELDS.map((f) => f.slice(0, 5).padEnd(6)).join("") + "ALL     served  p50/p95 ms  tokens");
    console.log(row("rule-based heuristic", heuristic, "-"));
    for (const model of MODELS) {
      const res = await evalParsing(model, set.cases);
      report.sets[set.key].parsing.push(res);
      console.log(row(model, res, `${res.groqServed}/${res.total}`.padEnd(8) + `${res.latencyP50}/${res.latencyP95}`.padEnd(12) + res.tokensAvg));
      if (res.fellBack) console.log(`      ! ${res.fellBack} request(s) fell back to the heuristic: ${res.fallbackReasons.join(", ")}`);
    }
    const best = report.sets[set.key].parsing[0];
    if (best && best.failures.length) {
      console.log(`\n   Mistakes by ${best.model} (${best.failures.length}):`);
      best.failures.forEach((f) => console.log(`   x "${f.text.slice(0, 80)}"\n       wrong: ${f.wrong.join(", ")}  got: ${JSON.stringify(f.got)}`));
    }
    console.log("");
  }

  console.log("\n── B. Explanation narratives (grounding check)");
  report.narratives = await evalNarratives();
  const n = report.narratives;
  console.log(`   Groq text accepted:        ${n.groqUsed}/${n.total}`);
  console.log(`   rejected as ungrounded:    ${n.rejectedUngrounded}/${n.total}   (fell back to rule-based text)`);
  console.log(`   rejection reasons:         ${JSON.stringify(n.rejectReasons)}`);
  console.log(`   other fallbacks:           ${n.fellBackOther}/${n.total}`);
  console.log(`   avg length: ${n.avgWords} words · p50 latency ${n.latencyP50} ms`);
  n.samples.slice(0, 3).forEach((s) => console.log(`   e.g. "${s.narrative}"`));

  console.log("\n── C. Daily insights");
  report.insights = await evalInsights();
  report.insights.forEach((r) => console.log(`   ${r.scenario.padEnd(9)} source=${r.source.padEnd(5)} Groq-worded ${r.groqWorded}/${r.suggestions}${r.fallbackReason ? "  fallback: " + r.fallbackReason : ""}\n      briefing: ${r.briefing}`));

  report.groqMetrics = groq.getMetrics();
  console.log(`\n── Totals: ${report.groqMetrics.requests} requests, ${report.groqMetrics.retries} retries, ${report.groqMetrics.failures} failures, ${report.groqMetrics.promptTokens + report.groqMetrics.completionTokens} tokens`);

  const dir = path.join(__dirname, "results");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "groq-metrics.json"), JSON.stringify(report, null, 2));
  console.log("Wrote evals/results/groq-metrics.json");
}

main().catch((e) => {
  console.error("Eval crashed:", e.message);
  process.exit(1);
});
