import "dotenv/config";
import { app } from "./app.js";
import { logger } from "./utils/logger.js";

const PORT = process.env.PORT || 3002;
const NODE_ENV = process.env.NODE_ENV || "development";

const server = app.listen(PORT, () => {
  logger.info(`🗓️ Agent B (Calendar Scheduler) running on port ${PORT}`, {
    environment: NODE_ENV,
    port: PORT,
    service: "agent-b-calendar",
  });
});

// Graceful shutdown
process.on("SIGTERM", () => {
  logger.info("SIGTERM received, shutting down gracefully");
  server.close(() => {
    logger.info("Process terminated");
  });
});

process.on("SIGINT", () => {
  logger.info("SIGINT received, shutting down gracefully");
  server.close(() => {
    logger.info("Process terminated");
  });
});

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  logger.error("Uncaught Exception:", error);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});
