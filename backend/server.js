/**
 * Schedula Backend Server
 * Explainable AI-Powered Personal Scheduling System
 */

require("dotenv").config({ path: __dirname + "/.env" });
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");

// Import routes
const authRoutes = require("./routes/auth");
const taskRoutes = require("./routes/tasks");
const scheduleRoutes = require("./routes/schedule");
const userRoutes = require("./routes/user");

// Initialize express app
const app = express();

// Connect to MongoDB
connectDB();

// Middleware
app.use(
  cors({
    origin:
      process.env.NODE_ENV === "production"
        ? process.env.FRONTEND_URL
        : "http://localhost:3000",
    credentials: true,
  }),
);
app.use(express.json());

// Request logging in development
if (process.env.NODE_ENV === "development") {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/schedule", scheduleRoutes);
app.use("/api/user", userRoutes);

// Health check endpoint
app.get("/api/health", (req, res) => {
  const { getConnectionStatus } = require("./config/db");
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    service: "Schedula API",
    database: getConnectionStatus() ? "connected" : "disconnected",
  });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Endpoint not found",
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("Server Error:", err);

  res.status(err.status || 500).json({
    success: false,
    message:
      process.env.NODE_ENV === "production"
        ? "Internal server error"
        : err.message,
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`
  ╔═══════════════════════════════════════════════════════╗
  ║                                                       ║
  ║   🗓️  SCHEDULA API Server                             ║
  ║   Explainable AI-Powered Scheduling System            ║
  ║                                                       ║
  ║   🚀 Server running on port ${PORT}                      ║
  ║   📊 Environment: ${process.env.NODE_ENV || "development"}                       ║
  ║                                                       ║
  ╚═══════════════════════════════════════════════════════╝
  `);
});

module.exports = app;
