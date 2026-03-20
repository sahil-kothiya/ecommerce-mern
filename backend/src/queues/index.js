import Queue from "bull";
import { config } from "../config/index.js";
import { logger } from "../utils/logger.js";

const redisConfig = {
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password,
  maxRetriesPerRequest: 3,
};

export const ratingsQueue = new Queue("product-ratings", {
  redis: redisConfig,
});
export const emailQueue = new Queue("emails", { redis: redisConfig });
export const imageProcessingQueue = new Queue("image-processing", {
  redis: redisConfig,
});

export const getQueueHealth = async () => {
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

ratingsQueue.on("error", (error) => {
  logger.error("Ratings queue error:", error);
});

emailQueue.on("error", (error) => {
  logger.error("Email queue error:", error);
});

imageProcessingQueue.on("error", (error) => {
  logger.error("Image processing queue error:", error);
});

logger.info("Queue system initialized");
