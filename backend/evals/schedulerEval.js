/**
 * Scheduler evaluation — run:  npm run eval:scheduler
 *
 * Answers four questions, each with an independent check:
 *   1. CORRECTNESS   Does every generated schedule obey the hard rules?
 *                    (independent validator, evals/lib/validator.js)
 *   2. QUALITY       Is the plan better than naive orderings (FIFO / EDF /
 *                    priority-only / random) on the same workloads?
 *   3. DETERMINISM   Same input => same output, even if input order changes?
 *   4. EXPLAINABILITY Does every slot carry an explanation whose numbers
 *                    match its scores?   Plus: speed vs. number of tasks.
 *
 * Exits non-zero if any hard rule is violated.
 */

const fs = require("fs");
const path = require("path");
const { performance } = require("perf_hooks");
const engine = require("../services/schedulingEngine");
const { generateWorkload, DAY_START, MIN } = require("./lib/workloads");
const { validateSchedule } = require("./lib/validator");
const { planBaseline, ORDERINGS } = require("./lib/baselines");
const { mulberry32, shuffle, mean, stdev, percentile } = require("./lib/rng");

const SEEDS = parseInt(process.env.EVAL_SEEDS, 10) || 300;

const SCENARIOS = [
  { name: "light (5 tasks)", n: 5, nowMinutes: 8 * 60 + 30 },
  { name: "typical (10 tasks)", n: 10, nowMinutes: 8 * 60 + 30 },
  { name: "heavy (20 tasks)", n: 20, nowMinutes: 8 * 60 + 30 },
  { name: "overloaded (40 tasks)", n: 40, nowMinutes: 8 * 60 + 30 },
  { name: "mid-afternoon start (12 tasks, now=13:20)", n: 12, nowMinutes: 13 * 60 + 20 },
];

const ALGORITHMS = ["schedula", "edf", "priority", "fifo", "random"];
const WEIGHT = { high: 3, medium: 2, low: 1 };

/* ---------------- per-plan metrics (independent of the engine) ---------------- */

function planMetrics(plan, w) {
  const { tasks, user, now } = w;
  const byId = new Map(tasks.map((t) => [t._id, t]));
  const dayEnd = DAY_START + 24 * 60 * MIN;
  const ws = 9 * 60;
  const we = 17 * 60;
  const placedIds = new Set(plan.slots.map((s) => String(s.taskId)));

  // tasks relevant to "today" (movable only, fixed are pinned for every algorithm)
  const movable = tasks.filter((t) => {
    if (t.isCompleted || t.flexibility === "fixed") return false;
    const dl = new Date(t.deadline).getTime();
    return dl >= DAY_START || dl < now.getTime();
  });

  // "Critical" = cannot be postponed: overdue, due today, or not enough working
  // time left on later days. Re-derived here from first principles.
  const laterWorkMinutes = (deadlineMs) => {
    let total = 0;
    for (let d = DAY_START + 24 * 60 * MIN; d < deadlineMs; d += 24 * 60 * MIN) {
      const lo = Math.max(d + ws * MIN, d);
      const hi = Math.min(d + we * MIN, deadlineMs);
      if (hi > lo) total += (hi - lo) / MIN;
    }
    return total;
  };
  const isCritical = (t) => {
    const dl = new Date(t.deadline).getTime();
    if (dl < now.getTime() || dl < dayEnd) return true;
    return laterWorkMinutes(dl) < t.estimatedDuration + user.bufferMinutes;
  };

  const critical = movable.filter(isCritical);
  const feasibleCritical = critical.filter((t) => {
    // Overdue tasks have no hard feasibility constraint; due-today tasks must at least fit the window.
    const dl = new Date(t.deadline).getTime();
    return dl < now.getTime() || (Math.min(DAY_START + we * MIN, dl) - Math.max(DAY_START + ws * MIN, now.getTime())) / MIN >= t.estimatedDuration;
  });

  const totalValue = movable.reduce((s, t) => s + WEIGHT[t.priority] * t.estimatedDuration, 0);
  const placedMovable = movable.filter((t) => placedIds.has(t._id));
  const placedValue = placedMovable.reduce((s, t) => s + WEIGHT[t.priority] * t.estimatedDuration, 0);
  const high = movable.filter((t) => t.priority === "high");

  const pct = (a, b) => (b === 0 ? null : (100 * a) / b);

  // Deep-focus alignment: share of movable deep minutes starting in the first half of the day
  let deepMin = 0;
  let deepPeak = 0;
  const midpoint = DAY_START + ((ws + we) / 2) * MIN;
  for (const s of plan.slots) {
    const t = byId.get(String(s.taskId));
    if (!t || s.fixed || t.energyLevel !== "deep-focus") continue;
    deepMin += t.estimatedDuration;
    if (new Date(s.scheduledStart).getTime() < midpoint) deepPeak += t.estimatedDuration;
  }

  const scheduledMinutes = plan.slots.reduce((sum, s) => {
    const t = byId.get(String(s.taskId));
    return sum + (t ? t.estimatedDuration : 0);
  }, 0);

  return {
    placedPct: pct(placedMovable.length, movable.length),
    valuePct: pct(placedValue, totalValue),
    highPlacedPct: pct(high.filter((t) => placedIds.has(t._id)).length, high.length),
    criticalPlacedPct: pct(critical.filter((t) => placedIds.has(t._id)).length, critical.length),
    missedFeasibleCritical: feasibleCritical.filter((t) => !placedIds.has(t._id)).length,
    deepInPeakPct: pct(deepPeak, deepMin),
    utilizationPct: (100 * scheduledMinutes) / (we - ws),
  };
}

