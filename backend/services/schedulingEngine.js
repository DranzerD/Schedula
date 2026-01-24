/**
 * Schedula - Scheduling Engine
 *
 * This is the core AI module that computes optimal task schedules
 * using explainable, deterministic algorithms.
 *
 * Key components:
 * 1. Score Calculator - Computes urgency, importance, and risk scores
 * 2. Schedule Generator - Creates optimal daily schedules
 * 3. Explanation Generator - Produces human-readable explanations
 * 4. Rescheduler - Handles dynamic schedule adjustments
 */

/**
 * Constants for score calculations
 */
const WEIGHTS = {
  urgency: 0.4, // How urgent based on deadline
  importance: 0.35, // How important based on priority/flexibility
  risk: 0.25, // Risk of missing deadline
};

const PRIORITY_VALUES = {
  low: 1,
  medium: 2,
  high: 3,
};

const ENERGY_VALUES = {
  "low-focus": 1,
  "deep-focus": 2,
};

/**
 * ========================================
 * SCORE CALCULATION FUNCTIONS
 * ========================================
 */

/**
 * Calculate urgency score based on time remaining and task duration
 * Score ranges from 0 to 100
 *
 * @param {Object} task - Task object
 * @returns {number} Urgency score (0-100)
 */
function calculateUrgencyScore(task) {
  const now = new Date();
  const deadline = new Date(task.deadline);
  const minutesRemaining = Math.max(0, (deadline - now) / (1000 * 60));
  const duration = task.estimatedDuration;

  // If already past deadline, maximum urgency
  if (minutesRemaining <= 0) {
    return 100;
  }

  // Ratio of task duration to remaining time
  const timeRatio = duration / minutesRemaining;

  // Base urgency: higher ratio = more urgent
  let urgency;

  if (timeRatio >= 1) {
    // Not enough time left - critical urgency
    urgency = 100;
  } else if (timeRatio >= 0.5) {
    // Tight deadline - high urgency (80-100)
    urgency = 80 + (timeRatio - 0.5) * 40;
  } else if (timeRatio >= 0.25) {
    // Moderate deadline - medium urgency (50-80)
    urgency = 50 + (timeRatio - 0.25) * 120;
  } else if (timeRatio >= 0.1) {
    // Comfortable deadline - low urgency (20-50)
    urgency = 20 + (timeRatio - 0.1) * 200;
  } else {
    // Relaxed deadline - minimal urgency (0-20)
    urgency = timeRatio * 200;
  }

  return Math.min(100, Math.max(0, Math.round(urgency)));
}

/**
 * Calculate importance score based on priority and flexibility
 * Score ranges from 0 to 100
 *
 * @param {Object} task - Task object
 * @returns {number} Importance score (0-100)
 */
function calculateImportanceScore(task) {
  const priorityValue = PRIORITY_VALUES[task.priority] || 2;
  const isFixed = task.flexibility === "fixed";

  // Base importance from priority (scaled to 0-60)
  const priorityScore = ((priorityValue - 1) / 2) * 60;

  // Fixed tasks get +30 importance
  const flexibilityBonus = isFixed ? 30 : 0;

  // Deep focus tasks get +10 importance (they need optimal time slots)
  const energyBonus = task.energyLevel === "deep-focus" ? 10 : 0;

  const importance = priorityScore + flexibilityBonus + energyBonus;

  return Math.min(100, Math.max(0, Math.round(importance)));
}

/**
 * Calculate risk score - probability of missing deadline if task is delayed
 * Score ranges from 0 to 100
 *
 * @param {Object} task - Task object
 * @param {Object} userSettings - User's working hours settings
 * @returns {number} Risk score (0-100)
 */
