/**
 * Database Configuration
 * Handles MongoDB connection using Mongoose
 */

const mongoose = require("mongoose");

let isConnected = false;

const connectDB = async () => {
  try {
    // Check if MONGODB_URI is provided
    if (!process.env.MONGODB_URI) {
      console.warn(
        "⚠️ MONGODB_URI not set. Running in demo mode without database.",
      );
      console.warn("   Set MONGODB_URI in .env to enable full functionality.");
      return false;
    }

    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000, // Timeout after 5 seconds
    });

    isConnected = true;
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);

    // Handle connection events
    mongoose.connection.on("error", (err) => {
      console.error(`❌ MongoDB connection error: ${err}`);
      isConnected = false;
    });

    mongoose.connection.on("disconnected", () => {
      console.warn("⚠️ MongoDB disconnected. Attempting to reconnect...");
      isConnected = false;
    });

    mongoose.connection.on("reconnected", () => {
      console.log("✅ MongoDB reconnected");
      isConnected = true;
    });

    return true;
  } catch (error) {
    console.warn(`⚠️ MongoDB connection failed: ${error.message}`);
    console.warn("   Running in demo mode. Some features may be limited.");
    console.warn("   To use MongoDB Atlas, update MONGODB_URI in backend/.env");
    isConnected = false;
    return false;
  }
};

const getConnectionStatus = () => isConnected;

module.exports = connectDB;
module.exports.getConnectionStatus = getConnectionStatus;
