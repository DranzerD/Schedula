/**
 * Groq Service
 *
 * Thin, dependency-free client for Groq's OpenAI-compatible chat API
 * (https://console.groq.com/docs/api-reference#chat). Uses Node's built-in
 * fetch (Node 18+).
 *
 * Features: timeouts, retry with backoff on 429/5xx (honours Retry-After),
 * JSON-mode helper with tolerant parsing, and in-process usage metrics.
 *
 * Config (all read lazily so tests / .env changes take effect):
 *   GROQ_API_KEY      required
 *   GROQ_MODEL        default "openai/gpt-oss-120b" (quality)
 *   GROQ_FAST_MODEL   default "openai/gpt-oss-20b"    (cheap / low latency)
 *   GROQ_BASE_URL     default "https://api.groq.com/openai/v1"
 *   GROQ_TIMEOUT_MS   default 15000
 *   GROQ_MAX_RETRIES  default 2
 */

class GroqError extends Error {
  constructor(message, code, extra = {}) {
    super(message);
    this.name = "GroqError";
    this.code = code; // not_configured | timeout | rate_limited | auth | http_error | bad_response | network
    Object.assign(this, extra);
  }
}

const config = () => ({
  apiKey: (process.env.GROQ_API_KEY || "").trim(),
  model: process.env.GROQ_MODEL || "openai/gpt-oss-120b",
  fastModel: process.env.GROQ_FAST_MODEL || "openai/gpt-oss-20b",
  baseUrl: (process.env.GROQ_BASE_URL || "https://api.groq.com/openai/v1").replace(/\/+$/, ""),
  timeoutMs: parseInt(process.env.GROQ_TIMEOUT_MS, 10) || 15000,
  maxRetries: Number.isFinite(parseInt(process.env.GROQ_MAX_RETRIES, 10))
    ? parseInt(process.env.GROQ_MAX_RETRIES, 10)
    : 2,
});

const metrics = {
  requests: 0,
  successes: 0,
  failures: 0,
  retries: 0,
  promptTokens: 0,
  completionTokens: 0,
  totalLatencyMs: 0,
  lastError: null,
  lastErrorAt: null,
};

function resetMetrics() {
  Object.assign(metrics, {
    requests: 0,
    successes: 0,
    failures: 0,
    retries: 0,
    promptTokens: 0,
    completionTokens: 0,
    totalLatencyMs: 0,
    lastError: null,
    lastErrorAt: null,
  });
}

function getMetrics() {
  return {
    ...metrics,
    avgLatencyMs: metrics.successes
      ? Math.round(metrics.totalLatencyMs / metrics.successes)
      : 0,
  };
}

const isConfigured = () => config().apiKey.length > 0;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Single chat completion.
 *
 * @param {Object} opts
 * @param {Array}  opts.messages     OpenAI-style messages
 * @param {string} [opts.model]      defaults to GROQ_MODEL
 * @param {number} [opts.temperature=0.2]
 * @param {number} [opts.maxTokens=600]
 * @param {boolean}[opts.json=false] request JSON mode
 * @returns {Promise<{content:string, usage:Object, latencyMs:number, model:string, attempts:number}>}
 */
