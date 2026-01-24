/**
 * Task Routes
 * Handles task CRUD endpoints
 */

const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const {
  createTaskValidation,
  updateTaskValidation,
  mongoIdValidation,
} = require("../middleware/validation");
const {
  createTask,
  getTasks,
  getTask,
  updateTask,
  deleteTask,
  completeTask,
  getTodaysTasks,
} = require("../controllers/taskController");

// All routes require authentication
router.use(protect);

// Task CRUD
router.post("/", createTaskValidation, createTask);
router.get("/", getTasks);
router.get("/today", getTodaysTasks);
router.get("/:id", mongoIdValidation, getTask);
router.put("/:id", updateTaskValidation, updateTask);
router.delete("/:id", mongoIdValidation, deleteTask);

// Task actions
router.post("/:id/complete", mongoIdValidation, completeTask);

module.exports = router;
