/**
 * User Routes
 * Handles user settings and profile endpoints
 */

const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const { updateSettingsValidation } = require("../middleware/validation");
const {
  getSettings,
  updateSettings,
  updateProfile,
  getDashboardStats,
} = require("../controllers/userController");

// All routes require authentication
router.use(protect);

// Settings endpoints
router.get("/settings", getSettings);
router.put("/settings", updateSettingsValidation, updateSettings);

// Profile endpoints
router.put("/profile", updateProfile);

// Stats endpoint
router.get("/stats", getDashboardStats);

module.exports = router;
