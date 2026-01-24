/**
 * TaskForm Component
 * Modal form for creating and editing tasks
 */

import React, { useState, useEffect } from "react";
import { format, addDays } from "date-fns";

const TaskForm = ({ task, onSubmit, onClose }) => {
  const isEditing = !!task;

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    estimatedDuration: 30,
    deadline: format(addDays(new Date(), 1), "yyyy-MM-dd'T'HH:mm"),
    priority: "medium",
    flexibility: "movable",
    energyLevel: "low-focus",
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Populate form when editing
  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title || "",
        description: task.description || "",
        estimatedDuration: task.estimatedDuration || 30,
        deadline: task.deadline
          ? format(new Date(task.deadline), "yyyy-MM-dd'T'HH:mm")
          : format(addDays(new Date(), 1), "yyyy-MM-dd'T'HH:mm"),
        priority: task.priority || "medium",
        flexibility: task.flexibility || "movable",
        energyLevel: task.energyLevel || "low-focus",
      });
    }
  }, [task]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "estimatedDuration" ? parseInt(value) || 0 : value,
    }));
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Validate
    if (!formData.title.trim()) {
      setError("Title is required");
      return;
    }

    if (formData.estimatedDuration < 5 || formData.estimatedDuration > 480) {
      setError("Duration must be between 5 and 480 minutes");
      return;
    }

    const deadlineDate = new Date(formData.deadline);
    if (!isEditing && deadlineDate <= new Date()) {
      setError("Deadline must be in the future");
      return;
    }

    setIsLoading(true);

    try {
      await onSubmit({
        ...formData,
        deadline: new Date(formData.deadline).toISOString(),
      });
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save task");
    } finally {
      setIsLoading(false);
    }
  };

  // Duration presets
  const durationPresets = [
    { label: "15 min", value: 15 },
    { label: "30 min", value: 30 },
    { label: "45 min", value: 45 },
    { label: "1 hour", value: 60 },
    { label: "1.5 hrs", value: 90 },
    { label: "2 hours", value: 120 },
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      ></div>

      {/* Modal */}
      <div className="relative min-h-screen flex items-center justify-center p-4">
        <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-white px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              {isEditing ? "Edit Task" : "Create New Task"}
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg
                className="w-5 h-5 text-gray-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                {error}
              </div>
            )}

            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Task Title *
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="What needs to be done?"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Additional details..."
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
              />
            </div>

            {/* Duration */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Estimated Duration *
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {durationPresets.map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        estimatedDuration: preset.value,
                      }))
                    }
                    className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                      formData.estimatedDuration === preset.value
                        ? "bg-indigo-50 border-indigo-300 text-indigo-700"
                        : "border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  name="estimatedDuration"
                  value={formData.estimatedDuration}
                  onChange={handleChange}
                  min={5}
                  max={480}
                  className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
                <span className="text-gray-500">minutes</span>
              </div>
            </div>

            {/* Deadline */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Deadline *
              </label>
              <input
                type="datetime-local"
                name="deadline"
                value={formData.deadline}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            {/* Priority */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Priority
              </label>
              <div className="flex space-x-2">
                {["low", "medium", "high"].map((priority) => (
                  <button
                    key={priority}
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({ ...prev, priority }))
                    }
                    className={`flex-1 py-2 px-4 rounded-lg border text-sm font-medium transition-colors ${
                      formData.priority === priority
                        ? priority === "high"
                          ? "bg-red-50 border-red-300 text-red-700"
                          : priority === "medium"
                            ? "bg-yellow-50 border-yellow-300 text-yellow-700"
                            : "bg-green-50 border-green-300 text-green-700"
                        : "border-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {priority === "high"
                      ? "🔥 High"
                      : priority === "medium"
                        ? "⚡ Medium"
                        : "🌱 Low"}
                  </button>
                ))}
              </div>
            </div>

            {/* Flexibility */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Scheduling Flexibility
              </label>
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() =>
                    setFormData((prev) => ({ ...prev, flexibility: "movable" }))
                  }
                  className={`flex-1 py-2 px-4 rounded-lg border text-sm font-medium transition-colors ${
                    formData.flexibility === "movable"
                      ? "bg-indigo-50 border-indigo-300 text-indigo-700"
                      : "border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  🔄 Movable
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setFormData((prev) => ({ ...prev, flexibility: "fixed" }))
                  }
                  className={`flex-1 py-2 px-4 rounded-lg border text-sm font-medium transition-colors ${
                    formData.flexibility === "fixed"
                      ? "bg-indigo-50 border-indigo-300 text-indigo-700"
                      : "border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  📌 Fixed Time
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {formData.flexibility === "fixed"
                  ? "This task must be scheduled at a specific time"
                  : "This task can be scheduled flexibly based on availability"}
              </p>
            </div>

            {/* Energy Level */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Energy Requirement
              </label>
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      energyLevel: "low-focus",
                    }))
                  }
                  className={`flex-1 py-2 px-4 rounded-lg border text-sm font-medium transition-colors ${
                    formData.energyLevel === "low-focus"
                      ? "bg-green-50 border-green-300 text-green-700"
                      : "border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  ☀️ Low Focus
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      energyLevel: "deep-focus",
                    }))
                  }
                  className={`flex-1 py-2 px-4 rounded-lg border text-sm font-medium transition-colors ${
                    formData.energyLevel === "deep-focus"
                      ? "bg-purple-50 border-purple-300 text-purple-700"
                      : "border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  🧠 Deep Focus
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {formData.energyLevel === "deep-focus"
                  ? "Requires concentrated effort (limited by daily deep-focus capacity)"
                  : "Can be done with regular attention"}
              </p>
            </div>

            {/* Actions */}
            <div className="flex space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 px-4 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
              >
                {isLoading
                  ? "Saving..."
                  : isEditing
                    ? "Update Task"
                    : "Create Task"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default TaskForm;
