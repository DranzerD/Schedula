/**
 * Settings Page
 * User preferences and scheduling settings
 */

import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { userAPI } from "../services/api";

const Settings = () => {
  const { user, updateUser } = useAuth();

  const [settings, setSettings] = useState({
    workingHours: {
      start: "09:00",
      end: "17:00",
    },
    maxDeepFocusMinutes: 240,
    bufferMinutes: 15,
    timezone: "UTC",
  });

  const [profile, setProfile] = useState({
    name: "",
    email: "",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  // Fetch current settings
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await userAPI.getSettings();
        setSettings(response.data.data.settings);
        setProfile({
          name: user?.name || "",
          email: user?.email || "",
        });
      } catch (err) {
        console.error("Failed to fetch settings:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, [user]);

  // Save settings
  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      setMessage({ type: "", text: "" });

      await userAPI.updateSettings(settings);

      setMessage({ type: "success", text: "Settings saved successfully!" });
    } catch (err) {
      setMessage({
        type: "error",
        text: err.response?.data?.message || "Failed to save settings",
      });
    } finally {
      setSaving(false);
    }
  };

  // Save profile
  const handleSaveProfile = async () => {
    try {
      setSaving(true);
      setMessage({ type: "", text: "" });

      const response = await userAPI.updateProfile(profile);
      updateUser(response.data.data.user);

      setMessage({ type: "success", text: "Profile updated successfully!" });
    } catch (err) {
      setMessage({
        type: "error",
        text: err.response?.data?.message || "Failed to update profile",
      });
    } finally {
      setSaving(false);
    }
  };

  // Convert minutes to hours for display
  const minutesToHours = (minutes) => (minutes / 60).toFixed(1);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600">
          Manage your profile and scheduling preferences
        </p>
      </div>

      {/* Message */}
      {message.text && (
        <div
          className={`mb-6 p-4 rounded-lg ${
            message.type === "success"
              ? "bg-green-50 border border-green-200 text-green-700"
              : "bg-red-50 border border-red-200 text-red-700"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="space-y-8">
        {/* Profile Section */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
              <span>👤</span>
              <span>Profile</span>
            </h2>
          </div>

          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name
              </label>
              <input
                type="text"
                value={profile.name}
                onChange={(e) =>
                  setProfile({ ...profile, name: e.target.value })
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={profile.email}
                onChange={(e) =>
                  setProfile({ ...profile, email: e.target.value })
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <button
              onClick={handleSaveProfile}
              disabled={saving}
              className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {saving ? "Saving..." : "Update Profile"}
            </button>
          </div>
        </section>

        {/* Working Hours Section */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
              <span>🕐</span>
              <span>Working Hours</span>
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Define your daily working hours for task scheduling
            </p>
          </div>

          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Time
                </label>
                <input
                  type="time"
                  value={settings.workingHours.start}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      workingHours: {
                        ...settings.workingHours,
                        start: e.target.value,
                      },
                    })
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Time
                </label>
                <input
                  type="time"
                  value={settings.workingHours.end}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      workingHours: {
                        ...settings.workingHours,
                        end: e.target.value,
                      },
                    })
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">
                📅 Your working day:{" "}
                <strong>{settings.workingHours.start}</strong> to{" "}
                <strong>{settings.workingHours.end}</strong>
              </p>
            </div>
          </div>
        </section>

        {/* Cognitive Settings Section */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
              <span>🧠</span>
              <span>Cognitive Constraints</span>
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Set your daily deep-focus capacity and task buffer times
            </p>
          </div>

          <div className="p-6 space-y-6">
            {/* Deep Focus Capacity */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Maximum Deep Focus Time Per Day
              </label>
              <div className="space-y-2">
                <input
                  type="range"
                  min={30}
                  max={480}
                  step={30}
                  value={settings.maxDeepFocusMinutes}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      maxDeepFocusMinutes: parseInt(e.target.value),
                    })
                  }
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>30 min</span>
                  <span className="font-medium text-indigo-600">
                    {minutesToHours(settings.maxDeepFocusMinutes)} hours
                  </span>
                  <span>8 hours</span>
                </div>
              </div>
              <p className="text-sm text-gray-500 mt-2">
                Deep-focus tasks will be limited to this total duration per day
              </p>
            </div>

            {/* Buffer Time */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Buffer Time Between Tasks
              </label>
              <div className="flex flex-wrap gap-2">
                {[0, 5, 10, 15, 30, 45, 60].map((mins) => (
                  <button
                    key={mins}
                    onClick={() =>
                      setSettings({ ...settings, bufferMinutes: mins })
                    }
                    className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                      settings.bufferMinutes === mins
                        ? "bg-indigo-50 border-indigo-300 text-indigo-700"
                        : "border-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {mins} min
                  </button>
                ))}
              </div>
              <p className="text-sm text-gray-500 mt-2">
                Time reserved between consecutive tasks for breaks and
                transitions
              </p>
            </div>
          </div>
        </section>

        {/* Timezone Section */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
              <span>🌍</span>
              <span>Timezone</span>
            </h2>
          </div>

          <div className="p-6">
            <select
              value={settings.timezone}
              onChange={(e) =>
                setSettings({ ...settings, timezone: e.target.value })
              }
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="UTC">UTC (Coordinated Universal Time)</option>
              <option value="America/New_York">
                Eastern Time (US & Canada)
              </option>
              <option value="America/Chicago">
                Central Time (US & Canada)
              </option>
              <option value="America/Denver">
                Mountain Time (US & Canada)
              </option>
              <option value="America/Los_Angeles">
                Pacific Time (US & Canada)
              </option>
              <option value="Europe/London">London (GMT)</option>
              <option value="Europe/Paris">Paris (CET)</option>
              <option value="Asia/Tokyo">Tokyo (JST)</option>
              <option value="Asia/Kolkata">India (IST)</option>
              <option value="Australia/Sydney">Sydney (AEST)</option>
            </select>
          </div>
        </section>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            onClick={handleSaveSettings}
            disabled={saving}
            className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save All Settings"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
