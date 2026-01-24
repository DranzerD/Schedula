/**
 * Task Controller
 * Handles task CRUD operations
 */

const Task = require("../models/Task");
const { calculateAllScores } = require("../services/schedulingEngine");

/**
 * @desc    Create a new task
 * @route   POST /api/tasks
 * @access  Private
 */
const createTask = async (req, res) => {
  try {
    const {
      title,
      description,
      estimatedDuration,
      deadline,
      priority,
      flexibility,
      energyLevel,
    } = req.body;

    // Create task
    const task = await Task.create({
      user: req.user.id,
      title,
      description,
      estimatedDuration,
      deadline,
      priority: priority || "medium",
      flexibility: flexibility || "movable",
      energyLevel: energyLevel || "low-focus",
    });

    // Calculate initial scores
    const scores = calculateAllScores(task, req.user);
    task.scheduling = {
      ...scores,
      lastComputedAt: new Date(),
    };
    await task.save();

    res.status(201).json({
      success: true,
      message: "Task created successfully",
      data: { task },
    });
  } catch (error) {
    console.error("Create task error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create task",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * @desc    Get all tasks for current user
 * @route   GET /api/tasks
 * @access  Private
 */
const getTasks = async (req, res) => {
  try {
    const {
      completed,
      priority,
      energyLevel,
      sortBy = "deadline",
      order = "asc",
      limit = 50,
      page = 1,
    } = req.query;

    // Build query
    const query = { user: req.user.id };

    if (completed !== undefined) {
      query.isCompleted = completed === "true";
    }

    if (priority) {
      query.priority = priority;
    }

    if (energyLevel) {
      query.energyLevel = energyLevel;
    }

    // Build sort
    const sortOrder = order === "desc" ? -1 : 1;
    const sort = { [sortBy]: sortOrder };

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Execute query
    const [tasks, total] = await Promise.all([
      Task.find(query).sort(sort).skip(skip).limit(parseInt(limit)),
      Task.countDocuments(query),
    ]);

    // Update scores for pending tasks
    const tasksWithScores = tasks.map((task) => {
      if (!task.isCompleted) {
        const scores = calculateAllScores(task, req.user);
        return {
          ...task.toObject(),
          scheduling: {
            ...task.scheduling,
            ...scores,
            lastComputedAt: new Date(),
          },
        };
      }
      return task.toObject();
    });

    res.json({
      success: true,
      data: {
        tasks: tasksWithScores,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    console.error("Get tasks error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch tasks",
    });
  }
};

/**
 * @desc    Get single task by ID
 * @route   GET /api/tasks/:id
 * @access  Private
 */
const getTask = async (req, res) => {
  try {
    const task = await Task.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    // Update scores
    if (!task.isCompleted) {
      const scores = calculateAllScores(task, req.user);
      task.scheduling = {
        ...task.scheduling,
        ...scores,
        lastComputedAt: new Date(),
      };
    }

    res.json({
      success: true,
      data: { task },
    });
  } catch (error) {
    console.error("Get task error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch task",
    });
  }
};

/**
 * @desc    Update a task
 * @route   PUT /api/tasks/:id
 * @access  Private
 */
const updateTask = async (req, res) => {
  try {
    const task = await Task.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    // Track if being completed
    const wasCompleted = task.isCompleted;
    const isBeingCompleted = req.body.isCompleted === true && !wasCompleted;

    // Allowed fields to update
    const allowedUpdates = [
      "title",
      "description",
      "estimatedDuration",
      "deadline",
      "priority",
      "flexibility",
      "energyLevel",
      "isCompleted",
      "actualDuration",
      "scheduledStart",
      "scheduledEnd",
    ];

    // Apply updates
    allowedUpdates.forEach((field) => {
      if (req.body[field] !== undefined) {
        task[field] = req.body[field];
      }
    });

    // Set completion timestamp
    if (isBeingCompleted) {
      task.completedAt = new Date();
    }

    // Recalculate scores if not completed
    if (!task.isCompleted) {
      const scores = calculateAllScores(task, req.user);
      task.scheduling = {
        ...task.scheduling,
        ...scores,
        lastComputedAt: new Date(),
      };
    }

    await task.save();

    res.json({
      success: true,
      message: "Task updated successfully",
      data: { task },
    });
  } catch (error) {
    console.error("Update task error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update task",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * @desc    Delete a task
 * @route   DELETE /api/tasks/:id
 * @access  Private
 */
const deleteTask = async (req, res) => {
  try {
    const task = await Task.findOneAndDelete({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    res.json({
      success: true,
      message: "Task deleted successfully",
    });
  } catch (error) {
    console.error("Delete task error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete task",
    });
  }
};

/**
 * @desc    Mark task as complete with actual duration
 * @route   POST /api/tasks/:id/complete
 * @access  Private
 */
const completeTask = async (req, res) => {
  try {
    const { actualDuration } = req.body;

    const task = await Task.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    if (task.isCompleted) {
      return res.status(400).json({
        success: false,
        message: "Task is already completed",
      });
    }

    task.isCompleted = true;
    task.completedAt = new Date();

    if (actualDuration) {
      task.actualDuration = actualDuration;
    }

    await task.save();

    res.json({
      success: true,
      message: "Task marked as complete",
      data: { task },
    });
  } catch (error) {
    console.error("Complete task error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to complete task",
    });
  }
};

/**
 * @desc    Get tasks due today
 * @route   GET /api/tasks/today
 * @access  Private
 */
const getTodaysTasks = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const tasks = await Task.find({
      user: req.user.id,
      isCompleted: false,
      deadline: {
        $gte: today,
        $lt: tomorrow,
      },
    }).sort({ deadline: 1 });

    // Calculate scores
    const tasksWithScores = tasks.map((task) => {
      const scores = calculateAllScores(task, req.user);
      return {
        ...task.toObject(),
        scheduling: { ...scores },
      };
    });

    res.json({
      success: true,
      data: { tasks: tasksWithScores },
    });
  } catch (error) {
    console.error("Get today tasks error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch today's tasks",
    });
  }
};

module.exports = {
  createTask,
  getTasks,
  getTask,
  updateTask,
  deleteTask,
  completeTask,
  getTodaysTasks,
};
