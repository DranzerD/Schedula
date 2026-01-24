/**
 * User Controller
 * Handles user settings and preferences
 */

const User = require("../models/User");

/**
 * @desc    Get user settings
 * @route   GET /api/user/settings
 * @access  Private
 */
const getSettings = async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        settings: {
          workingHours: req.user.workingHours,
          maxDeepFocusMinutes: req.user.maxDeepFocusMinutes,
          bufferMinutes: req.user.bufferMinutes,
          timezone: req.user.timezone,
        },
      },
    });
  } catch (error) {
    console.error("Get settings error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get settings",
    });
  }
};

/**
 * @desc    Update user settings
 * @route   PUT /api/user/settings
 * @access  Private
 */
const updateSettings = async (req, res) => {
  try {
    const { workingHours, maxDeepFocusMinutes, bufferMinutes, timezone } =
      req.body;

    const user = await User.findById(req.user.id);

    // Update settings
    if (workingHours) {
      if (workingHours.start) {
        user.workingHours.start = workingHours.start;
      }
      if (workingHours.end) {
        user.workingHours.end = workingHours.end;
      }

      // Validate working hours order
      const startMinutes = timeToMinutes(user.workingHours.start);
      const endMinutes = timeToMinutes(user.workingHours.end);

      if (endMinutes <= startMinutes) {
        return res.status(400).json({
          success: false,
          message: "End time must be after start time",
        });
      }
    }

    if (maxDeepFocusMinutes !== undefined) {
      user.maxDeepFocusMinutes = maxDeepFocusMinutes;
    }

    if (bufferMinutes !== undefined) {
      user.bufferMinutes = bufferMinutes;
    }

    if (timezone) {
      user.timezone = timezone;
    }

    await user.save();

    res.json({
      success: true,
      message: "Settings updated successfully",
      data: {
        settings: {
          workingHours: user.workingHours,
          maxDeepFocusMinutes: user.maxDeepFocusMinutes,
          bufferMinutes: user.bufferMinutes,
          timezone: user.timezone,
        },
      },
    });
  } catch (error) {
    console.error("Update settings error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update settings",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * @desc    Update user profile
 * @route   PUT /api/user/profile
 * @access  Private
 */
const updateProfile = async (req, res) => {
  try {
    const { name, email } = req.body;

    const user = await User.findById(req.user.id);

    if (name) {
      user.name = name;
    }

    if (email && email !== user.email) {
      // Check if email is already taken
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: "Email is already in use",
        });
      }
      user.email = email;
    }

    await user.save();

    res.json({
      success: true,
      message: "Profile updated successfully",
      data: {
        user: user.toSafeObject(),
      },
    });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update profile",
    });
  }
};

/**
 * @desc    Get user dashboard stats
 * @route   GET /api/user/stats
 * @access  Private
 */
const getDashboardStats = async (req, res) => {
  try {
    const Task = require("../models/Task");

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const weekFromNow = new Date(today);
    weekFromNow.setDate(weekFromNow.getDate() + 7);

    // Get various task counts
    const [
      totalTasks,
      completedTasks,
      pendingTasks,
      overdueTasks,
      dueTodayTasks,
      dueThisWeekTasks,
      highPriorityPending,
      deepFocusPending,
    ] = await Promise.all([
      Task.countDocuments({ user: req.user.id }),
      Task.countDocuments({ user: req.user.id, isCompleted: true }),
      Task.countDocuments({ user: req.user.id, isCompleted: false }),
      Task.countDocuments({
        user: req.user.id,
        isCompleted: false,
        deadline: { $lt: new Date() },
      }),
      Task.countDocuments({
        user: req.user.id,
        isCompleted: false,
        deadline: { $gte: today, $lt: tomorrow },
      }),
      Task.countDocuments({
        user: req.user.id,
        isCompleted: false,
        deadline: { $gte: today, $lt: weekFromNow },
      }),
      Task.countDocuments({
        user: req.user.id,
        isCompleted: false,
        priority: "high",
      }),
      Task.countDocuments({
        user: req.user.id,
        isCompleted: false,
        energyLevel: "deep-focus",
      }),
    ]);

    // Calculate completion rate
    const completionRate =
      totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    res.json({
      success: true,
      data: {
        stats: {
          totalTasks,
          completedTasks,
          pendingTasks,
          overdueTasks,
          dueTodayTasks,
          dueThisWeekTasks,
          highPriorityPending,
          deepFocusPending,
          completionRate,
        },
      },
    });
  } catch (error) {
    console.error("Get stats error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get dashboard stats",
    });
  }
};

/**
 * Helper function to convert time string to minutes
 */
function timeToMinutes(timeStr) {
  const [hours, minutes] = timeStr.split(":").map(Number);
  return hours * 60 + minutes;
}

module.exports = {
  getSettings,
  updateSettings,
  updateProfile,
  getDashboardStats,
};
