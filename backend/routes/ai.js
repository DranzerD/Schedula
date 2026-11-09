/**
 * AI Routes — Groq-powered features
 */

const express = require("express");
const router = express.Router();
const { body } = require("express-validator");
const { protect } = require("../middleware/auth");
const { handleValidationErrors } = require("../middleware/validation");
const { createRateLimiter } = require("../middleware/rateLimit");
const { getStatus, parseTaskFromText } = require("../controllers/aiController");

router.use(protect);

router.get("/status", getStatus);

router.post(
  "/parse-task",
  createRateLimiter({ windowMs: 60000, max: 20 }),
  [
    body("text")
      .isString()
      .withMessage("text is required")
      .trim()
      .isLength({ min: 3, max: 500 })
      .withMessage("Describe the task in 3-500 characters"),
    handleValidationErrors,
  ],
  parseTaskFromText,
);

module.exports = router;
