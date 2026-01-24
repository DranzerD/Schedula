/**
 * User Model
 * Defines user schema with authentication and scheduling preferences
 */

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema({
  // Authentication fields
  name: {
    type: String,
    required: [true, "Name is required"],
    trim: true,
    maxlength: [50, "Name cannot exceed 50 characters"],
  },
  email: {
    type: String,
    required: [true, "Email is required"],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, "Please provide a valid email"],
  },
  password: {
    type: String,
    required: [true, "Password is required"],
    minlength: [6, "Password must be at least 6 characters"],
    select: false, // Don't include password in queries by default
  },

  // Scheduling preferences
  workingHours: {
    start: {
      type: String, // Format: "HH:MM" in 24-hour format
      default: "09:00",
      validate: {
        validator: function (v) {
          return /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
        },
        message: "Start time must be in HH:MM format",
      },
    },
    end: {
      type: String, // Format: "HH:MM" in 24-hour format
      default: "17:00",
      validate: {
        validator: function (v) {
          return /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
        },
        message: "End time must be in HH:MM format",
      },
    },
  },

  // Maximum deep-focus hours per day (in minutes for precision)
  maxDeepFocusMinutes: {
    type: Number,
    default: 240, // 4 hours default
    min: [30, "Minimum deep focus time is 30 minutes"],
    max: [720, "Maximum deep focus time is 12 hours"],
  },

  // Buffer time between tasks (in minutes)
  bufferMinutes: {
    type: Number,
    default: 15,
    min: [0, "Buffer cannot be negative"],
    max: [60, "Maximum buffer is 60 minutes"],
  },

  // Timezone for accurate scheduling
  timezone: {
    type: String,
    default: "UTC",
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },

  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Hash password before saving
userSchema.pre("save", async function (next) {
  this.updatedAt = Date.now();

  if (!this.isModified("password")) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare passwords
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Method to get working hours in minutes from midnight
userSchema.methods.getWorkingHoursInMinutes = function () {
  const [startHour, startMin] = this.workingHours.start.split(":").map(Number);
  const [endHour, endMin] = this.workingHours.end.split(":").map(Number);

  return {
    start: startHour * 60 + startMin,
    end: endHour * 60 + endMin,
    totalMinutes: endHour * 60 + endMin - (startHour * 60 + startMin),
  };
};

// Method to get safe user data (without password)
userSchema.methods.toSafeObject = function () {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    workingHours: this.workingHours,
    maxDeepFocusMinutes: this.maxDeepFocusMinutes,
    bufferMinutes: this.bufferMinutes,
    timezone: this.timezone,
    createdAt: this.createdAt,
  };
};

module.exports = mongoose.model("User", userSchema);
