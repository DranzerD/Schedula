/**
 * Calendar Component
 * Modern timeline view with beautiful design
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

  // Get priority color (modern gradient style)
  const getPriorityClasses = (priority) => {
    const colors = {
      high: "bg-gradient-to-r from-red-50 to-rose-50 border-l-red-500 hover:from-red-100 hover:to-rose-100",
      medium:
        "bg-gradient-to-r from-amber-50 to-yellow-50 border-l-amber-500 hover:from-amber-100 hover:to-yellow-100",
      low: "bg-gradient-to-r from-emerald-50 to-teal-50 border-l-emerald-500 hover:from-emerald-100 hover:to-teal-100",
    };
    return colors[priority] || colors.medium;
  };

  // Get energy badge
  const getEnergyBadge = (energyLevel) => {
    return energyLevel === "deep-focus" ? (
      <span className="px-2.5 py-1 bg-purple-100 text-purple-700 text-xs font-bold rounded-lg">
        🧠 Deep Focus
      </span>
    ) : null;
  };

  return (
    <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100/80 overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-gray-50/50 to-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => onDateChange(subDays(selectedDate, 1))}
              className="p-3 hover:bg-white hover:shadow-md rounded-xl transition-all duration-200 group"
            >
              <svg
                className="w-5 h-5 text-gray-400 group-hover:text-gray-700 transition-colors"
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
              <h2 className="text-xl font-bold text-gray-900">
                {format(selectedDate, "EEEE, MMMM d, yyyy")}
              </h2>
              {isToday(selectedDate) && (
                <span className="inline-flex items-center gap-1 mt-1 px-3 py-0.5 bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-700 text-xs font-bold rounded-full">
                  <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse"></span>
                  Today
                </span>
              )}
            </div>

            <button
              onClick={() => onDateChange(addDays(selectedDate, 1))}
              className="p-3 hover:bg-white hover:shadow-md rounded-xl transition-all duration-200 group"
            >
              <svg
                className="w-5 h-5 text-gray-400 group-hover:text-gray-700 transition-colors"
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

          <div className="flex items-center gap-2">
            <button
              onClick={() => onDateChange(new Date())}
              className="px-4 py-2 text-sm font-semibold text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all duration-200"
            >
              Today
            </button>
            <button
              onClick={onRegenerateSchedule}
              className="px-4 py-2.5 text-sm font-semibold bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-600 hover:from-indigo-100 hover:to-purple-100 rounded-xl transition-all duration-200 flex items-center gap-2 border border-indigo-100"
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
          <div className="flex items-center gap-6 mt-5 pt-5 border-t border-gray-100">
            <div className="flex items-center gap-3 px-4 py-2.5 bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                <svg
                  className="w-4 h-4 text-indigo-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-xs text-gray-500">Working Hours</p>
                <p className="font-bold text-gray-900 text-sm">
                  {schedule.workingHours?.start} - {schedule.workingHours?.end}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 px-4 py-2.5 bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg
                  className="w-4 h-4 text-purple-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                  />
                </svg>
              </div>
              <div>
                <p className="text-xs text-gray-500">Scheduled</p>
                <p className="font-bold text-gray-900 text-sm">
                  {schedule.stats?.scheduledTasks || 0} tasks
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 px-4 py-2.5 bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                <svg
                  className="w-4 h-4 text-emerald-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-xs text-gray-500">Utilization</p>
                <p className="font-bold text-gray-900 text-sm">
                  {schedule.stats?.utilizationPercent || 0}%
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Timeline */}
      <div className="p-6 max-h-[600px] overflow-y-auto scrollbar-thin">
        {timeSlots.length > 0 ? (
          <div className="relative">
            {timeSlots.map((slot, index) => {
              const tasksInSlot = getTasksForHour(slot.hour);

              return (
                <div
                  key={slot.hour}
                  className={`flex min-h-[90px] relative ${index !== timeSlots.length - 1 ? "border-b border-gray-100" : ""}`}
                >
                  {/* Time Label */}
                  <div className="w-24 flex-shrink-0 py-4 pr-4">
                    <span className="text-sm font-semibold text-gray-400">
                      {slot.label}
                    </span>
                  </div>

                  {/* Tasks Container */}
                  <div className="flex-1 relative border-l-2 border-gray-100 pl-6 py-4">
                    {tasksInSlot.length > 0 ? (
                      tasksInSlot.map((taskSlot) => (
                        <div
                          key={taskSlot.taskId}
                          onClick={() => onTaskClick(taskSlot.task)}
                          className={`absolute left-6 right-4 p-4 rounded-2xl border-l-4 cursor-pointer 
                            shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 ${getPriorityClasses(taskSlot.task.priority)}`}
                          style={getTaskStyle(taskSlot)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-bold text-gray-900 truncate">
                                {taskSlot.task.title}
                              </h4>
                              <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                                <svg
                                  className="w-3.5 h-3.5"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                  />
                                </svg>
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
                            <div className="ml-3">
                              {getEnergyBadge(taskSlot.task.energyLevel)}
                            </div>
                          </div>

                          {/* Score indicator */}
                          <div className="mt-3 flex items-center gap-3">
                            <div className="flex-1 bg-gray-200/60 rounded-full h-2 overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
                                style={{
                                  width: `${taskSlot.scores?.finalScore || 0}%`,
                                }}
                              ></div>
                            </div>
                            <span className="text-xs font-bold text-gray-600 w-8">
                              {taskSlot.scores?.finalScore || 0}
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="h-full flex items-center">
                        <div className="w-full h-0.5 bg-gray-100 rounded-full"></div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
            <p className="text-gray-500 font-medium">
              No schedule data available
            </p>
            <p className="text-gray-400 text-sm mt-1">
              Add some tasks to see your schedule
            </p>
          </div>
        )}

        {/* Unscheduled Tasks Warning */}
        {schedule?.unscheduled?.length > 0 && (
          <div className="mt-6 p-5 bg-gradient-to-r from-amber-50 to-yellow-50 border-2 border-amber-200 rounded-2xl">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <span className="text-lg">⚠️</span>
              </div>
              <div>
                <h4 className="font-bold text-amber-800 mb-2">
                  {schedule.unscheduled.length} task(s) could not be scheduled
                </h4>
                <ul className="text-sm text-amber-700 space-y-1.5">
                  {schedule.unscheduled.map((item, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-amber-500">•</span>
                      <span>
                        <strong>{item.task.title}:</strong> {item.reason}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Calendar;
