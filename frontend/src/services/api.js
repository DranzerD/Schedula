/**
 * API Service
 * Centralized API client for all backend communication
 */

import axios from "axios";

// Create axios instance with base configuration
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "/api",
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor - add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Response interceptor - handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid - clear storage and redirect
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  },
);

// ========================================
// AUTH API
// ========================================

export const authAPI = {
  register: (data) => api.post("/auth/register", data),
  login: (data) => api.post("/auth/login", data),
  getMe: () => api.get("/auth/me"),
  updatePassword: (data) => api.put("/auth/password", data),
};

// ========================================
// TASKS API
// ========================================

export const tasksAPI = {
  getAll: (params) => api.get("/tasks", { params }),
  getOne: (id) => api.get(`/tasks/${id}`),
  getToday: () => api.get("/tasks/today"),
  create: (data) => api.post("/tasks", data),
  update: (id, data) => api.put(`/tasks/${id}`, data),
  delete: (id) => api.delete(`/tasks/${id}`),
  complete: (id, data) => api.post(`/tasks/${id}/complete`, data),
};

// ========================================
// SCHEDULE API
// ========================================

export const scheduleAPI = {
  getDaily: (date) => api.get("/schedule", { params: { date } }),
  regenerate: (data) => api.post("/schedule/regenerate", data),
  getRange: (startDate, endDate) =>
    api.get("/schedule/range", { params: { startDate, endDate } }),
  getExplanation: (taskId) => api.get(`/schedule/explain/${taskId}`),
};

// ========================================
// USER API
// ========================================

export const userAPI = {
  getSettings: () => api.get("/user/settings"),
  updateSettings: (data) => api.put("/user/settings", data),
  updateProfile: (data) => api.put("/user/profile", data),
  getStats: () => api.get("/user/stats"),
};

export default api;
