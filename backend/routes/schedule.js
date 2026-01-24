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
} = require("../controllers/scheduleController");

// All routes require authentication
router.use(protect);

// Schedule endpoints
router.get("/", scheduleDateValidation, getSchedule);
router.post("/regenerate", regenerateSchedule);
router.get("/range", getScheduleRange);
router.get("/explain/:taskId", getTaskExplanation);

module.exports = router;
