import { createClient } from "redis";
import { config } from "../config/index.js";
import { logger } from "./logger.js";

let client = null;
let connectPromise = null;
let unavailableUntil = 0;
let lastErrorLogAt = 0;

const RETRY_AFTER_MS = 15_000;

const shouldLogNow = () => {
  const now = Date.now();
  if (now - lastErrorLogAt < 30_000) {
    return false;
  }
  lastErrorLogAt = now;
  return true;
};

const markUnavailable = () => {
  unavailableUntil = Date.now() + RETRY_AFTER_MS;
};

const createRedisClient = () => {
  const redisClient = createClient({
    url: config.redis.url,
    socket: {
      connectTimeout: 1500,
    },
  });

  redisClient.on("error", (error) => {
    if (shouldLogNow()) {
      logger.warn(`Redis cache client error: ${error.message}`);
    }
    markUnavailable();
  });

  return redisClient;
};

export const getRedisClient = async () => {
  if (!config.redis.cacheEnabled) {
    return null;
  }

  if (Date.now() < unavailableUntil) {
    return null;
  }

  if (client?.isOpen) {
    return client;
  }

  if (!client) {
    client = createRedisClient();
  }

  if (!connectPromise) {
    connectPromise = client
      .connect()
      .then(() => {
        logger.info("Redis cache connected");
        return client;
      })
      .catch((error) => {
        if (shouldLogNow()) {
          logger.warn(
            `Redis cache unavailable, using memory fallback: ${error.message}`,
          );
        }
        markUnavailable();
        return null;
      })
      .finally(() => {
        connectPromise = null;
      });
  }

  return connectPromise;
};
