/**
 * Date Helper Utilities
 * Common date manipulation functions for scheduling
 */

import {
  format,
  formatDistanceToNow,
  isPast,
  isFuture,
  isToday,
  isTomorrow,
  addDays,
  startOfDay,
  endOfDay,
  differenceInMinutes,
  differenceInHours,
  differenceInDays,
} from "date-fns";

/**
 * Format a date for display
 */
export const formatDate = (date, formatStr = "PPP") => {
  return format(new Date(date), formatStr);
};

/**
 * Format a time for display
 */
export const formatTime = (date, formatStr = "h:mm a") => {
  return format(new Date(date), formatStr);
};

/**
 * Format date and time together
 */
export const formatDateTime = (date) => {
  return format(new Date(date), "PPP p");
};

/**
 * Get relative time string (e.g., "in 2 hours", "3 days ago")
 */
export const getRelativeTime = (date) => {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
};

/**
 * Check if a deadline is overdue
 */
export const isOverdue = (deadline) => {
  return isPast(new Date(deadline));
};

/**
 * Check if a deadline is approaching (within threshold hours)
 */
export const isApproaching = (deadline, thresholdHours = 24) => {
  const deadlineDate = new Date(deadline);
  const now = new Date();
  const hoursUntil = differenceInHours(deadlineDate, now);
  return hoursUntil > 0 && hoursUntil <= thresholdHours;
};

/**
 * Get a human-readable deadline status
 */
export const getDeadlineStatus = (deadline) => {
  const deadlineDate = new Date(deadline);

  if (isPast(deadlineDate)) {
    return {
      status: "overdue",
      label: "Overdue",
      color: "red",
    };
  }

  if (isToday(deadlineDate)) {
    return {
      status: "today",
      label: "Due today",
      color: "orange",
    };
  }

  if (isTomorrow(deadlineDate)) {
    return {
      status: "tomorrow",
      label: "Due tomorrow",
      color: "yellow",
    };
  }

  const daysUntil = differenceInDays(deadlineDate, new Date());

  if (daysUntil <= 3) {
    return {
      status: "soon",
      label: `Due in ${daysUntil} days`,
      color: "yellow",
    };
  }

  return {
    status: "normal",
    label: getRelativeTime(deadline),
    color: "green",
  };
};

/**
 * Get minutes remaining until a deadline
 */
export const getMinutesRemaining = (deadline) => {
  return Math.max(0, differenceInMinutes(new Date(deadline), new Date()));
};

/**
 * Parse time string (HH:MM) to minutes from midnight
 */
export const timeToMinutes = (timeStr) => {
  const [hours, minutes] = timeStr.split(":").map(Number);
  return hours * 60 + minutes;
};

/**
 * Convert minutes from midnight to time string (HH:MM)
 */
export const minutesToTime = (minutes) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
};

/**
 * Generate time slots for a day
 */
export const generateTimeSlots = (startTime, endTime, intervalMinutes = 60) => {
  const slots = [];
  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);

  for (let mins = startMinutes; mins < endMinutes; mins += intervalMinutes) {
    slots.push({
      time: minutesToTime(mins),
      minutes: mins,
    });
  }

  return slots;
};

/**
 * Get dates for a week starting from a date
 */
export const getWeekDates = (startDate = new Date()) => {
  const start = startOfDay(startDate);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
};

/**
 * Format duration in minutes to human-readable string
 */
export const formatDuration = (minutes) => {
  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (mins === 0) {
    return `${hours} hr${hours > 1 ? "s" : ""}`;
  }

  return `${hours}h ${mins}m`;
};

export default {
  formatDate,
  formatTime,
  formatDateTime,
  getRelativeTime,
  isOverdue,
  isApproaching,
  getDeadlineStatus,
  getMinutesRemaining,
  timeToMinutes,
  minutesToTime,
  generateTimeSlots,
  getWeekDates,
  formatDuration,
};
