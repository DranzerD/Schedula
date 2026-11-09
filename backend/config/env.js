/**
 * Environment loading.
 *
 * Normal dotenv semantics (real environment variables win, so PORT=5001 or a
 * hosting platform's settings are respected), with ONE deliberate exception:
 * GROQ_* values written in backend/.env win over inherited ones. Reason: a
 * stale GROQ_API_KEY exported in a shell profile would otherwise silently
 * shadow the key you just put in .env. In production there is no .env file,
 * so this changes nothing there.
 */
const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");

function loadEnv(envPath = path.join(__dirname, "..", ".env")) {
  dotenv.config({ path: envPath });
  if (!fs.existsSync(envPath)) return;
  const fromFile = dotenv.parse(fs.readFileSync(envPath));
  for (const [key, value] of Object.entries(fromFile)) {
    if (key.startsWith("GROQ_") && value !== "") process.env[key] = value;
  }
}

module.exports = { loadEnv };
