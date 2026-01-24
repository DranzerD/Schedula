/**
 * Schedule Controller
 * Handles schedule generation and rescheduling
 */

const Task = require("../models/Task");
const {
  generateDailySchedule,
  reschedule,
  calculateAllScores,
} = require("../services/schedulingEngine");

/**
 * @desc    Generate daily schedule
 * @route   GET /api/schedule
 * @access  Private
 */
const getSchedule = async (req, res) => {
  try {
    const { date } = req.query;

    // Parse date or use today
    const scheduleDate = date ? new Date(date) : new Date();

    // Get all pending tasks for this user
    const tasks = await Task.find({
      user: req.user.id,
      isCompleted: false,
      deadline: { $gte: new Date() },
    });

    // Generate schedule
    const schedule = generateDailySchedule(tasks, req.user, scheduleDate);

    res.json({
      success: true,
      data: { schedule },
    });
  } catch (error) {
    console.error("Get schedule error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate schedule",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * @desc    Regenerate schedule (after task completion or changes)
 * @route   POST /api/schedule/regenerate
 * @access  Private
 */
const regenerateSchedule = async (req, res) => {
  try {
    const { date, incompleteTaskId, actualDuration } = req.body;

    const scheduleDate = date ? new Date(date) : new Date();

    // Get all pending tasks
    const tasks = await Task.find({
      user: req.user.id,
      isCompleted: false,
      deadline: { $gte: new Date() },
    });

    // Reschedule with options
    const result = reschedule(tasks, req.user, {
      incompleteTaskId,
      actualDuration,
      date: scheduleDate,
    });

    // Update tasks with new scheduled times
    for (const slot of result.schedule.slots) {
      await Task.findByIdAndUpdate(slot.taskId, {
        scheduledStart: slot.scheduledStart,
        scheduledEnd: slot.scheduledEnd,
        "scheduling.urgencyScore": slot.scores.urgencyScore,
        "scheduling.importanceScore": slot.scores.importanceScore,
        "scheduling.riskScore": slot.scores.riskScore,
        "scheduling.finalScore": slot.scores.finalScore,
        "scheduling.explanation": slot.explanation,
        "scheduling.lastComputedAt": new Date(),
      });
    }

    res.json({
      success: true,
      message: result.summary,
      data: {
        schedule: result.schedule,
        changes: result.changes,
      },
    });
  } catch (error) {
    console.error("Regenerate schedule error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to regenerate schedule",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * @desc    Get schedule for a date range
 * @route   GET /api/schedule/range
 * @access  Private
 */
const getScheduleRange = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: "startDate and endDate are required",
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    // Limit to 7 days
    const maxDays = 7;
    const daysDiff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));

    if (daysDiff > maxDays) {
      return res.status(400).json({
        success: false,
        message: `Date range cannot exceed ${maxDays} days`,
      });
    }

    // Get all pending tasks
    const tasks = await Task.find({
      user: req.user.id,
      isCompleted: false,
      deadline: { $gte: start },
    });

    // Generate schedule for each day
    const schedules = [];
    const currentDate = new Date(start);

    while (currentDate <= end) {
      const daySchedule = generateDailySchedule(tasks, req.user, currentDate);
      schedules.push(daySchedule);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    res.json({
      success: true,
      data: { schedules },
    });
  } catch (error) {
    console.error("Get schedule range error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get schedule range",
    });
  }
};

/**
 * @desc    Get task explanation
 * @route   GET /api/schedule/explain/:taskId
 * @access  Private
 */
const getTaskExplanation = async (req, res) => {
  try {
    const task = await Task.findOne({
      _id: req.params.taskId,
      user: req.user.id,
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    // Calculate fresh scores
    const scores = calculateAllScores(task, req.user);

    // Build detailed explanation
    const explanation = buildDetailedExplanation(task, scores);

    res.json({
      success: true,
      data: {
        taskId: task._id,
        taskTitle: task.title,
        scores,
        explanation,
      },
    });
  } catch (error) {
    console.error("Get explanation error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get task explanation",
    });
  }
};

/**
 * Build a detailed explanation for a task's scheduling
 */
function buildDetailedExplanation(task, scores) {
  const lines = [];

  // Header
  lines.push(`## Scheduling Analysis for "${task.title}"`);
  lines.push("");

  // Scores breakdown
  lines.push("### Scoring Breakdown");
  lines.push("");
  lines.push(`| Metric | Score | Weight | Contribution |`);
  lines.push(`|--------|-------|--------|--------------|`);
  lines.push(
    `| Urgency | ${scores.urgencyScore}/100 | 40% | ${Math.round(scores.urgencyScore * 0.4)} |`,
  );
  lines.push(
    `| Importance | ${scores.importanceScore}/100 | 35% | ${Math.round(scores.importanceScore * 0.35)} |`,
  );
  lines.push(
    `| Risk | ${scores.riskScore}/100 | 25% | ${Math.round(scores.riskScore * 0.25)} |`,
  );
  lines.push(`| **Final** | **${scores.finalScore}/100** | | |`);
  lines.push("");

  // Urgency analysis
  lines.push("### Urgency Analysis");
  const deadline = new Date(task.deadline);
  const hoursRemaining = Math.round((deadline - new Date()) / (1000 * 60 * 60));
  const daysRemaining = Math.round(hoursRemaining / 24);

  if (hoursRemaining <= 0) {
    lines.push("⚠️ **OVERDUE**: This task is past its deadline!");
  } else if (hoursRemaining <= 24) {
    lines.push(
      `🔴 **Critical**: Only ${hoursRemaining} hours remaining until deadline.`,
    );
  } else if (daysRemaining <= 3) {
    lines.push(
      `🟠 **Urgent**: ${daysRemaining} days remaining until deadline.`,
    );
  } else {
    lines.push(
      `🟢 **Comfortable**: ${daysRemaining} days remaining until deadline.`,
    );
  }

  const timeRatio = task.estimatedDuration / (hoursRemaining * 60);
  lines.push(
    `Task requires ${task.estimatedDuration} minutes, representing ${Math.round(timeRatio * 100)}% of remaining time.`,
  );
  lines.push("");

  // Importance analysis
  lines.push("### Importance Analysis");
  lines.push(`- Priority Level: **${task.priority.toUpperCase()}**`);
  lines.push(
    `- Flexibility: **${task.flexibility}** ${task.flexibility === "fixed" ? "(+30 importance bonus)" : ""}`,
  );
  lines.push(
    `- Energy Requirement: **${task.energyLevel}** ${task.energyLevel === "deep-focus" ? "(+10 importance bonus)" : ""}`,
  );
  lines.push("");

  // Risk analysis
  lines.push("### Risk Analysis");
  if (scores.riskScore > 70) {
    lines.push(
      "🔴 **High Risk**: Delaying this task significantly increases the chance of missing the deadline.",
    );
  } else if (scores.riskScore > 40) {
    lines.push(
      "🟠 **Moderate Risk**: Some buffer time exists, but delays should be avoided.",
    );
  } else {
    lines.push(
      "🟢 **Low Risk**: Adequate buffer time available for this task.",
    );
  }
  lines.push("");

  // Recommendation
  lines.push("### Scheduling Recommendation");
  if (scores.finalScore >= 70) {
    lines.push(
      "📌 **Schedule immediately** - This task should be prioritized and scheduled in the next available slot.",
    );
  } else if (scores.finalScore >= 40) {
    lines.push(
      "📋 **Schedule today** - This task should be scheduled within your working hours today.",
    );
  } else {
    lines.push(
      "📅 **Flexible scheduling** - This task can be scheduled when convenient, but don't forget about it.",
    );
  }

  return lines.join("\n");
}

module.exports = {
  getSchedule,
  regenerateSchedule,
  getScheduleRange,
  getTaskExplanation,
};
