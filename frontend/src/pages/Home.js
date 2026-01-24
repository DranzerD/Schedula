/**
 * Home Page - Main Dashboard
 * Modern, beautiful dashboard with glassmorphism design
 */

import React, { useState, useEffect, useCallback } from "react";
import { tasksAPI, scheduleAPI, userAPI } from "../services/api";
import TaskForm from "../components/TaskForm";
import TaskList from "../components/TaskList";
import Calendar from "../components/Calendar";
import ExplanationPanel from "../components/ExplanationPanel";

const Home = () => {
  const [schedule, setSchedule] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [stats, setStats] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTask, setSelectedTask] = useState(null);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const dateStr = selectedDate.toISOString().split("T")[0];

      const [tasksRes, scheduleRes, statsRes] = await Promise.all([
        tasksAPI.getAll({
          completed: "false",
          sortBy: "deadline",
          order: "asc",
        }),
        scheduleAPI.getDaily(dateStr),
        userAPI.getStats(),
      ]);

      setTasks(tasksRes.data.data.tasks);
      setSchedule(scheduleRes.data.data.schedule);
      setStats(statsRes.data.data.stats);
    } catch (err) {
      console.error("Failed to fetch data:", err);
      setError("Failed to load data. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle task creation
  const handleCreateTask = async (taskData) => {
    try {
      await tasksAPI.create(taskData);
      setShowTaskForm(false);
      fetchData();
    } catch (err) {
      console.error("Failed to create task:", err);
      throw err;
    }
  };

  // Handle task update
  const handleUpdateTask = async (taskId, taskData) => {
    try {
      await tasksAPI.update(taskId, taskData);
      setEditingTask(null);
      fetchData();
    } catch (err) {
      console.error("Failed to update task:", err);
      throw err;
    }
  };

  // Handle task deletion
  const handleDeleteTask = async (taskId) => {
    if (!window.confirm("Are you sure you want to delete this task?")) return;

    try {
      await tasksAPI.delete(taskId);
      if (selectedTask?._id === taskId) {
        setSelectedTask(null);
      }
      fetchData();
    } catch (err) {
      console.error("Failed to delete task:", err);
    }
  };

  // Handle task completion
  const handleCompleteTask = async (taskId, actualDuration) => {
    try {
      await tasksAPI.complete(taskId, { actualDuration });
      fetchData();
    } catch (err) {
      console.error("Failed to complete task:", err);
    }
  };

  // Handle task selection for explanation
  const handleSelectTask = (task) => {
    setSelectedTask(selectedTask?._id === task._id ? null : task);
  };

  // Regenerate schedule
  const handleRegenerateSchedule = async () => {
    try {
      const dateStr = selectedDate.toISOString().split("T")[0];
      await scheduleAPI.regenerate({ date: dateStr });
      fetchData();
    } catch (err) {
      console.error("Failed to regenerate schedule:", err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-indigo-50/30">
        <div className="text-center animate-fade-in">
          <div className="relative">
            <div className="w-20 h-20 bg-gradient-to-br from-violet-600 via-indigo-600 to-purple-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-indigo-500/30 mx-auto mb-6">
              <span className="text-3xl animate-bounce-soft">📅</span>
            </div>
            <div className="absolute inset-0 bg-gradient-to-br from-violet-600/20 to-purple-600/20 rounded-3xl blur-xl animate-pulse"></div>
          </div>
          <p className="text-gray-600 font-medium text-lg">
            Loading your schedule...
          </p>
          <div className="mt-4 flex items-center justify-center gap-2">
            <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce animation-delay-100"></div>
            <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce animation-delay-200"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-indigo-50/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8 animate-fade-in">
          <h1 className="text-3xl font-bold text-gray-900">
            Good{" "}
            {new Date().getHours() < 12
              ? "Morning"
              : new Date().getHours() < 18
                ? "Afternoon"
                : "Evening"}
            ! 👋
          </h1>
          <p className="text-gray-500 mt-1">
            Here's what's on your schedule today
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-5 bg-red-50/80 backdrop-blur-sm border-2 border-red-200 rounded-2xl flex items-center justify-between animate-scale-in">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
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
              <p className="text-red-700 font-medium">{error}</p>
            </div>
            <button
              onClick={fetchData}
              className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 font-semibold rounded-xl transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard
              label="Due Today"
              value={stats.dueTodayTasks}
              icon="📅"
              color="indigo"
              delay={0}
            />
            <StatCard
              label="This Week"
              value={stats.dueThisWeekTasks}
              icon="📆"
              color="purple"
              delay={100}
            />
            <StatCard
              label="High Priority"
              value={stats.highPriorityPending}
              icon="🔥"
              color="red"
              delay={200}
            />
            <StatCard
              label="Overdue"
              value={stats.overdueTasks}
              icon="⚠️"
              color={stats.overdueTasks > 0 ? "red" : "green"}
              delay={300}
            />
          </div>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Calendar & Schedule */}
          <div className="lg:col-span-2 space-y-6 animate-fade-in animation-delay-200">
            <Calendar
              schedule={schedule}
              selectedDate={selectedDate}
              onDateChange={setSelectedDate}
              onTaskClick={handleSelectTask}
              onRegenerateSchedule={handleRegenerateSchedule}
            />
          </div>

          {/* Right Column - Tasks & Explanations */}
          <div className="space-y-6 animate-fade-in animation-delay-300">
            {/* Add Task Button */}
            <button
              onClick={() => setShowTaskForm(true)}
              className="group w-full py-4 px-6 bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 hover:from-violet-700 hover:via-indigo-700 hover:to-purple-700 text-white font-semibold rounded-2xl shadow-xl shadow-indigo-500/30 hover:shadow-2xl hover:shadow-indigo-500/40 transition-all duration-300 flex items-center justify-center gap-3 hover:-translate-y-0.5"
            >
              <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
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
                    d="M12 4v16m8-8H4"
                  />
                </svg>
              </div>
              <span>Add New Task</span>
            </button>

            {/* Task List */}
            <TaskList
              tasks={tasks}
              selectedTask={selectedTask}
              onSelectTask={handleSelectTask}
              onEditTask={setEditingTask}
              onDeleteTask={handleDeleteTask}
              onCompleteTask={handleCompleteTask}
            />

            {/* Explanation Panel */}
            {selectedTask && (
              <ExplanationPanel
                task={selectedTask}
                onClose={() => setSelectedTask(null)}
              />
            )}
          </div>
        </div>
      </div>

      {/* Task Form Modal */}
      {(showTaskForm || editingTask) && (
        <TaskForm
          task={editingTask}
          onSubmit={
            editingTask
              ? (data) => handleUpdateTask(editingTask._id, data)
              : handleCreateTask
          }
          onClose={() => {
            setShowTaskForm(false);
            setEditingTask(null);
          }}
        />
      )}
    </div>
  );
};

// Modern Stat Card Component
const StatCard = ({ label, value, icon, color, delay = 0 }) => {
  const colorClasses = {
    indigo: {
      bg: "from-indigo-500 to-indigo-600",
      light: "bg-indigo-100",
      text: "text-indigo-600",
      shadow: "shadow-indigo-500/20",
    },
    purple: {
      bg: "from-purple-500 to-purple-600",
      light: "bg-purple-100",
      text: "text-purple-600",
      shadow: "shadow-purple-500/20",
    },
    red: {
      bg: "from-red-500 to-rose-600",
      light: "bg-red-100",
      text: "text-red-600",
      shadow: "shadow-red-500/20",
    },
    green: {
      bg: "from-emerald-500 to-teal-600",
      light: "bg-emerald-100",
      text: "text-emerald-600",
      shadow: "shadow-emerald-500/20",
    },
    yellow: {
      bg: "from-amber-500 to-yellow-600",
      light: "bg-amber-100",
      text: "text-amber-600",
      shadow: "shadow-amber-500/20",
    },
  };

  const colors = colorClasses[color] || colorClasses.indigo;

  return (
    <div
      className={`stat-card group hover:shadow-xl hover:-translate-y-1 transition-all duration-300 animate-fade-in ${colors.shadow}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500 mb-1">{label}</p>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
        </div>
        <div
          className={`w-14 h-14 bg-gradient-to-br ${colors.bg} rounded-2xl flex items-center justify-center text-2xl shadow-lg ${colors.shadow} group-hover:scale-110 transition-transform duration-300`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
};

export default Home;
