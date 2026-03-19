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

export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

export class ApiResponse {
  static success(res, data, statusCode = 200, message = null) {
    if (typeof statusCode === "string") {
      message = statusCode;
      statusCode = 200;
    }
    const response = { success: true, data };
    if (message) response.message = message;
    res.status(statusCode).json(response);
  }

  static created(res, data, message = "Created successfully") {
    return ApiResponse.success(res, data, 201, message);
  }

  static noContent(res) {
    res.status(204).send();
  }

  static paginated(res, items, pagination, message = null) {
    const { page, limit, total } = pagination;
    const totalPages = Math.ceil(total / limit);
    const response = {
      success: true,
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
    if (message) response.message = message;
    res.status(200).json(response);
  }
}
