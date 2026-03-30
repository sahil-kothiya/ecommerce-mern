import Queue from "bull";
import { config } from "../config/index.js";
import { logger } from "../utils/logger.js";

const isQueueEnabled = Boolean(config.redis?.enabled);

const redisConfig = {
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password,
  maxRetriesPerRequest: 3,
};

const createDisabledQueue = (name) => ({
  name,
  add: async () => null,
  getJobCounts: async () => ({
    waiting: 0,
    active: 0,
    completed: 0,
    failed: 0,
    delayed: 0,
    paused: 0,
  }),
  process: () => {},
  on: () => {},
  close: async () => {},
});

export const ratingsQueue = isQueueEnabled
  ? new Queue("product-ratings", { redis: redisConfig })
  : createDisabledQueue("product-ratings");

export const emailQueue = isQueueEnabled
  ? new Queue("emails", { redis: redisConfig })
  : createDisabledQueue("emails");

export const imageProcessingQueue = isQueueEnabled
  ? new Queue("image-processing", { redis: redisConfig })
  : createDisabledQueue("image-processing");

export const getQueueHealth = async () => {
  if (!isQueueEnabled) {
    return {
      status: "disabled",
      counts: null,
    };
  }

  try {
    const [ratings, emails, imageProcessing] = await Promise.all([
      ratingsQueue.getJobCounts(),
      emailQueue.getJobCounts(),
      imageProcessingQueue.getJobCounts(),
    ]);

    return {
      status: "connected",
      counts: {
        ratings,
        emails,
        imageProcessing,
      },
    };
  } catch (error) {
    logger.warn("Unable to fetch queue health", { message: error.message });
    return {
      status: "disconnected",
      counts: null,
    };
  }
};

const lastQueueErrorLog = new Map();

const logQueueError = (queueName, error) => {
  const now = Date.now();
  const previous = lastQueueErrorLog.get(queueName) ?? 0;
  if (now - previous < 30_000) {
    return;
  }

  lastQueueErrorLog.set(queueName, now);
  logger.error(
    `${queueName} queue error: ${error?.message || "Unknown error"}`,
  );
};

if (isQueueEnabled) {
  ratingsQueue.on("error", (error) => {
    logQueueError("Ratings", error);
  });

  emailQueue.on("error", (error) => {
    logQueueError("Email", error);
  });

  imageProcessingQueue.on("error", (error) => {
    logQueueError("Image processing", error);
  });
}

if (isQueueEnabled) {
  logger.info("Queue system initialized");
} else {
  logger.warn(
    "Queue system disabled. Set QUEUE_ENABLED=true and start Redis to enable background jobs.",
  );
}