/* ---------------- run ---------------- */

function runPlan(algo, w, seed) {
  const ctx = { dayStartMs: DAY_START };
  if (algo === "schedula") {
    const s = engine.generateDailySchedule(w.tasks, w.user, w.dateKey, { now: w.now });
    return { slots: s.slots, unscheduled: s.unscheduled.map((u) => ({ taskId: u.taskId, reason: u.reason, permanent: u.permanent })), raw: s };
  }
  if (algo === "random") {
    const rand = mulberry32(seed * 7919 + 13);
    const ids = shuffle(rand, w.tasks.map((t) => t._id));
    return planBaseline(w.tasks, w.user, w.now, ctx, ids);
  }
  return planBaseline(w.tasks, w.user, w.now, ctx, ORDERINGS[algo]);
}

function main() {
  const report = { generatedAt: new Date().toISOString(), seeds: SEEDS, scenarios: [], determinism: {}, explainability: {}, performance: [] };
  const allViolations = [];
  const ruleTotals = {};

  console.log(`\nSchedula scheduler evaluation — ${SEEDS} random workloads per scenario\n`);

  for (const sc of SCENARIOS) {
    const per = Object.fromEntries(ALGORITHMS.map((a) => [a, { metrics: {}, violations: 0 }]));
    const head2head = { vsEdf: { win: 0, tie: 0, loss: 0 }, vsPriority: { win: 0, tie: 0, loss: 0 } };

    for (let seed = 1; seed <= SEEDS; seed++) {
      const w = generateWorkload(seed * 1000 + sc.n, sc.n, { nowMinutes: sc.nowMinutes });
      const results = {};
      for (const algo of ALGORITHMS) {
        const plan = runPlan(algo, w, seed);
        const check = validateSchedule(plan, w.tasks, w.user, w.now, { dayStartMs: DAY_START });
        per[algo].violations += check.violations.length;
        if (algo === "schedula") {
          check.violations.forEach((v) => allViolations.push({ scenario: sc.name, seed, ...v }));
          for (const [rule, r] of Object.entries(check.checks.rules)) {
            ruleTotals[rule] = ruleTotals[rule] || { checked: 0, failed: 0 };
            ruleTotals[rule].checked += r.checked;
            ruleTotals[rule].failed += r.failed;
          }
        }
        const m = planMetrics(plan, w);
        results[algo] = m;
        for (const [k, v] of Object.entries(m)) {
          if (v === null) continue;
          (per[algo].metrics[k] = per[algo].metrics[k] || []).push(v);
        }
      }
      // head-to-head on the metric that matters most: not losing feasible deadlines, then value
      const cmp = (a, b) => {
        if (a.missedFeasibleCritical !== b.missedFeasibleCritical) return a.missedFeasibleCritical < b.missedFeasibleCritical ? 1 : -1;
        const d = a.valuePct - b.valuePct;
        return Math.abs(d) < 0.05 ? 0 : d > 0 ? 1 : -1;
      };
      for (const [key, other] of [["vsEdf", "edf"], ["vsPriority", "priority"]]) {
        const r = cmp(results.schedula, results[other]);
        head2head[key][r > 0 ? "win" : r < 0 ? "loss" : "tie"]++;
      }
    }

    const summary = {};
    for (const algo of ALGORITHMS) {
      summary[algo] = { violations: per[algo].violations };
      for (const [k, xs] of Object.entries(per[algo].metrics)) summary[algo][k] = { mean: mean(xs), sd: stdev(xs) };
    }
    report.scenarios.push({ name: sc.name, n: sc.n, summary, headToHead: head2head });
  }

  /* ---- console tables ---- */
  const fmt = (x, d = 1) => (x === undefined ? "  n/a" : x.mean.toFixed(d).padStart(5));
  for (const s of report.scenarios) {
    console.log(`── ${s.name}`);
    console.log("   algorithm   missed-critical  critical%  value%  high-prio%  placed%  deep-in-AM%  util%  violations");
    for (const algo of ALGORITHMS) {
      const m = s.summary[algo];
      console.log(
        `   ${algo.padEnd(10)}  ${fmt(m.missedFeasibleCritical, 2).padStart(13)}  ${fmt(m.criticalPlacedPct).padStart(9)}  ${fmt(m.valuePct).padStart(6)}  ${fmt(m.highPlacedPct).padStart(10)}  ${fmt(m.placedPct).padStart(7)}  ${fmt(m.deepInPeakPct).padStart(11)}  ${fmt(m.utilizationPct).padStart(5)}  ${String(m.violations).padStart(10)}`,
      );
    }
    const h = s.headToHead;
    console.log(`   Schedula vs EDF: ${h.vsEdf.win}W/${h.vsEdf.tie}T/${h.vsEdf.loss}L   vs priority-only: ${h.vsPriority.win}W/${h.vsPriority.tie}T/${h.vsPriority.loss}L\n`);
  }

  /* ---- hard-rule summary ---- */
  console.log("── Hard rules (independent validator, Schedula only)");
  report.rules = ruleTotals;
  for (const [rule, r] of Object.entries(ruleTotals)) {
    console.log(`   ${r.failed === 0 ? "✓" : "✗"} ${rule.padEnd(26)} ${r.checked} checks, ${r.failed} failed`);
  }

  /* ---- determinism ---- */
  let sameRun = 0;
  let orderInvariant = 0;
  const DET = 200;
  for (let seed = 1; seed <= DET; seed++) {
    const w = generateWorkload(seed * 31, 20);
    const sig = (tasks) =>
      JSON.stringify(
        engine
          .generateDailySchedule(tasks, w.user, w.dateKey, { now: w.now })
          .slots.map((s) => [s.taskId, s.scheduledStart, s.scheduledEnd])
          .sort((a, b) => String(a[0]).localeCompare(String(b[0]))),
      );
    const base = sig(w.tasks);
    if (base === sig(w.tasks)) sameRun++;
    if (base === sig(shuffle(mulberry32(seed), w.tasks))) orderInvariant++;
  }
  report.determinism = { trials: DET, identicalOnRerun: sameRun, identicalWhenInputShuffled: orderInvariant };
  console.log(`\n── Determinism (${DET} workloads of 20 tasks)`);
  console.log(`   identical on re-run:            ${sameRun}/${DET}`);
  console.log(`   identical when input shuffled:  ${orderInvariant}/${DET}`);

  /* ---- explainability ---- */
  let slotsTotal = 0;
  let withText = 0;
  let scoresMatch = 0;
  let timeMatches = 0;
  let withReasons = 0;
  for (let seed = 1; seed <= 100; seed++) {
    const w = generateWorkload(seed * 17, 15);
    const s = engine.generateDailySchedule(w.tasks, w.user, w.dateKey, { now: w.now });
    for (const slot of s.slots) {
      slotsTotal++;
      if (slot.explanation && slot.explanation.length > 20) withText++;
      if (slot.reasons && slot.reasons.length > 0) withReasons++;
      const m = slot.explanation.match(/Scheduling Score: (\d+)\/100[\s\S]*Urgency: (\d+)[\s\S]*Importance: (\d+)[\s\S]*Risk: (\d+)/);
      if (m && +m[1] === slot.scores.finalScore && +m[2] === slot.scores.urgencyScore && +m[3] === slot.scores.importanceScore && +m[4] === slot.scores.riskScore) scoresMatch++;
      const t = slot.explanation.match(/Scheduled at (\d{2}):(\d{2}) (AM|PM)/);
      if (t) {
        let h = +t[1] % 12 + (t[3] === "PM" ? 12 : 0);
        const mins = h * 60 + +t[2];
        const d = new Date(slot.scheduledStart);
        if (mins === d.getUTCHours() * 60 + d.getUTCMinutes()) timeMatches++;
      }
    }
  }
  report.explainability = { slots: slotsTotal, withText, withReasons, scoresMatch, timeMatches };
  console.log(`\n── Explainability (${slotsTotal} scheduled slots)`);
  console.log(`   have an explanation:            ${withText}/${slotsTotal}`);
  console.log(`   list at least one reason:       ${withReasons}/${slotsTotal}`);
  console.log(`   score numbers match the scores: ${scoresMatch}/${slotsTotal}`);
  console.log(`   stated time matches the slot:   ${timeMatches}/${slotsTotal}`);

  /* ---- performance ---- */
  console.log("\n── Performance (median / p95 over 15 runs)");
  for (const n of [10, 100, 500, 1000, 5000]) {
    const w = generateWorkload(4242, n);
    const times = [];
    for (let i = 0; i < 15; i++) {
      const t0 = performance.now();
      engine.generateDailySchedule(w.tasks, w.user, w.dateKey, { now: w.now });
      times.push(performance.now() - t0);
    }
    const row = { tasks: n, medianMs: +percentile(times, 50).toFixed(2), p95Ms: +percentile(times, 95).toFixed(2) };
    report.performance.push(row);
    console.log(`   ${String(n).padStart(5)} tasks: ${row.medianMs.toFixed(2).padStart(8)} ms   p95 ${row.p95Ms.toFixed(2)} ms`);
  }

  /* ---- verdict & files ---- */
  const hardFailures = allViolations.length;
  report.hardRuleViolations = hardFailures;
  const dir = path.join(__dirname, "results");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "scheduler-metrics.json"), JSON.stringify(report, null, 2));
  fs.writeFileSync(path.join(dir, "scheduler-metrics.md"), toMarkdown(report));

  console.log(`\nWrote evals/results/scheduler-metrics.json and .md`);
  if (hardFailures > 0) {
    console.log(`\n❌ ${hardFailures} hard-rule violation(s). First 5:`);
    allViolations.slice(0, 5).forEach((v) => console.log(`   [${v.scenario} seed ${v.seed}] ${v.rule}: ${v.detail}`));
    process.exit(1);
  }
  console.log("\n✅ Zero hard-rule violations across all workloads.");
}

