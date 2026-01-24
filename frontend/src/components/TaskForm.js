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
        className="fixed inset-0 bg-gray-900/60 backdrop-blur-md"
        onClick={onClose}
      ></div>

      {/* Modal */}
      <div className="relative min-h-screen flex items-center justify-center p-4">
        <div className="relative bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-scale-in">
          {/* Header */}
          <div className="sticky top-0 bg-white/90 backdrop-blur-xl px-6 py-5 border-b border-gray-100 flex items-center justify-between rounded-t-3xl">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {isEditing ? "Edit Task" : "Create New Task"}
              </h2>
              <p className="text-sm text-gray-500 mt-0.5">
                {isEditing
                  ? "Update your task details"
                  : "Add a new task to your schedule"}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2.5 hover:bg-gray-100 rounded-xl transition-colors group"
            >
              <svg
                className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors"
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
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {error && (
              <div className="p-4 bg-red-50/80 border-2 border-red-200 rounded-2xl flex items-center gap-3 animate-scale-in">
                <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <svg
                    className="w-5 h-5 text-red-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <p className="text-red-700 font-medium text-sm">{error}</p>
              </div>
            )}

            {/* Title */}
            <div>
              <label className="input-label">
                Task Title <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <svg
                    className="w-5 h-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                    />
                  </svg>
                </div>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="What needs to be done?"
                  className="input-modern pl-12"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="input-label">Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Additional details about this task..."
                rows={3}
                className="input-modern resize-none"
              />
            </div>

            {/* Duration */}
            <div>
              <label className="input-label">
                Estimated Duration <span className="text-red-500">*</span>
              </label>
              <div className="flex flex-wrap gap-2 mb-3">
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
                    className={`px-4 py-2 text-sm font-semibold rounded-xl border-2 transition-all duration-200 ${
                      formData.estimatedDuration === preset.value
                        ? "bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-300 text-indigo-700 shadow-sm"
                        : "border-gray-100 text-gray-600 hover:bg-gray-50 hover:border-gray-200"
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  name="estimatedDuration"
                  value={formData.estimatedDuration}
                  onChange={handleChange}
                  min={5}
                  max={480}
                  className="w-28 px-4 py-3 bg-gray-50/80 border-2 border-gray-100 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-400 focus:bg-white transition-all duration-300"
                />
                <span className="text-gray-500 font-medium">minutes</span>
              </div>
            </div>

            {/* Deadline */}
            <div>
              <label className="input-label">
                Deadline <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                name="deadline"
                value={formData.deadline}
                onChange={handleChange}
                className="input-modern"
              />
            </div>

            {/* Priority */}
            <div>
              <label className="input-label">Priority</label>
              <div className="flex gap-3">
                {["low", "medium", "high"].map((priority) => (
                  <button
                    key={priority}
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({ ...prev, priority }))
                    }
                    className={`flex-1 py-3 px-4 rounded-2xl border-2 text-sm font-bold transition-all duration-200 ${
                      formData.priority === priority
                        ? priority === "high"
                          ? "bg-gradient-to-br from-red-50 to-rose-50 border-red-300 text-red-700 shadow-sm"
                          : priority === "medium"
                            ? "bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-300 text-amber-700 shadow-sm"
                            : "bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-300 text-emerald-700 shadow-sm"
                        : "border-gray-100 text-gray-500 hover:bg-gray-50 hover:border-gray-200"
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
              <label className="input-label">Scheduling Flexibility</label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() =>
                    setFormData((prev) => ({ ...prev, flexibility: "movable" }))
                  }
                  className={`flex-1 py-3 px-4 rounded-2xl border-2 text-sm font-bold transition-all duration-200 ${
                    formData.flexibility === "movable"
                      ? "bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-300 text-indigo-700 shadow-sm"
                      : "border-gray-100 text-gray-500 hover:bg-gray-50 hover:border-gray-200"
                  }`}
                >
                  🔄 Movable
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setFormData((prev) => ({ ...prev, flexibility: "fixed" }))
                  }
                  className={`flex-1 py-3 px-4 rounded-2xl border-2 text-sm font-bold transition-all duration-200 ${
                    formData.flexibility === "fixed"
                      ? "bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-300 text-indigo-700 shadow-sm"
                      : "border-gray-100 text-gray-500 hover:bg-gray-50 hover:border-gray-200"
                  }`}
                >
                  📌 Fixed Time
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
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
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                {formData.flexibility === "fixed"
                  ? "This task must be scheduled at a specific time"
                  : "This task can be scheduled flexibly based on availability"}
              </p>
            </div>

            {/* Energy Level */}
            <div>
              <label className="input-label">Energy Requirement</label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      energyLevel: "low-focus",
                    }))
                  }
                  className={`flex-1 py-3 px-4 rounded-2xl border-2 text-sm font-bold transition-all duration-200 ${
                    formData.energyLevel === "low-focus"
                      ? "bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-300 text-emerald-700 shadow-sm"
                      : "border-gray-100 text-gray-500 hover:bg-gray-50 hover:border-gray-200"
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
                  className={`flex-1 py-3 px-4 rounded-2xl border-2 text-sm font-bold transition-all duration-200 ${
                    formData.energyLevel === "deep-focus"
                      ? "bg-gradient-to-br from-purple-50 to-violet-50 border-purple-300 text-purple-700 shadow-sm"
                      : "border-gray-100 text-gray-500 hover:bg-gray-50 hover:border-gray-200"
                  }`}
                >
                  🧠 Deep Focus
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
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
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                {formData.energyLevel === "deep-focus"
                  ? "Requires concentrated effort (limited by daily deep-focus capacity)"
                  : "Can be done with regular attention"}
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-4 px-6 border-2 border-gray-200 text-gray-700 font-semibold rounded-2xl hover:bg-gray-50 hover:border-gray-300 transition-all duration-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 btn-primary py-4"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg
                      className="animate-spin h-5 w-5 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Saving...
                  </span>
                ) : isEditing ? (
                  "Update Task"
                ) : (
                  "Create Task"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default TaskForm;
