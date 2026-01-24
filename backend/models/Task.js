/**
 * Task Model
 * Defines task schema with all scheduling-relevant properties
 */

const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema({
  // Reference to user who owns this task
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },

  // Task content
  title: {
    type: String,
    required: [true, "Task title is required"],
    trim: true,
    maxlength: [200, "Title cannot exceed 200 characters"],
  },

  description: {
    type: String,
    trim: true,
    maxlength: [1000, "Description cannot exceed 1000 characters"],
  },

  // Estimated duration in minutes
  estimatedDuration: {
    type: Number,
    required: [true, "Estimated duration is required"],
    min: [5, "Minimum task duration is 5 minutes"],
    max: [480, "Maximum task duration is 8 hours (480 minutes)"],
  },

  // Actual duration (filled after completion)
  actualDuration: {
    type: Number,
    default: null,
  },

  // Deadline - date and time by which task must be completed
  deadline: {
    type: Date,
    required: [true, "Deadline is required"],
    validate: {
      validator: function (v) {
        // Deadline must be in the future for new tasks
        if (this.isNew) {
          return v > new Date();
        }
        return true;
      },
      message: "Deadline must be in the future",
    },
  },

  // Priority level affects importance score
  priority: {
    type: String,
    enum: {
      values: ["low", "medium", "high"],
      message: "Priority must be low, medium, or high",
    },
    default: "medium",
  },

  // Flexibility determines if task time can be adjusted
  flexibility: {
    type: String,
    enum: {
      values: ["fixed", "movable"],
      message: "Flexibility must be fixed or movable",
    },
    default: "movable",
  },

  // Energy requirement affects scheduling based on deep-focus capacity
  energyLevel: {
    type: String,
    enum: {
      values: ["low-focus", "deep-focus"],
      message: "Energy level must be low-focus or deep-focus",
    },
    default: "low-focus",
  },

  // Completion status
  isCompleted: {
    type: Boolean,
    default: false,
  },

  completedAt: {
    type: Date,
    default: null,
  },

  // Scheduled time slot (set by scheduling engine)
  scheduledStart: {
    type: Date,
    default: null,
  },

  scheduledEnd: {
    type: Date,
    default: null,
  },

  // Scheduling metadata
  scheduling: {
    // Computed scores (stored for transparency)
    urgencyScore: {
      type: Number,
      default: 0,
    },
    importanceScore: {
      type: Number,
      default: 0,
    },
    riskScore: {
      type: Number,
      default: 0,
    },
    finalScore: {
      type: Number,
      default: 0,
    },
    // Human-readable explanation
    explanation: {
      type: String,
      default: "",
    },
    // When scores were last computed
    lastComputedAt: {
      type: Date,
      default: null,
    },
  },

  // Track rescheduling history
  rescheduleHistory: [
    {
      previousStart: Date,
      previousEnd: Date,
      newStart: Date,
      newEnd: Date,
      reason: String,
      timestamp: {
        type: Date,
        default: Date.now,
      },
    },
  ],

  createdAt: {
    type: Date,
    default: Date.now,
  },

  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Index for efficient queries
taskSchema.index({ user: 1, deadline: 1 });
taskSchema.index({ user: 1, scheduledStart: 1 });
taskSchema.index({ user: 1, isCompleted: 1 });

// Update timestamp on save
taskSchema.pre("save", function (next) {
  this.updatedAt = Date.now();

  // Set completedAt when marked complete
  if (this.isModified("isCompleted") && this.isCompleted && !this.completedAt) {
    this.completedAt = Date.now();
  }

  next();
});

// Virtual for time remaining until deadline (in minutes)
taskSchema.virtual("timeUntilDeadline").get(function () {
  const now = new Date();
  const deadline = new Date(this.deadline);
  return Math.max(0, Math.floor((deadline - now) / (1000 * 60)));
});

// Virtual for deadline urgency level
taskSchema.virtual("deadlineUrgency").get(function () {
  const hoursRemaining = this.timeUntilDeadline / 60;

  if (hoursRemaining <= 2) return "critical";
  if (hoursRemaining <= 24) return "urgent";
  if (hoursRemaining <= 72) return "moderate";
  return "relaxed";
});

// Method to check if task can still be completed before deadline
taskSchema.methods.canMeetDeadline = function () {
  return this.timeUntilDeadline >= this.estimatedDuration;
};

// Method to get priority weight for calculations
taskSchema.methods.getPriorityWeight = function () {
  const weights = { low: 1, medium: 2, high: 3 };
  return weights[this.priority] || 2;
};

// Method to get flexibility weight for calculations
taskSchema.methods.getFlexibilityWeight = function () {
  return this.flexibility === "fixed" ? 1.5 : 1;
};

// Ensure virtuals are included in JSON output
taskSchema.set("toJSON", { virtuals: true });
taskSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("Task", taskSchema);
