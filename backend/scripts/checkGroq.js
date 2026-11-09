/**
 * Verifies your Groq setup end-to-end. Never prints the key.
 *   cd backend && npm run check:groq
 */
require("../config/env").loadEnv();
const groq = require("../services/groqService");
const { parseTask } = require("../services/aiService");

(async () => {
  const cfg = groq.publicConfig();
  console.log(`Configured : ${cfg.configured ? "yes" : "NO — set GROQ_API_KEY in backend/.env"}`);
  console.log(`Base URL   : ${cfg.baseUrl}`);
  console.log(`Models     : ${cfg.model} (quality), ${cfg.fastModel} (fast)`);
  if (!cfg.configured) process.exit(1);

  try {
    const res = await fetch(`${cfg.baseUrl}/models`, {
      headers: { Authorization: `Bearer ${groq.config().apiKey}` },
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      console.log(`Key check  : FAILED (HTTP ${res.status}) ${body?.error?.message || ""}`);
      process.exit(1);
    }
    const ids = ((await res.json()).data || []).map((m) => m.id);
    console.log(`Key check  : OK (${ids.length} models visible)`);
    for (const m of [cfg.model, cfg.fastModel]) {
      console.log(`  ${ids.includes(m) ? "✓" : "✗ NOT AVAILABLE —"} ${m}`);
    }
  } catch (e) {
    console.log(`Key check  : network error — ${e.message}`);
    process.exit(1);
  }

  const out = await parseTask(
    "Finish the quarterly report by Friday 5pm, about 3 hours, high priority, deep focus",
    { timezone: "Asia/Kolkata", workingHours: { start: "09:00", end: "17:00" } },
  );
  console.log(`\nSample parse (source: ${out.source}, ${out.latencyMs}ms${out.fallbackReason ? ", fallback: " + out.fallbackReason : ""})`);
  console.log(JSON.stringify(out.task, null, 2));
  console.log(out.source === "groq" ? "\n✅ Groq integration is working." : "\n⚠️ Fell back to heuristic parser — see reason above.");
})();
