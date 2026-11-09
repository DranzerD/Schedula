/**
 * Local stand-in for Groq's /chat/completions endpoint.
 * `handler(req, body, callIndex)` returns { status, json, delayMs, headers } or
 * a plain string (used as the assistant message content).
 */
const http = require("http");

function startMockGroq(handler) {
  const calls = [];
  const server = http.createServer((req, res) => {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", async () => {
      const body = raw ? JSON.parse(raw) : {};
      calls.push({ url: req.url, headers: req.headers, body });
      let out = await handler(req, body, calls.length - 1);
      if (typeof out === "string") {
        out = {
          status: 200,
          json: {
            model: body.model,
            choices: [{ message: { content: out } }],
            usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
          },
        };
      }
      const send = () => {
        res.writeHead(out.status || 200, { "Content-Type": "application/json", ...(out.headers || {}) });
        res.end(JSON.stringify(out.json || {}));
      };
      out.delayMs ? setTimeout(send, out.delayMs) : send();
    });
  });

  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      resolve({
        url: `http://127.0.0.1:${server.address().port}/openai/v1`,
        calls,
        close: () => new Promise((r) => server.close(r)),
      });
    });
  });
}

module.exports = { startMockGroq };
