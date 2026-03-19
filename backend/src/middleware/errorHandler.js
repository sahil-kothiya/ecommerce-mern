import { logger } from "../utils/logger.js";
import { config } from "../config/index.js";
import { AppError } from "../utils/AppError.js";
import { createErrorEnvelope } from "../utils/responseEnvelope.js";

export { AppError };

export const notFound = (req, _res, next) => {
  next(new AppError(`Not found - ${req.originalUrl}`, 404));
};

export const errorHandler = (err, req, res, _next) => {
  let error = Object.assign(Object.create(Object.getPrototypeOf(err)), err);
  error.message = err.message;
  error.statusCode = err.statusCode;

  logger.error({
    message: err.message,
    statusCode: err.statusCode,
    stack: err.stack,
    path: req.originalUrl,
    method: req.method,
    requestId: req.id,
    userId: req.user?._id || req.user?.id || null,
  });

  if (err.name === "CastError") {
    error = new AppError("Invalid resource ID format", 400);
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || "field";
    error = new AppError(
      `Duplicate value for field: ${field}. Please use another value`,
      409,
    );
  }

  if (err.name === "ValidationError") {
    const fieldErrors = Object.entries(err.errors || {}).map(
      ([field, detail]) => ({
        field,
        message: detail.message,
      }),
    );
    error = new AppError("Validation failed", 422, fieldErrors);
  }

  if (err.name === "JsonWebTokenError") {
    error = new AppError("Invalid token. Please log in again", 401);
  }

  if (err.name === "TokenExpiredError") {
    error = new AppError("Token expired. Please log in again", 401);
  }

  if (err.type === "entity.too.large") {
    error = new AppError("Request payload too large", 413);
  }

  const statusCode = error.statusCode || 500;
  const isProduction = config.nodeEnv === "production";
  const isOperational = error.isOperational === true;

  const responseMessage =
    !isOperational && isProduction
      ? "Internal server error"
      : error.message || "Internal server error";

  const responseErrors = Array.isArray(error.errors)
    ? error.errors
    : error.errors
      ? [error.errors]
      : [];

  const envelope = createErrorEnvelope({
    message: responseMessage,
    errors: responseErrors,
    meta: {
      requestId: req.id || null,
      statusCode,
    },
  });

  if (!isProduction && statusCode >= 500) {
    envelope.meta.stack = err.stack;
  }

  res.status(statusCode).json(envelope);
};