async function chatCompletion({
  messages,
  model,
  temperature = 0.2,
  maxTokens = 600,
  json = false,
}) {
  const cfg = config();
  if (!cfg.apiKey) {
    throw new GroqError("GROQ_API_KEY is not configured", "not_configured");
  }

  const body = {
    model: model || cfg.model,
    messages,
    temperature,
    max_tokens: maxTokens,
  };
  if (json) body.response_format = { type: "json_object" };
  // gpt-oss models are reasoning models: keep thinking short so replies are
  // fast/cheap and reasoning tokens don't eat the completion budget
  if (/gpt-oss/i.test(body.model)) {
    body.reasoning_effort = process.env.GROQ_REASONING_EFFORT || "low";
    body.max_tokens = Math.max(maxTokens, 1000);
  }

  metrics.requests++;
  const started = Date.now();
  let attempt = 0;
  let lastErr;

  while (attempt <= cfg.maxRetries) {
    attempt++;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), cfg.timeoutMs);

    try {
      const res = await fetch(`${cfg.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${cfg.apiKey}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (res.ok) {
        const data = await res.json();
        const content = data?.choices?.[0]?.message?.content;
        if (typeof content !== "string") {
          throw new GroqError("Groq response had no message content", "bad_response");
        }
        const latencyMs = Date.now() - started;
        metrics.successes++;
        metrics.totalLatencyMs += latencyMs;
        metrics.promptTokens += data.usage?.prompt_tokens || 0;
        metrics.completionTokens += data.usage?.completion_tokens || 0;
        return {
          content,
          usage: data.usage || {},
          latencyMs,
          model: data.model || body.model,
          attempts: attempt,
        };
      }

      // Error response — never include the key; include Groq's message only
      let detail = "";
      try {
        detail = (await res.json())?.error?.message || "";
      } catch (e) {
        /* ignore */
      }

      if (res.status === 401 || res.status === 403) {
        throw new GroqError(`Groq rejected the API key (${res.status}): ${detail}`, "auth", { status: res.status });
      }
      if (res.status === 429 || res.status >= 500) {
        const retryAfter = parseFloat(res.headers.get("retry-after"));
        lastErr = new GroqError(
          `Groq ${res.status}: ${detail || "temporary error"}`,
          res.status === 429 ? "rate_limited" : "http_error",
          { status: res.status },
        );
        if (attempt <= cfg.maxRetries) {
          metrics.retries++;
          const backoff = Number.isFinite(retryAfter)
            ? Math.min(retryAfter * 1000, parseInt(process.env.GROQ_MAX_BACKOFF_MS, 10) || 5000)
            : Math.min(400 * 2 ** (attempt - 1), 3000);
          await sleep(backoff);
          continue;
        }
        throw lastErr;
      }
      throw new GroqError(`Groq HTTP ${res.status}: ${detail}`, "http_error", { status: res.status });
    } catch (err) {
      clearTimeout(timer);
      if (err instanceof GroqError) {
        metrics.failures++;
        metrics.lastError = err.message;
        metrics.lastErrorAt = new Date().toISOString();
        throw err;
      }
      const isAbort = err.name === "AbortError";
      lastErr = new GroqError(
        isAbort ? `Groq request timed out after ${cfg.timeoutMs}ms` : `Groq network error: ${err.message}`,
        isAbort ? "timeout" : "network",
      );
      if (attempt <= cfg.maxRetries) {
        metrics.retries++;
        await sleep(Math.min(400 * 2 ** (attempt - 1), 3000));
        continue;
      }
      metrics.failures++;
      metrics.lastError = lastErr.message;
      metrics.lastErrorAt = new Date().toISOString();
      throw lastErr;
    }
  }
  metrics.failures++;
  throw lastErr;
}

/** Parse JSON from a model reply, tolerating code fences / surrounding prose. */
function parseJsonLoose(text) {
  if (typeof text !== "string") return null;
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch (e) {
    /* fall through */
  }
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) {
    try {
      return JSON.parse(fenced[1]);
    } catch (e) {
      /* fall through */
    }
  }
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start !== -1 && end > start) {
    try {
      return JSON.parse(trimmed.slice(start, end + 1));
    } catch (e) {
      /* fall through */
    }
  }
  return null;
}

/** Chat completion in JSON mode, returning the parsed object. */
async function chatJSON(opts) {
  const result = await chatCompletion({ ...opts, json: true });
  const parsed = parseJsonLoose(result.content);
  if (parsed === null || typeof parsed !== "object") {
    metrics.failures++;
    metrics.lastError = "Model returned invalid JSON";
    metrics.lastErrorAt = new Date().toISOString();
    throw new GroqError("Model returned invalid JSON", "bad_response", { raw: result.content });
  }
  return { ...result, data: parsed };
}

function publicConfig() {
  const cfg = config();
  return {
    configured: cfg.apiKey.length > 0,
    model: cfg.model,
    fastModel: cfg.fastModel,
    baseUrl: cfg.baseUrl,
  };
}

module.exports = {
  GroqError,
  isConfigured,
  chatCompletion,
  chatJSON,
  parseJsonLoose,
  getMetrics,
  resetMetrics,
  publicConfig,
  config,
};
