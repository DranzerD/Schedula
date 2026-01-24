/**
 * Calendar Component
 * Displays daily schedule timeline with tasks
 */

import React from "react";
import { format, addDays, subDays, isToday } from "date-fns";

const Calendar = ({
  schedule,
  selectedDate,
  onDateChange,
  onTaskClick,
  onRegenerateSchedule,
}) => {
  // Generate time slots for the day
  const generateTimeSlots = () => {
    const slots = [];
    const startHour = schedule?.workingHours?.start
      ? parseInt(schedule.workingHours.start.split(":")[0])
      : 9;
    const endHour = schedule?.workingHours?.end
      ? parseInt(schedule.workingHours.end.split(":")[0])
      : 17;

    for (let hour = startHour; hour <= endHour; hour++) {
      slots.push({
        hour,
        label: format(new Date().setHours(hour, 0), "h:mm a"),
      });
    }
    return slots;
  };

  const timeSlots = generateTimeSlots();

  // Get tasks for a specific hour
  const getTasksForHour = (hour) => {
    if (!schedule?.slots) return [];

    return schedule.slots.filter((slot) => {
      const startHour = new Date(slot.scheduledStart).getHours();
      return startHour === hour;
    });
  };

  // Calculate task position and height
  const getTaskStyle = (slot) => {
    const start = new Date(slot.scheduledStart);
    const startMinutes = start.getMinutes();
    const top = (startMinutes / 60) * 100;
    const height = Math.min((slot.durationMinutes / 60) * 100, 200);

    return {
      top: `${top}%`,
      height: `${Math.max(height, 30)}%`,
      minHeight: "60px",
    };
  };

  // Get priority color
  const getPriorityColor = (priority) => {
    const colors = {
      high: "bg-red-100 border-red-300 text-red-800",
      medium: "bg-yellow-100 border-yellow-300 text-yellow-800",
      low: "bg-green-100 border-green-300 text-green-800",
    };
    return colors[priority] || colors.medium;
  };

  // Get energy badge
  const getEnergyBadge = (energyLevel) => {
    return energyLevel === "deep-focus" ? (
      <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full">
        🧠 Deep Focus
      </span>
    ) : null;
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => onDateChange(subDays(selectedDate, 1))}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg
                className="w-5 h-5 text-gray-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>

            <div className="text-center">
              <h2 className="text-lg font-semibold text-gray-900">
                {format(selectedDate, "EEEE, MMMM d, yyyy")}
              </h2>
              {isToday(selectedDate) && (
                <span className="text-xs text-indigo-600 font-medium">
                  Today
                </span>
              )}
            </div>

            <button
              onClick={() => onDateChange(addDays(selectedDate, 1))}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg
                className="w-5 h-5 text-gray-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => onDateChange(new Date())}
              className="px-3 py-1.5 text-sm text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
            >
              Today
            </button>
            <button
              onClick={onRegenerateSchedule}
              className="px-3 py-1.5 text-sm bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors flex items-center space-x-1"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              <span>Regenerate</span>
            </button>
          </div>
        </div>

        {/* Stats Row */}
        {schedule && (
          <div className="flex items-center space-x-6 mt-4 text-sm">
            <div className="flex items-center space-x-2">
              <span className="text-gray-500">Working Hours:</span>
              <span className="font-medium text-gray-900">
                {schedule.workingHours?.start} - {schedule.workingHours?.end}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-gray-500">Scheduled:</span>
              <span className="font-medium text-gray-900">
                {schedule.stats?.scheduledTasks || 0} tasks
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-gray-500">Utilization:</span>
              <span className="font-medium text-gray-900">
                {schedule.stats?.utilizationPercent || 0}%
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Timeline */}
      <div className="p-4 max-h-[600px] overflow-y-auto">
        {timeSlots.length > 0 ? (
          <div className="relative">
            {timeSlots.map((slot) => {
              const tasksInSlot = getTasksForHour(slot.hour);

              return (
                <div
                  key={slot.hour}
                  className="flex border-t border-gray-100 min-h-[80px] relative"
                >
                  {/* Time Label */}
                  <div className="w-20 flex-shrink-0 py-2 pr-4 text-right">
                    <span className="text-sm text-gray-500">{slot.label}</span>
                  </div>

                  {/* Tasks Container */}
                  <div className="flex-1 relative border-l border-gray-100 pl-4 py-2">
                    {tasksInSlot.length > 0 ? (
                      tasksInSlot.map((taskSlot) => (
                        <div
                          key={taskSlot.taskId}
                          onClick={() => onTaskClick(taskSlot.task)}
                          className={`absolute left-4 right-4 p-3 rounded-lg border-l-4 cursor-pointer 
                            hover:shadow-md transition-shadow ${getPriorityColor(taskSlot.task.priority)}`}
                          style={getTaskStyle(taskSlot)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-sm truncate">
                                {taskSlot.task.title}
                              </h4>
                              <p className="text-xs opacity-75 mt-0.5">
                                {format(
                                  new Date(taskSlot.scheduledStart),
                                  "h:mm a",
                                )}{" "}
                                -{" "}
                                {format(
                                  new Date(taskSlot.scheduledEnd),
                                  "h:mm a",
                                )}{" "}
                                ({taskSlot.durationMinutes} min)
                              </p>
                            </div>
                            <div className="ml-2">
                              {getEnergyBadge(taskSlot.task.energyLevel)}
                            </div>
                          </div>

                          {/* Score indicator */}
                          <div className="mt-2 flex items-center space-x-2">
                            <div className="flex-1 bg-white/50 rounded-full h-1.5">
                              <div
                                className="h-full bg-current rounded-full"
                                style={{
                                  width: `${taskSlot.scores?.finalScore || 0}%`,
                                }}
                              ></div>
                            </div>
                            <span className="text-xs font-medium">
                              {taskSlot.scores?.finalScore || 0}
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="h-full flex items-center">
                        <span className="text-sm text-gray-300">—</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <p>No schedule data available</p>
          </div>
        )}

        {/* Unscheduled Tasks Warning */}
        {schedule?.unscheduled?.length > 0 && (
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h4 className="font-medium text-yellow-800 mb-2">
              ⚠️ {schedule.unscheduled.length} task(s) could not be scheduled
            </h4>
            <ul className="text-sm text-yellow-700 space-y-1">
              {schedule.unscheduled.map((item, index) => (
                <li key={index}>
                  • {item.task.title}: {item.reason}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default Calendar;
