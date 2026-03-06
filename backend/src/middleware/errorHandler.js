import { logger } from "../utils/logger.js";
import { config } from "../config/index.js";

export class AppError extends Error {
  constructor(message, statusCode, errors = null) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith("4") ? "fail" : "error";
    this.isOperational = true;
    this.errors = errors;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ApiResponse {
  static success(res, data, statusCode = 200, message = null) {
    if (typeof statusCode === "string") {
      message = statusCode;
      statusCode = 200;
    }
    const response = { success: true };
    if (message) response.message = message;
    response.data = data;
    return res.status(statusCode).json(response);
  }

  static created(res, data, message = "Created successfully") {
    return ApiResponse.success(res, data, 201, message);
  }

  static noContent(res) {
    return res.status(204).send();
  }

  static paginated(res, items, pagination, message = null) {
    const { page, limit, total } = pagination;
    const totalPages = Math.ceil(total / limit);
    const response = {
      success: true,
      ...(message && { message }),
      data: items,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
    return res.status(200).json(response);
  }
}

export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

export const notFound = (req, res, next) => {
  const error = new AppError(`Not found - ${req.originalUrl}`, 404);
  next(error);
};

export const errorHandler = (err, req, res, _next) => {
  let error = { ...err };
  error.message = err.message;
  error.statusCode = err.statusCode;

  logger.error({
    message: err.message,
    statusCode: err.statusCode,
    stack: err.stack,
    path: req.originalUrl,
    method: req.method,
    userId: req.user?._id || req.user?.id || null,
  });

  if (err.name === "CastError") {
    error = new AppError("Invalid resource ID format", 400);
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || "field";
    error = new AppError(
      `Duplicate field value: ${field}. Please use another value`,
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

  const statusCode = error.statusCode || 500;
  const isProduction = config.nodeEnv === "production";

  res.status(statusCode).json({
    success: false,
    message:
      statusCode >= 500 && isProduction
        ? "Internal server error"
        : error.message || "Internal server error",
    ...(error.errors && { errors: error.errors }),
    ...(statusCode >= 500 && !isProduction && { stack: err.stack }),
  });
};
