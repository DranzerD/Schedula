/**
 * Boots the real server.js as a child process (no MongoDB needed for these
 * checks) and probes it over HTTP. Only this test's own child is stopped.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const path = require("node:path");

const PORT = 5600 + Math.floor(Math.random() * 300);
const KEY = "gsk_smoke_key_should_never_leak";

test("real server boots, exposes AI routes behind auth, and never leaks the key", async (t) => {
  const child = spawn(process.execPath, ["server.js"], {
    cwd: path.join(__dirname, ".."),
    env: {
      ...process.env,
      PORT: String(PORT),
      NODE_ENV: "development",
      JWT_SECRET: "smoke-secret",
      MONGODB_URI: "", // demo mode: no database
      GROQ_API_KEY: KEY,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  child.stdout.on("data", (d) => (output += d));
  child.stderr.on("data", (d) => (output += d));
  t.after(() => child.kill());

  const base = `http://127.0.0.1:${PORT}/api`;
  let health;
  for (let i = 0; i < 50 && !health; i++) {
    try {
      health = await (await fetch(`${base}/health`)).json();
    } catch (e) {
      await new Promise((r) => setTimeout(r, 100));
    }
  }
  assert.ok(health, `server did not start:\n${output}`);
  assert.equal(health.status, "ok");

  // The .env on a dev machine may hold a real key (dotenv override), so only
  // assert it reports a configured/unconfigured state, not which.
  assert.match(health.ai, /groq-configured|rules-only/);

  const unauth = [
    fetch(`${base}/ai/status`),
    fetch(`${base}/ai/parse-task`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: "hello there" }) }),
    fetch(`${base}/schedule/suggestions`),
    fetch(`${base}/schedule/explain/507f1f77bcf86cd799439011`),
  ];
  for (const r of await Promise.all(unauth)) assert.equal(r.status, 401);

  assert.equal((await fetch(`${base}/nothing`)).status, 404);
  assert.ok(!output.includes(KEY), "the API key must never be logged");
});
