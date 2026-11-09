/**
 * Schedule Routes
 * Handles schedule generation and explanation endpoints
 */

const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const {
  scheduleDateValidation,
  mongoIdValidation,
} = require("../middleware/validation");
const {
  getSchedule,
  regenerateSchedule,
  getScheduleRange,
  getTaskExplanation,
  getSuggestions,
} = require("../controllers/scheduleController");
const { createRateLimiter } = require("../middleware/rateLimit");

const aiLimiter = createRateLimiter({ windowMs: 60000, max: 30 });

// All routes require authentication
router.use(protect);

// Schedule endpoints
router.get("/", scheduleDateValidation, getSchedule);
router.post("/regenerate", regenerateSchedule);
router.get("/range", getScheduleRange);
router.get("/explain/:taskId", aiLimiter, getTaskExplanation);
router.get("/suggestions", aiLimiter, scheduleDateValidation, getSuggestions);

module.exports = router;
