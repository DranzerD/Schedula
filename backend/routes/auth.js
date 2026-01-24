/**
 * Authentication Routes
 * Handles user registration, login, and profile endpoints
 */

const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const {
  registerValidation,
  loginValidation,
} = require("../middleware/validation");
const {
  register,
  login,
  getMe,
  updatePassword,
} = require("../controllers/authController");

// Public routes
router.post("/register", registerValidation, register);
router.post("/login", loginValidation, login);

// Protected routes
router.get("/me", protect, getMe);
router.put("/password", protect, updatePassword);

module.exports = router;
