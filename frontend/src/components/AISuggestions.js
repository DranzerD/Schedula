import React, { useState, useEffect } from "react";
import { scheduleAPI } from "../services/api";

/**
 * AISuggestions Component
 * Displays AI-powered scheduling suggestions and insights
 */
const AISuggestions = ({ tasks, onApplySuggestion }) => {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    if (tasks && tasks.length > 0) {
      generateSuggestions();
    }
  }, [tasks]);

  const generateSuggestions = async () => {
    setLoading(true);
    try {
      const response = await scheduleAPI.getSuggestions();
      setSuggestions(response.data.suggestions || []);
    } catch (error) {
      // Generate local suggestions as fallback
      const localSuggestions = generateLocalSuggestions(tasks);
      setSuggestions(localSuggestions);
    } finally {
      setLoading(false);
    }
  };

  const generateLocalSuggestions = (taskList) => {
    const suggestions = [];
    const now = new Date();

    // Check for overdue tasks
    const overdueTasks = taskList.filter(
      (t) => t.deadline && new Date(t.deadline) < now && !t.completed,
    );
    if (overdueTasks.length > 0) {
      suggestions.push({
        type: "warning",
        icon: "⚠️",
        title: "Overdue Tasks Detected",
        message: `You have ${overdueTasks.length} overdue task${overdueTasks.length > 1 ? "s" : ""}. Consider rescheduling or breaking them into smaller parts.`,
        action: "reschedule",
        priority: "high",
      });
    }

    // Check for high-priority tasks due soon
    const urgentTasks = taskList.filter(
      (t) =>
        t.priority === "high" &&
        t.deadline &&
        new Date(t.deadline) <= new Date(now.getTime() + 48 * 60 * 60 * 1000) &&
        !t.completed,
    );
    if (urgentTasks.length > 0) {
      suggestions.push({
        type: "alert",
        icon: "🔥",
        title: "Urgent Tasks Approaching",
        message: `${urgentTasks.length} high-priority task${urgentTasks.length > 1 ? "s" : ""} due within 48 hours. Focus on these first.`,
        action: "focus",
        priority: "high",
      });
    }

    // Check for deep-focus clustering opportunity
    const deepFocusTasks = taskList.filter(
      (t) => t.energyLevel === "deep-focus" && !t.completed,
    );
    if (deepFocusTasks.length >= 2) {
      suggestions.push({
        type: "tip",
        icon: "🧠",
        title: "Deep Focus Block",
        message: `You have ${deepFocusTasks.length} deep-focus tasks. Consider scheduling them during your morning peak hours for maximum productivity.`,
        action: "cluster",
        priority: "medium",
      });
    }

    // Check for task overload
    const incompleteTasks = taskList.filter((t) => !t.completed);
    const totalMinutes = incompleteTasks.reduce(
      (sum, t) => sum + (t.estimatedDuration || 0),
      0,
    );
    if (totalMinutes > 480) {
      // More than 8 hours of work
      suggestions.push({
        type: "insight",
        icon: "📊",
        title: "Workload Analysis",
        message: `Your current tasks total ${Math.round(totalMinutes / 60)} hours. Consider delegating or postponing low-priority items.`,
        action: "analyze",
        priority: "medium",
      });
    }

    // Fixed tasks reminder
    const fixedTasks = taskList.filter(
      (t) => t.flexibility === "fixed" && !t.completed,
    );
    if (fixedTasks.length > 0) {
      suggestions.push({
        type: "reminder",
        icon: "📌",
        title: "Fixed Commitments",
        message: `You have ${fixedTasks.length} fixed-time task${fixedTasks.length > 1 ? "s" : ""}. Other tasks will be scheduled around these.`,
        action: "view",
        priority: "low",
      });
    }

    return suggestions.slice(0, 4); // Limit to 4 suggestions
  };

  const suggestionStyles = {
    warning: "bg-amber-50 border-amber-200 text-amber-800",
    alert: "bg-red-50 border-red-200 text-red-800",
    tip: "bg-indigo-50 border-indigo-200 text-indigo-800",
    insight: "bg-purple-50 border-purple-200 text-purple-800",
    reminder: "bg-blue-50 border-blue-200 text-blue-800",
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 animate-pulse"></div>
          <div className="flex-1">
            <div className="h-4 bg-gray-200 rounded animate-pulse w-32 mb-2"></div>
            <div className="h-3 bg-gray-100 rounded animate-pulse w-48"></div>
          </div>
        </div>
      </div>
    );
  }

  if (suggestions.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center">
            <span className="text-white text-sm">✨</span>
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-gray-900">AI Insights</h3>
            <p className="text-xs text-gray-500">
              {suggestions.length} suggestion{suggestions.length > 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform ${expanded ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* Suggestions list */}
      {expanded && (
        <div className="border-t border-gray-100 divide-y divide-gray-100">
          {suggestions.map((suggestion, index) => (
            <div
              key={index}
              className={`p-4 ${suggestionStyles[suggestion.type]} border-l-4 animate-fade-in`}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex items-start gap-3">
                <span className="text-xl flex-shrink-0">{suggestion.icon}</span>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm">{suggestion.title}</h4>
                  <p className="text-xs mt-1 opacity-80">
                    {suggestion.message}
                  </p>

                  {onApplySuggestion && suggestion.action && (
                    <button
                      onClick={() => onApplySuggestion(suggestion)}
                      className="mt-2 text-xs font-medium underline opacity-70 hover:opacity-100 transition-opacity"
                    >
                      Apply suggestion →
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Refresh button */}
      {expanded && (
        <div className="p-3 border-t border-gray-100 bg-gray-50">
          <button
            onClick={generateSuggestions}
            className="w-full text-center text-xs text-gray-500 hover:text-indigo-600 transition-colors"
          >
            🔄 Refresh insights
          </button>
        </div>
      )}
    </div>
  );
};

export default AISuggestions;