function toMarkdown(r) {
  const f = (x, d = 1) => (x === undefined ? "n/a" : x.mean.toFixed(d));
  let md = `# Scheduler evaluation\n\nGenerated ${r.generatedAt} · ${r.seeds} random workloads per scenario · ${r.hardRuleViolations} hard-rule violations\n\n`;
  for (const s of r.scenarios) {
    md += `## ${s.name}\n\n| Algorithm | Missed feasible deadlines ↓ | Critical tasks placed % ↑ | Priority-weighted value % ↑ | High-priority placed % ↑ | Deep work in morning % ↑ | Violations |\n|---|---|---|---|---|---|---|\n`;
    for (const a of ALGORITHMS) {
      const m = s.summary[a];
      md += `| ${a} | ${f(m.missedFeasibleCritical, 2)} | ${f(m.criticalPlacedPct)} | ${f(m.valuePct)} | ${f(m.highPlacedPct)} | ${f(m.deepInPeakPct)} | ${m.violations} |\n`;
    }
    md += `\nSchedula vs EDF: ${s.headToHead.vsEdf.win}W/${s.headToHead.vsEdf.tie}T/${s.headToHead.vsEdf.loss}L · vs priority-only: ${s.headToHead.vsPriority.win}W/${s.headToHead.vsPriority.tie}T/${s.headToHead.vsPriority.loss}L\n\n`;
  }
  md += `## Determinism\n\n- identical on re-run: ${r.determinism.identicalOnRerun}/${r.determinism.trials}\n- identical when input shuffled: ${r.determinism.identicalWhenInputShuffled}/${r.determinism.trials}\n\n`;
  md += `## Explainability\n\n- slots: ${r.explainability.slots}; explanation present: ${r.explainability.withText}; scores match: ${r.explainability.scoresMatch}; time matches: ${r.explainability.timeMatches}\n\n`;
  md += `## Performance\n\n| Tasks | Median ms | p95 ms |\n|---|---|---|\n` + r.performance.map((p) => `| ${p.tasks} | ${p.medianMs} | ${p.p95Ms} |`).join("\n") + "\n";
  return md;
}

main();
