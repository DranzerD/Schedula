/**
 * AI Controller
 * Groq-backed endpoints: status and natural-language task parsing.
 */

const groq = require("../services/groqService");
const { parseTask } = require("../services/aiService");

/**
 * @desc    Is Groq configured? + usage metrics
 * @route   GET /api/ai/status
 * @access  Private
 */
const getStatus = (req, res) => {
  res.json({
    success: true,
    data: {
      ...groq.publicConfig(),
      metrics: groq.getMetrics(),
      fallback: "Deterministic rules are used whenever Groq is unavailable",
    },
  });
};

/**
 * @desc    Turn free text into a structured task (not saved — the client
 *          reviews it in the task form first)
 * @route   POST /api/ai/parse-task
 * @access  Private
 */
const parseTaskFromText = async (req, res) => {
  try {
    const { text } = req.body;
    const result = await parseTask(text, req.user);

    if (!result.task) {
      return res.status(422).json({
        success: false,
        message: result.warnings[0] || "Could not understand that task",
      });
    }

    res.json({ success: true, data: result });
  } catch (error) {
    console.error("Parse task error:", error.message);
    res.status(500).json({ success: false, message: "Failed to parse task" });
  }
};

module.exports = { getStatus, parseTaskFromText };