function calculateRiskScore(task, userSettings) {
  const now = new Date();
  const deadline = new Date(task.deadline);
  const minutesRemaining = Math.max(0, (deadline - now) / (1000 * 60));
  const duration = task.estimatedDuration;

  // If already past deadline or can't complete in time
  if (minutesRemaining <= 0 || minutesRemaining < duration) {
    return 100;
  }

  // Calculate available working minutes until deadline
  const availableWorkMinutes = calculateAvailableWorkMinutes(
    now,
    deadline,
    userSettings,
  );

  // If not enough working time available
  if (availableWorkMinutes < duration) {
    return 100;
  }

  // Calculate buffer ratio (how much slack time exists)
  const bufferRatio = (availableWorkMinutes - duration) / duration;

  let risk;

  if (bufferRatio < 0.5) {
    // Very little buffer - high risk (70-100)
    risk = 100 - bufferRatio * 60;
  } else if (bufferRatio < 1) {
    // Some buffer - medium risk (40-70)
    risk = 70 - (bufferRatio - 0.5) * 60;
  } else if (bufferRatio < 2) {
    // Good buffer - low risk (20-40)
    risk = 40 - (bufferRatio - 1) * 20;
  } else {
    // Plenty of buffer - minimal risk (0-20)
    risk = Math.max(0, 20 - (bufferRatio - 2) * 10);
  }

  // Add risk for fixed tasks (less flexibility to reschedule)
  if (task.flexibility === "fixed") {
    risk += 10;
  }

  return Math.min(100, Math.max(0, Math.round(risk)));
}

/**
 * Calculate available working minutes between two dates
 *
 * @param {Date} start - Start date
 * @param {Date} end - End date
 * @param {Object} userSettings - User settings with working hours
 * @returns {number} Available working minutes
 */
function calculateAvailableWorkMinutes(start, end, userSettings) {
  const workStart = parseTimeToMinutes(
    userSettings.workingHours?.start || "09:00",
  );
  const workEnd = parseTimeToMinutes(userSettings.workingHours?.end || "17:00");
  const dailyWorkMinutes = workEnd - workStart;

  let totalMinutes = 0;
  let current = new Date(start);
  const endDate = new Date(end);

  while (current < endDate) {
    const currentMinutes = current.getHours() * 60 + current.getMinutes();
    const dayEnd = new Date(current);
    dayEnd.setHours(23, 59, 59, 999);

    // If on the same day as end date
    if (current.toDateString() === endDate.toDateString()) {
      const endMinutes = Math.min(
        workEnd,
        endDate.getHours() * 60 + endDate.getMinutes(),
      );
      const startMinutes = Math.max(workStart, currentMinutes);
      totalMinutes += Math.max(0, endMinutes - startMinutes);
      break;
    }

    // Full working day calculation
    if (currentMinutes < workEnd) {
      const startMinutes = Math.max(workStart, currentMinutes);
      totalMinutes += workEnd - startMinutes;
    }

    // Move to next day
    current = new Date(current);
    current.setDate(current.getDate() + 1);
    current.setHours(0, 0, 0, 0);
  }

  return totalMinutes;
}

/**
 * Calculate final scheduling score combining all factors
 *
 * @param {Object} task - Task object
 * @param {Object} userSettings - User settings
 * @returns {Object} All scores and final score
 */
function calculateAllScores(task, userSettings) {
  const urgencyScore = calculateUrgencyScore(task);
  const importanceScore = calculateImportanceScore(task);
  const riskScore = calculateRiskScore(task, userSettings);

  const finalScore = Math.round(
    urgencyScore * WEIGHTS.urgency +
      importanceScore * WEIGHTS.importance +
      riskScore * WEIGHTS.risk,
  );

  return {
    urgencyScore,
    importanceScore,
    riskScore,
    finalScore: Math.min(100, Math.max(0, finalScore)),
  };
}

/**
 * ========================================
 * SCHEDULE GENERATION
 * ========================================
 */

