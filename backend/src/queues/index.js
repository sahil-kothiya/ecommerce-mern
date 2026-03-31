import { logger } from "../utils/logger.js";

let jobCounter = 0;

const createInProcessQueue = (name) => {
  const listeners = new Map();
  const counts = {
    waiting: 0,
    active: 0,
    completed: 0,
    failed: 0,
    delayed: 0,
    paused: 0,
  };
  let processor = null;

  const emit = (eventName, ...args) => {
    const handlers = listeners.get(eventName) || [];
    handlers.forEach((handler) => handler(...args));
  };

  return {
    name,
    add: async (data) => {
      const job = {
        id: `${name}-${Date.now()}-${++jobCounter}`,
        data,
      };

      counts.waiting += 1;

      Promise.resolve().then(async () => {
        if (!processor) {
          counts.waiting = Math.max(0, counts.waiting - 1);
          return;
        }

        counts.waiting = Math.max(0, counts.waiting - 1);
        counts.active += 1;

        try {
          const result = await processor(job);
          counts.completed += 1;
          emit("completed", job, result);
        } catch (error) {
          counts.failed += 1;
          emit("failed", job, error);
          emit("error", error);
        } finally {
          counts.active = Math.max(0, counts.active - 1);
        }
      });

      return job;
    },
    getJobCounts: async () => ({ ...counts }),
    process: (handler) => {
      processor = handler;
    },
    on: (eventName, handler) => {
      const existing = listeners.get(eventName) || [];
      listeners.set(eventName, [...existing, handler]);
    },
    close: async () => {},
  };
};

export const ratingsQueue = createInProcessQueue("product-ratings");

export const emailQueue = createInProcessQueue("emails");

export const imageProcessingQueue = createInProcessQueue("image-processing");

export const getQueueHealth = async () => {
  try {
    const [ratings, emails, imageProcessing] = await Promise.all([
      ratingsQueue.getJobCounts(),
      emailQueue.getJobCounts(),
      imageProcessingQueue.getJobCounts(),
    ]);

    return {
      status: "in-process",
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

logger.info("Queue system initialized (in-process mode)");
