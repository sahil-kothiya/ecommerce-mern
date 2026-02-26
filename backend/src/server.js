import { config } from "./config/index.js";
import { connectDB } from "./config/database.js";
import { logger } from "./utils/logger.js";
import app from "./app.js";

const PORT = config.port || 5001;
let server;

const shutdown = (reason, code = 0) => {
  logger.info(`Shutdown triggered: ${reason}`);
  if (server) {
    server.close(() => process.exit(code));
    setTimeout(() => process.exit(code), 5000).unref();
    return;
  }
  process.exit(code);
};

const startServer = async () => {
  try {
    await connectDB();
    logger.info("MongoDB connected successfully");

    server = app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT} in ${config.nodeEnv} mode`);
      logger.info(`API available at ${config.apiUrl}`);
    });
  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
};

process.on("unhandledRejection", (err) => {
  logger.error("UNHANDLED REJECTION. Shutting down...", err);
  shutdown("unhandledRejection", 1);
});

process.on("uncaughtException", (err) => {
  logger.error("UNCAUGHT EXCEPTION. Shutting down...", err);
  shutdown("uncaughtException", 1);
});

process.on("SIGTERM", () => {
  shutdown("SIGTERM", 0);
});

startServer();

export default app;
