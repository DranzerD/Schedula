import React from "react";
import { format } from "date-fns";

/**
 * TaskItem Component
 * Displays an individual task with its details and scheduling info
 */
const TaskItem = ({ task, onEdit, onDelete, onComplete, showExplanation }) => {
  const priorityColors = {
    high: "bg-red-100 text-red-800 border-red-200",
    medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
    low: "bg-green-100 text-green-800 border-green-200",
  };

  const energyIcons = {
    "deep-focus": "🧠",
    "low-focus": "☕",
  };

  const flexibilityIcons = {
    fixed: "📌",
    movable: "🔄",
  };

  const formatDuration = (minutes) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const isOverdue =
    task.deadline && new Date(task.deadline) < new Date() && !task.completed;
  const isDueSoon =
    task.deadline &&
    new Date(task.deadline) <= new Date(Date.now() + 24 * 60 * 60 * 1000) &&
    !task.completed;

  return (
    <div
      className={`p-4 rounded-xl border-2 transition-all duration-200 hover:shadow-md ${
        task.completed
          ? "bg-gray-50 border-gray-200 opacity-75"
          : isOverdue
            ? "bg-red-50 border-red-200"
            : "bg-white border-gray-100 hover:border-indigo-200"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        {/* Checkbox and Title */}
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <button
            onClick={() => onComplete && onComplete(task._id, !task.completed)}
            className={`mt-1 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
              task.completed
                ? "bg-indigo-600 border-indigo-600 text-white"
                : "border-gray-300 hover:border-indigo-400"
            }`}
          >
            {task.completed && (
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </button>

          <div className="flex-1 min-w-0">
            <h3
              className={`font-medium ${task.completed ? "line-through text-gray-500" : "text-gray-900"}`}
            >
              {task.title}
            </h3>

            {task.description && (
              <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                {task.description}
              </p>
            )}

            {/* Tags and metadata */}
            <div className="flex flex-wrap items-center gap-2 mt-2">
              {/* Priority badge */}
              <span
                className={`px-2 py-0.5 text-xs font-medium rounded-full border ${priorityColors[task.priority]}`}
              >
                {task.priority}
              </span>

              {/* Duration */}
              <span className="text-xs text-gray-500 flex items-center gap-1">
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
                {formatDuration(task.estimatedDuration)}
              </span>

              {/* Energy level */}
              <span className="text-xs" title={`Energy: ${task.energyLevel}`}>
                {energyIcons[task.energyLevel]}
              </span>

              {/* Flexibility */}
              <span
                className="text-xs"
                title={`Flexibility: ${task.flexibility}`}
              >
                {flexibilityIcons[task.flexibility]}
              </span>

              {/* Deadline */}
              {task.deadline && (
                <span
                  className={`text-xs flex items-center gap-1 ${
                    isOverdue
                      ? "text-red-600 font-medium"
                      : isDueSoon
                        ? "text-orange-600"
                        : "text-gray-500"
                  }`}
                >
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
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  {isOverdue
                    ? "Overdue"
                    : format(new Date(task.deadline), "MMM d")}
                </span>
              )}
            </div>

            {/* Scheduling explanation */}
            {task.scheduling?.explanation && showExplanation && (
              <div className="mt-3 p-2 bg-indigo-50 rounded-lg border border-indigo-100">
                <p className="text-xs text-indigo-700">
                  <span className="font-medium">AI Insight:</span>{" "}
                  {task.scheduling.explanation}
                </p>
                {task.scheduling.priorityScore && (
                  <div className="flex items-center gap-2 mt-1 text-xs text-indigo-600">
                    <span>
                      Score: {Math.round(task.scheduling.priorityScore)}
                    </span>
                    <span className="text-indigo-300">•</span>
                    <span>
                      U: {Math.round(task.scheduling.factors?.urgency || 0)}
                    </span>
                    <span>
                      I: {Math.round(task.scheduling.factors?.importance || 0)}
                    </span>
                    <span>
                      R: {Math.round(task.scheduling.factors?.risk || 0)}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          {onEdit && (
            <button
              onClick={() => onEdit(task)}
              className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
              title="Edit task"
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
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
            </button>
          )}

          {onDelete && (
            <button
              onClick={() => onDelete(task._id)}
              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Delete task"
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
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default TaskItem;
