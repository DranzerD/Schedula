/**
 * TaskList Component
 * Displays list of pending tasks with quick actions
 */

import React from "react";
import { format, formatDistanceToNow, isPast } from "date-fns";

const TaskList = ({
  tasks,
  selectedTask,
  onSelectTask,
  onEditTask,
  onDeleteTask,
  onCompleteTask,
}) => {
  // Get priority badge styles
  const getPriorityBadge = (priority) => {
    const styles = {
      high: "bg-red-100 text-red-700",
      medium: "bg-yellow-100 text-yellow-700",
      low: "bg-green-100 text-green-700",
    };
    const labels = { high: "🔥 High", medium: "⚡ Medium", low: "🌱 Low" };

    return (
      <span className={`px-2 py-0.5 text-xs rounded-full ${styles[priority]}`}>
        {labels[priority]}
      </span>
    );
  };

  // Get deadline status
  const getDeadlineStatus = (deadline) => {
    const deadlineDate = new Date(deadline);
    const isOverdue = isPast(deadlineDate);
    const timeLeft = formatDistanceToNow(deadlineDate, { addSuffix: true });

    if (isOverdue) {
      return {
        label: `Overdue ${timeLeft}`,
        className: "text-red-600",
      };
    }

    const hoursLeft = (deadlineDate - new Date()) / (1000 * 60 * 60);
    if (hoursLeft <= 24) {
      return {
        label: `Due ${timeLeft}`,
        className: "text-orange-600",
      };
    }

    return {
      label: `Due ${timeLeft}`,
      className: "text-gray-500",
    };
  };

  // Handle complete with duration prompt
  const handleComplete = (task) => {
    const actualDuration = window.prompt(
      `How long did "${task.title}" actually take? (in minutes)`,
      task.estimatedDuration.toString(),
    );

    if (actualDuration !== null) {
      const duration = parseInt(actualDuration);
      if (!isNaN(duration) && duration > 0) {
        onCompleteTask(task._id, duration);
      } else {
        onCompleteTask(task._id, task.estimatedDuration);
      }
    }
  };

  if (tasks.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">📋</span>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-1">
          No pending tasks
        </h3>
        <p className="text-gray-500 text-sm">
          Create a new task to get started with scheduling
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-4 border-b border-gray-100">
        <h3 className="font-semibold text-gray-900">Pending Tasks</h3>
        <p className="text-sm text-gray-500">{tasks.length} task(s)</p>
      </div>

      <div className="divide-y divide-gray-100 max-h-[400px] overflow-y-auto">
        {tasks.map((task) => {
          const deadlineStatus = getDeadlineStatus(task.deadline);
          const isSelected = selectedTask?._id === task._id;

          return (
            <div
              key={task._id}
              onClick={() => onSelectTask(task)}
              className={`p-4 cursor-pointer transition-colors ${
                isSelected
                  ? "bg-indigo-50 border-l-4 border-l-indigo-500"
                  : "hover:bg-gray-50 border-l-4 border-l-transparent"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <h4 className="font-medium text-gray-900 truncate">
                      {task.title}
                    </h4>
                    {task.energyLevel === "deep-focus" && (
                      <span
                        className="flex-shrink-0 w-5 h-5 text-center"
                        title="Deep Focus"
                      >
                        🧠
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    {getPriorityBadge(task.priority)}
                    <span className="text-gray-400">•</span>
                    <span className="text-gray-500">
                      {task.estimatedDuration} min
                    </span>
                    <span className="text-gray-400">•</span>
                    <span className={deadlineStatus.className}>
                      {deadlineStatus.label}
                    </span>
                  </div>

                  {/* Score Bar */}
                  {task.scheduling?.finalScore !== undefined && (
                    <div className="mt-2 flex items-center space-x-2">
                      <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                        <div
                          className={`h-full rounded-full ${
                            task.scheduling.finalScore >= 70
                              ? "bg-red-500"
                              : task.scheduling.finalScore >= 40
                                ? "bg-yellow-500"
                                : "bg-green-500"
                          }`}
                          style={{ width: `${task.scheduling.finalScore}%` }}
                        ></div>
                      </div>
                      <span className="text-xs text-gray-500">
                        Score: {task.scheduling.finalScore}
                      </span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-1 ml-4">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleComplete(task);
                    }}
                    className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                    title="Mark complete"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditTask(task);
                    }}
                    className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                    title="Edit task"
                  >
                    <svg
                      className="w-5 h-5"
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
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteTask(task._id);
                    }}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete task"
                  >
                    <svg
                      className="w-5 h-5"
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
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TaskList;