/**
 * Generate a daily schedule for the user
 *
 * @param {Array} tasks - Array of task objects
 * @param {Object} user - User object with settings
 * @param {Date} date - Date to generate schedule for
 * @returns {Object} Generated schedule with explanations
 */
function generateDailySchedule(tasks, user, date = new Date()) {
  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);

  const scheduleDate = new Date(targetDate);

  // Get user settings
  const workStart = parseTimeToMinutes(user.workingHours?.start || "09:00");
  const workEnd = parseTimeToMinutes(user.workingHours?.end || "17:00");
  const maxDeepFocus = user.maxDeepFocusMinutes || 240;
  const bufferMinutes = user.bufferMinutes || 15;

  // Filter tasks for the day (not completed, deadline >= today)
  const pendingTasks = tasks.filter((task) => {
    if (task.isCompleted) return false;
    const deadline = new Date(task.deadline);
    return deadline >= targetDate;
  });

  // Calculate scores for all tasks
  const scoredTasks = pendingTasks.map((task) => ({
    ...(task.toObject ? task.toObject() : task),
    scores: calculateAllScores(task, user),
  }));

  // Separate fixed and movable tasks
  const fixedTasks = scoredTasks.filter((t) => t.flexibility === "fixed");
  const movableTasks = scoredTasks.filter((t) => t.flexibility === "movable");

  // Sort movable tasks by final score (highest first)
  movableTasks.sort((a, b) => b.scores.finalScore - a.scores.finalScore);

  // Initialize schedule
  const schedule = {
    date: targetDate.toISOString().split("T")[0],
    workingHours: {
      start: minutesToTime(workStart),
      end: minutesToTime(workEnd),
    },
    slots: [],
    unscheduled: [],
    stats: {
      totalTasks: pendingTasks.length,
      scheduledTasks: 0,
      totalScheduledMinutes: 0,
      deepFocusMinutes: 0,
      utilizationPercent: 0,
    },
  };

  // Track time slots and deep focus usage
  let currentTime = workStart;
  let deepFocusUsed = 0;
  const occupiedSlots = [];

  // First, place fixed tasks
  for (const task of fixedTasks) {
    if (task.scheduledStart) {
      const taskDate = new Date(task.scheduledStart);
      if (taskDate.toDateString() === scheduleDate.toDateString()) {
        const startMinutes = taskDate.getHours() * 60 + taskDate.getMinutes();
        const endMinutes = startMinutes + task.estimatedDuration;

        occupiedSlots.push({
          start: startMinutes,
          end: endMinutes,
          task: task,
        });
      }
    }
  }

  // Sort occupied slots by start time
  occupiedSlots.sort((a, b) => a.start - b.start);

  // Place movable tasks in available slots
  for (const task of movableTasks) {
    // Check deep focus capacity
    if (task.energyLevel === "deep-focus") {
      if (deepFocusUsed + task.estimatedDuration > maxDeepFocus) {
        schedule.unscheduled.push({
          task: task,
          reason: `Exceeds daily deep-focus capacity (${maxDeepFocus} minutes)`,
        });
        continue;
      }
    }

    // Find next available slot
    const slot = findAvailableSlot(
      currentTime,
      workEnd,
      task.estimatedDuration,
      bufferMinutes,
      occupiedSlots,
    );

    if (slot) {
      // Create scheduled time
      const scheduledStart = new Date(scheduleDate);
      scheduledStart.setHours(
        Math.floor(slot.start / 60),
        slot.start % 60,
        0,
        0,
      );

      const scheduledEnd = new Date(scheduleDate);
      scheduledEnd.setHours(Math.floor(slot.end / 60), slot.end % 60, 0, 0);

      // Generate explanation
      const explanation = generateExplanation(task, scheduledStart, user);

      // Add to schedule
      schedule.slots.push({
        taskId: task._id,
        task: {
          id: task._id,
          title: task.title,
          description: task.description,
          priority: task.priority,
          energyLevel: task.energyLevel,
          flexibility: task.flexibility,
          deadline: task.deadline,
          estimatedDuration: task.estimatedDuration,
        },
        scheduledStart: scheduledStart.toISOString(),
        scheduledEnd: scheduledEnd.toISOString(),
        durationMinutes: task.estimatedDuration,
        scores: task.scores,
        explanation: explanation,
      });

      // Update tracking
      occupiedSlots.push({ start: slot.start, end: slot.end, task });
      occupiedSlots.sort((a, b) => a.start - b.start);

      if (task.energyLevel === "deep-focus") {
        deepFocusUsed += task.estimatedDuration;
      }

      schedule.stats.scheduledTasks++;
      schedule.stats.totalScheduledMinutes += task.estimatedDuration;
    } else {
      schedule.unscheduled.push({
        task: task,
        reason: "No available time slot within working hours",
      });
    }
  }

  // Calculate stats
  const totalWorkMinutes = workEnd - workStart;
  schedule.stats.deepFocusMinutes = deepFocusUsed;
  schedule.stats.utilizationPercent = Math.round(
    (schedule.stats.totalScheduledMinutes / totalWorkMinutes) * 100,
  );

  // Sort slots by start time
  schedule.slots.sort(
    (a, b) => new Date(a.scheduledStart) - new Date(b.scheduledStart),
  );

  return schedule;
}

