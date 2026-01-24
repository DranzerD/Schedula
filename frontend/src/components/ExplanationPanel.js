/**
 * ExplanationPanel Component
 * Displays AI-generated explanation for task scheduling
 */

import React, { useState, useEffect } from "react";
import { scheduleAPI } from "../services/api";
import { format, formatDistanceToNow } from "date-fns";

const ExplanationPanel = ({ task, onClose }) => {
  const [explanation, setExplanation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchExplanation = async () => {
      if (!task?._id) return;

      try {
        setLoading(true);
        setError(null);
        const response = await scheduleAPI.getExplanation(task._id);
        setExplanation(response.data.data);
      } catch (err) {
        console.error("Failed to fetch explanation:", err);
        setError("Failed to load explanation");
      } finally {
        setLoading(false);
      }
    };

    fetchExplanation();
  }, [task?._id]);

  // Get score color
  const getScoreColor = (score) => {
    if (score >= 70) return "text-red-600";
    if (score >= 40) return "text-yellow-600";
    return "text-green-600";
  };

  // Get score background
  const getScoreBackground = (score) => {
    if (score >= 70) return "bg-red-500";
    if (score >= 40) return "bg-yellow-500";
    return "bg-green-500";
  };

  // Get score label
  const getScoreLabel = (score) => {
    if (score >= 70) return "High Priority";
    if (score >= 40) return "Medium Priority";
    return "Low Priority";
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center space-x-3">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600"></div>
          <span className="text-gray-600">Loading explanation...</span>
        </div>
      </div>
    );
  }

  if (error || !explanation) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="text-center">
          <p className="text-red-600">{error || "No explanation available"}</p>
        </div>
      </div>
    );
  }

  const { scores } = explanation;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-xl">🤖</span>
            <h3 className="font-semibold">AI Scheduling Explanation</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/20 rounded-lg transition-colors"
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
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
        <p className="text-white/80 text-sm mt-1">{task.title}</p>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Overall Score */}
        <div className="text-center p-4 bg-gray-50 rounded-xl">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white shadow-lg mb-2">
            <span
              className={`text-3xl font-bold ${getScoreColor(scores.finalScore)}`}
            >
              {scores.finalScore}
            </span>
          </div>
          <p className="font-medium text-gray-900">Scheduling Score</p>
          <p className={`text-sm ${getScoreColor(scores.finalScore)}`}>
            {getScoreLabel(scores.finalScore)}
          </p>
        </div>

        {/* Score Breakdown */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
            Score Breakdown
          </h4>

          {/* Urgency */}
          <ScoreBar
            label="Urgency"
            icon="⏱️"
            score={scores.urgencyScore}
            weight="40%"
            description="Based on time remaining until deadline"
          />

          {/* Importance */}
          <ScoreBar
            label="Importance"
            icon="⭐"
            score={scores.importanceScore}
            weight="35%"
            description="Based on priority and flexibility"
          />

          {/* Risk */}
          <ScoreBar
            label="Risk"
            icon="⚠️"
            score={scores.riskScore}
            weight="25%"
            description="Likelihood of missing deadline if delayed"
          />
        </div>

        {/* Task Details */}
        <div className="space-y-2 pt-4 border-t border-gray-100">
          <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
            Task Details
          </h4>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-gray-500">Priority</p>
              <p className="font-medium capitalize">{task.priority}</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-gray-500">Energy</p>
              <p className="font-medium capitalize">
                {task.energyLevel?.replace("-", " ")}
              </p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-gray-500">Duration</p>
              <p className="font-medium">{task.estimatedDuration} minutes</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-gray-500">Flexibility</p>
              <p className="font-medium capitalize">{task.flexibility}</p>
            </div>
          </div>

          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-gray-500 text-sm">Deadline</p>
            <p className="font-medium">
              {format(new Date(task.deadline), "PPP p")}
            </p>
            <p className="text-sm text-gray-500">
              (
              {formatDistanceToNow(new Date(task.deadline), {
                addSuffix: true,
              })}
              )
            </p>
          </div>
        </div>

        {/* Recommendation */}
        <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100">
          <h4 className="font-medium text-indigo-900 mb-2 flex items-center space-x-2">
            <span>💡</span>
            <span>Scheduling Recommendation</span>
          </h4>
          <p className="text-sm text-indigo-800">
            {scores.finalScore >= 70 &&
              "This task should be prioritized and scheduled immediately in the next available slot."}
            {scores.finalScore >= 40 &&
              scores.finalScore < 70 &&
              "This task should be scheduled within your working hours today to ensure timely completion."}
            {scores.finalScore < 40 &&
              "This task has flexible scheduling and can be placed when convenient. Don't forget about it!"}
          </p>
        </div>
      </div>
    </div>
  );
};

// Score Bar Sub-component
const ScoreBar = ({ label, icon, score, weight, description }) => {
  const getBarColor = (score) => {
    if (score >= 70) return "bg-red-500";
    if (score >= 40) return "bg-yellow-500";
    return "bg-green-500";
  };

  return (
    <div className="p-3 bg-gray-50 rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <span>{icon}</span>
          <span className="font-medium text-gray-900">{label}</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-xs text-gray-500">(weight: {weight})</span>
          <span className="font-bold text-gray-900">{score}</span>
        </div>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`h-full rounded-full transition-all ${getBarColor(score)}`}
          style={{ width: `${score}%` }}
        ></div>
      </div>
      <p className="text-xs text-gray-500 mt-1">{description}</p>
    </div>
  );
};

export default ExplanationPanel;
