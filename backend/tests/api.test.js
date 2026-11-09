/**
 * HTTP-level tests for /api/ai through the real Express router, validation and
 * rate limiter. Only the JWT/Mongo auth middleware is stubbed.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const { startMockGroq } = require("./helpers/mockGroq");

const SECRET = "gsk_api_test_key_abcdef";
process.env.GROQ_API_KEY = SECRET;
process.env.GROQ_MAX_RETRIES = "0";

// Stub auth: every request is "user u1" in India
const authPath = require.resolve("../middleware/auth");
require.cache[authPath] = {
  id: authPath,
  filename: authPath,
  loaded: true,
  exports: {
    protect: (req, res, next) => {
      req.user = {
        id: req.headers["x-test-user"] || "u1",
        timezone: "Asia/Kolkata",
        workingHours: { start: "09:00", end: "17:00" },
      };
      next();
    },
  },
};

const aiRoutes = require("../routes/ai");

async function withServer(fn) {
  const app = express();
  app.use(express.json({ limit: "100kb" }));
  app.use("/api/ai", aiRoutes);
  const server = await new Promise((resolve) => {
    const s = app.listen(0, "127.0.0.1", () => resolve(s));
  });
  const base = `http://127.0.0.1:${server.address().port}/api/ai`;
  try {
    await fn(base);
  } finally {
    await new Promise((r) => server.close(r));
  }
}
const post = (base, body, headers = {}) =>
  fetch(`${base}/parse-task`, { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify(body) });

test("GET /status reports configuration and metrics but never the key", async () => {
  await withServer(async (base) => {
    const res = await fetch(`${base}/status`);
    const text = await res.text();
    assert.equal(res.status, 200);
    assert.ok(!text.includes(SECRET));
    const body = JSON.parse(text);
    assert.equal(body.data.configured, true);
    assert.ok("metrics" in body.data);
  });
});

test("POST /parse-task validates input (too short, wrong type, too long)", async () => {
  await withServer(async (base) => {
    assert.equal((await post(base, { text: "hi" })).status, 400);
    assert.equal((await post(base, { text: 12345 })).status, 400);
    assert.equal((await post(base, {})).status, 400);
    assert.equal((await post(base, { text: "x".repeat(501) })).status, 400);
  });
});

test("POST /parse-task returns a reviewed-not-saved task using Groq", async () => {
  const mock = await startMockGroq(() =>
    JSON.stringify({ title: "Call mom", estimatedDuration: 20, deadline: "2026-12-24T18:00", priority: "medium" }),
  );
  process.env.GROQ_BASE_URL = mock.url;
  try {
    await withServer(async (base) => {
      const res = await post(base, { text: "Call mom on Christmas Eve at 6pm for 20 minutes" });
      assert.equal(res.status, 200);
      const { data } = await res.json();
      assert.equal(data.source, "groq");
      assert.equal(data.task.title, "Call mom");
      assert.equal(data.task.deadline, "2026-12-24T12:30:00.000Z"); // 18:00 IST
    });
  } finally {
    await mock.close();
  }
});

test("POST /parse-task still answers (heuristic) when Groq is down", async () => {
  const mock = await startMockGroq(() => ({ status: 503, json: { error: { message: "down" } } }));
  process.env.GROQ_BASE_URL = mock.url;
  try {
    await withServer(async (base) => {
      const res = await post(base, { text: "Reply to emails tomorrow, 30 min, low priority" });
      assert.equal(res.status, 200);
      const { data } = await res.json();
      assert.equal(data.source, "heuristic");
      assert.equal(data.task.priority, "low");
      assert.equal(data.task.estimatedDuration, 30);
    });
  } finally {
    await mock.close();
  }
});

test("rate limiter: 20 parses/minute per user, then 429 with Retry-After; other users unaffected", async () => {
  const mock = await startMockGroq(() => '{"title":"x"}');
  process.env.GROQ_BASE_URL = mock.url;
  try {
    await withServer(async (base) => {
      let last;
      for (let i = 0; i < 20; i++) last = await post(base, { text: "do something later" }, { "x-test-user": "spammer" });
      assert.equal(last.status, 200);
      const blocked = await post(base, { text: "do something later" }, { "x-test-user": "spammer" });
      assert.equal(blocked.status, 429);
      assert.ok(Number(blocked.headers.get("retry-after")) > 0);
      const other = await post(base, { text: "do something later" }, { "x-test-user": "someone-else" });
      assert.equal(other.status, 200);
      assert.equal(mock.calls.length, 21, "blocked request must not reach Groq");
    });
  } finally {
    await mock.close();
  }
});