/**
 * Find an available time slot for a task
 *
 * @param {number} startFrom - Minimum start time in minutes
 * @param {number} workEnd - End of work day in minutes
 * @param {number} duration - Required duration in minutes
 * @param {number} buffer - Buffer time between tasks
 * @param {Array} occupiedSlots - Already occupied time slots
 * @returns {Object|null} Available slot or null
 */
function findAvailableSlot(
  startFrom,
  workEnd,
  duration,
  buffer,
  occupiedSlots,
) {
  let candidateStart = startFrom;

  while (candidateStart + duration <= workEnd) {
    const candidateEnd = candidateStart + duration;

    // Check for conflicts with occupied slots
    let conflict = false;
    for (const slot of occupiedSlots) {
      // Check if candidate overlaps with this slot (including buffer)
      const slotStartWithBuffer = slot.start - buffer;
      const slotEndWithBuffer = slot.end + buffer;

      if (
        candidateStart < slotEndWithBuffer &&
        candidateEnd > slotStartWithBuffer
      ) {
        // Conflict found, move candidate to after this slot
        candidateStart = slot.end + buffer;
        conflict = true;
        break;
      }
    }

    if (!conflict) {
      return { start: candidateStart, end: candidateEnd };
    }
  }

  return null;
}

/**
 * ========================================
 * EXPLANATION GENERATION
 * ========================================
 */

/**
 * Generate a human-readable explanation for why a task was scheduled
 *
 * @param {Object} task - Task with scores
 * @param {Date} scheduledTime - When the task is scheduled
 * @param {Object} user - User settings
 * @returns {string} Human-readable explanation
 */
