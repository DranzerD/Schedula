/**
 * Home Page - Main Dashboard
 * Displays schedule, tasks, and AI explanations
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your schedule...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Error Alert */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
          <p className="text-red-600">{error}</p>
          <button
            onClick={fetchData}
            className="text-red-600 hover:text-red-700 font-medium"
          >
            Retry
          </button>
        </div>
      )}

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard
            label="Due Today"
            value={stats.dueTodayTasks}
            icon="📅"
            color="indigo"
          />
          <StatCard
            label="This Week"
            value={stats.dueThisWeekTasks}
            icon="📆"
            color="purple"
          />
          <StatCard
            label="High Priority"
            value={stats.highPriorityPending}
            icon="🔥"
            color="red"
          />
          <StatCard
            label="Overdue"
            value={stats.overdueTasks}
            icon="⚠️"
            color={stats.overdueTasks > 0 ? "red" : "green"}
          />
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Calendar & Schedule */}
        <div className="lg:col-span-2 space-y-6">
          {/* Calendar */}
          <Calendar
            schedule={schedule}
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
            onTaskClick={handleSelectTask}
            onRegenerateSchedule={handleRegenerateSchedule}
          />
        </div>

        {/* Right Column - Tasks & Explanations */}
        <div className="space-y-6">
          {/* Add Task Button */}
          <button
            onClick={() => setShowTaskForm(true)}
            className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center space-x-2"
          >
            <span className="text-lg">+</span>
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

// Stat Card Component
const StatCard = ({ label, value, icon, color }) => {
  const colorClasses = {
    indigo: "bg-indigo-50 text-indigo-600",
    purple: "bg-purple-50 text-purple-600",
    red: "bg-red-50 text-red-600",
    green: "bg-green-50 text-green-600",
    yellow: "bg-yellow-50 text-yellow-600",
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl ${colorClasses[color]}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
};

export default Home;
