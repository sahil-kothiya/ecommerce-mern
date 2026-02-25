import mongoose from "mongoose";
import { config } from "./index.js";
import { logger } from "../utils/logger.js";

const connectionOptions = {
  maxPoolSize: 100,
  minPoolSize: 10,
  maxIdleTimeMS: 300000,

  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  connectTimeoutMS: 10000,

  heartbeatFrequencyMS: 10000,
  monitorCommands: true,

  autoIndex: false,
  retryWrites: true,
  retryReads: true,

  compressors: ["zlib"],
  zlibCompressionLevel: 6,

  // "primary" is required for transactions; secondaryPreferred is incompatible
  readPreference: "primary",

  w: "majority",
  wtimeoutMS: 5000,
};

let isSlowQueryMonitoringAttached = false;

export const connectDB = async () => {
  try {
    const mongoUri =
      config.nodeEnv === "test" ? config.mongodbTestUri : config.mongodbUri;

    if (!mongoUri) {
      throw new Error("MongoDB URI is not defined in environment variables");
    }

    await mongoose.connect(mongoUri, connectionOptions);

    setupEventListeners();

    logger.info(`✅ MongoDB connected successfully to ${maskUri(mongoUri)}`);
    logger.info(`📊 Database: ${mongoose.connection.name}`);
    logger.info(`🔗 Connection state: ${getConnectionState()}`);
  } catch (error) {
    logger.error("❌ MongoDB connection error:", error.message);

    if (config.nodeEnv === "production") {
      logger.info("🔄 Retrying connection in 5 seconds...");
      setTimeout(connectDB, 5000);
    } else {
      throw error;
    }
  }
};

const setupEventListeners = () => {
  const { connection } = mongoose;

  setupSlowQueryMonitoring(connection);

  connection.on("connected", () => {
    logger.info("🔗 MongoDB connection established");
  });

  connection.on("error", (err) => {
    logger.error("❌ MongoDB connection error:", err);
  });

  connection.on("disconnected", () => {
    logger.warn("⚠️  MongoDB disconnected");

    if (config.nodeEnv === "production") {
      logger.info("🔄 Attempting to reconnect...");
    }
  });

  connection.on("reconnected", () => {
    logger.info("🔄 MongoDB reconnected successfully");
  });

  process.on("SIGINT", async () => {
    await gracefulShutdown("SIGINT");
  });

  process.on("SIGTERM", async () => {
    await gracefulShutdown("SIGTERM");
  });

  process.on("unhandledRejection", (err) => {
    logger.error("🚨 Unhandled Promise Rejection:", err);
    if (config.nodeEnv === "production") {
      gracefulShutdown("unhandledRejection");
    }
  });
};

const setupSlowQueryMonitoring = (connection) => {
  if (!config.performance.enableMonitoring || isSlowQueryMonitoringAttached) {
    return;
  }

  const client = connection.getClient?.();
  if (!client) {
    return;
  }

  const ignoredCommands = new Set(["hello", "isMaster", "ping", "buildInfo"]);
  const thresholdMs = config.performance.slowQueryThresholdMs;

  client.on("commandSucceeded", (event) => {
    if (ignoredCommands.has(event.commandName)) {
      return;
    }

    const rawDuration = typeof event.duration === "number" ? event.duration : 0;
    const durationMs = rawDuration > 100000 ? rawDuration / 1000 : rawDuration;

    if (durationMs >= thresholdMs) {
      logger.warn(
        `[PERF][SLOW_QUERY] command=${event.commandName} duration=${Math.round(durationMs)}ms db=${event.databaseName}`,
      );
    }
  });

  isSlowQueryMonitoringAttached = true;
};

const gracefulShutdown = async (signal) => {
  try {
    logger.info(`🛑 Received ${signal}, closing MongoDB connection...`);

    await mongoose.connection.close();

    logger.info("✅ MongoDB connection closed successfully");
    process.exit(0);
  } catch (error) {
    logger.error("❌ Error during graceful shutdown:", error);
    process.exit(1);
  }
};

export const disconnectDB = async () => {
  try {
    await mongoose.connection.close();
    logger.info("✅ MongoDB connection closed");
  } catch (error) {
    logger.error("❌ Error disconnecting from MongoDB:", error);
    throw error;
  }
};

export const getConnectionState = () => {
  const states = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting",
  };

  return states[mongoose.connection.readyState] || "unknown";
};

export const isConnected = () => {
  return mongoose.connection.readyState === 1;
};

export const getConnectionStats = () => {
  return {
    state: getConnectionState(),
    name: mongoose.connection.name,
    host: mongoose.connection.host,
    port: mongoose.connection.port,
    readyState: mongoose.connection.readyState,
    collections: Object.keys(mongoose.connection.collections).length,
  };
};

const maskUri = (uri) => {
  return uri.replace(/:[^:@]+@/, ":****@");
};

export const dropDatabase = async () => {
  if (config.nodeEnv === "production") {
    throw new Error("Cannot drop database in production environment");
  }

  try {
    await mongoose.connection.dropDatabase();
    logger.warn("⚠️  Database dropped");
  } catch (error) {
    logger.error("❌ Error dropping database:", error);
    throw error;
  }
};

export const createIndexes = async () => {
  try {
    logger.info("📊 Creating database indexes...");

    const models = mongoose.modelNames();

    for (const modelName of models) {
      const model = mongoose.model(modelName);
      await model.createIndexes();
      logger.info(`✅ Indexes created for ${modelName}`);
    }

    logger.info("✅ All database indexes created successfully");
  } catch (error) {
    logger.error("❌ Error creating indexes:", error);
    throw error;
  }
};