function generateExplanation(task, scheduledTime, user) {
  const parts = [];
  const scores = task.scores;

  // Format time
  const timeStr = scheduledTime.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  const endTime = new Date(
    scheduledTime.getTime() + task.estimatedDuration * 60000,
  );
  const endTimeStr = endTime.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  parts.push(`Scheduled at ${timeStr}–${endTimeStr}`);

  // Build reason list
  const reasons = [];

  // Priority explanation
  if (task.priority === "high") {
    reasons.push("high priority");
  } else if (task.priority === "medium") {
    reasons.push("medium priority");
  }

  // Urgency explanation
  const deadline = new Date(task.deadline);
  const hoursUntilDeadline = Math.round(
    (deadline - new Date()) / (1000 * 60 * 60),
  );

  if (hoursUntilDeadline <= 24) {
    reasons.push(`deadline in ${hoursUntilDeadline} hours`);
  } else {
    const daysUntilDeadline = Math.round(hoursUntilDeadline / 24);
    reasons.push(
      `deadline in ${daysUntilDeadline} day${daysUntilDeadline > 1 ? "s" : ""}`,
    );
  }

  // Energy level explanation
  if (task.energyLevel === "deep-focus") {
    reasons.push("requires deep focus");
  }

  // Flexibility explanation
  if (task.flexibility === "fixed") {
    reasons.push("has fixed time constraint");
  } else if (scores.finalScore > 70) {
    reasons.push("limited scheduling flexibility");
  }

  // Risk explanation
  if (scores.riskScore > 70) {
    reasons.push("high risk of missing deadline if delayed");
  } else if (scores.riskScore > 40) {
    reasons.push("moderate deadline risk");
  }

  // Combine reasons
  if (reasons.length > 0) {
    parts.push(`because the task has ${reasons.join(", ")}.`);
  }

  // Add score summary
  parts.push(`\n\n📊 Scheduling Score: ${scores.finalScore}/100`);
  parts.push(`• Urgency: ${scores.urgencyScore}/100`);
  parts.push(`• Importance: ${scores.importanceScore}/100`);
  parts.push(`• Risk: ${scores.riskScore}/100`);

  return parts.join(" ");
}

/**
 * ========================================
 * RESCHEDULING
 * ========================================
 */

/**
 * Reschedule remaining tasks when a task is incomplete or takes longer
 *
 * @param {Array} tasks - All tasks
 * @param {Object} user - User settings
 * @param {Object} options - Rescheduling options
 * @returns {Object} New schedule with change explanations
 */
function reschedule(tasks, user, options = {}) {
  const { incompleteTaskId, actualDuration, date = new Date() } = options;

  // Get the current schedule
  const newSchedule = generateDailySchedule(tasks, user, date);

  // Track changes
  const changes = [];

  if (incompleteTaskId) {
    const incompleteTask = tasks.find(
      (t) => t._id?.toString() === incompleteTaskId?.toString(),
    );

    if (incompleteTask && actualDuration) {
      const overrun = actualDuration - incompleteTask.estimatedDuration;
      if (overrun > 0) {
        changes.push({
          type: "overrun",
          taskId: incompleteTaskId,
          taskTitle: incompleteTask.title,
          overrunMinutes: overrun,
          explanation: `Task "${incompleteTask.title}" took ${overrun} minutes longer than estimated, causing schedule adjustment.`,
        });
      }
    }
  }

  return {
    schedule: newSchedule,
    changes,
    summary:
      changes.length > 0
        ? `Schedule adjusted due to ${changes.length} change(s).`
        : "Schedule regenerated with current tasks.",
  };
}

/**
 * ========================================
 * UTILITY FUNCTIONS
 * ========================================
 */

/**
 * Parse time string to minutes from midnight
 * @param {string} timeStr - Time in HH:MM format
 * @returns {number} Minutes from midnight
 */
function parseTimeToMinutes(timeStr) {
  const [hours, minutes] = timeStr.split(":").map(Number);
  return hours * 60 + minutes;
}

/**
 * Convert minutes from midnight to time string
 * @param {number} minutes - Minutes from midnight
 * @returns {string} Time in HH:MM format
 */
function minutesToTime(minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
}

/**
 * ========================================
 * MODULE EXPORTS
 * ========================================
 */

module.exports = {
  // Score calculations
  calculateUrgencyScore,
  calculateImportanceScore,
  calculateRiskScore,
  calculateAllScores,

  // Schedule generation
  generateDailySchedule,
  findAvailableSlot,

  // Explanations
  generateExplanation,

  // Rescheduling
  reschedule,

  // Utilities
  parseTimeToMinutes,
  minutesToTime,
  calculateAvailableWorkMinutes,

  // Constants (for testing)
  WEIGHTS,
  PRIORITY_VALUES,
};
