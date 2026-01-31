import app from "./app.js";
import connectDB from "./config/db.js";
import dotenv from "dotenv";
import { validateEnv } from "./config/validateEnv.js";
import { info, error } from "./utils/logger.js";
import { verifyEmailTransport } from "./utils/emailService.js";

dotenv.config();

// =======================
// Environment Validation
// =======================
info("Validating environment variables...");
validateEnv();

// =======================
// Email Transport Verification
// =======================
verifyEmailTransport().catch(err => {
  error("Email transport verification error:", err);
});

// =======================
// DB
// =======================
connectDB();

// =======================
// Server
// =======================
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () =>
  info(`Server running on port ${PORT}`)
);

// =======================
// Graceful Shutdown
// =======================
const gracefulShutdown = (signal) => {
  info(`${signal} received. Starting graceful shutdown...`);

  // Stop accepting new connections
  server.close(async () => {
    info("HTTP server closed");

    // Close database connections
    try {
      const mongoose = await import("mongoose");
      await mongoose.default.connection.close();
      info("MongoDB connection closed");
      process.exit(0);
    } catch (err) {
      error("Error closing MongoDB connection:", err);
      process.exit(1);
    }
  });

  // Force shutdown after 30 seconds
  setTimeout(() => {
    error("Forced shutdown after timeout");
    process.exit(1);
  }, 30000);
};

// Handle shutdown signals
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
