import winston from "winston";
import config from "../config/index.js";

const enumerateErrorFormat = winston.format((info) => {
  if (info instanceof Error) {
    Object.assign(info, { message: info.message, stack: info.stack });
  }
  return info;
});

const logger = winston.createLogger({
  level: config.logs.level,
  format: winston.format.combine(
    enumerateErrorFormat(),
    config.env === "development"
      ? winston.format.colorize()
      : winston.format.uncolorize(),
    winston.format.splat(),
    winston.format.printf(({ level, message }) => `${level}: ${message}`),
  ),
  transports: [
    new winston.transports.Console({
      stderrLevels: ["error"],
    }),
  ],
});

// Add file transports in production
if (config.env === "production") {
  logger.add(
    new winston.transports.File({ filename: "logs/error.log", level: "error" }),
  );
  logger.add(new winston.transports.File({ filename: "logs/combined.log" }));
}

export default logger;

// Usage Example:
// import logger from '../utils/logger.js';
// logger.info('Server started successfully');
// logger.error('Database connection failed', err);
