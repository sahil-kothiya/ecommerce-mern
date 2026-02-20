import { logger } from '../utils/logger.js';

export class AppError extends Error {
    constructor(message, statusCode, errors = null) {
        super(message);
        this.statusCode = statusCode;
        this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
        this.isOperational = true;
        this.errors = errors;

        Error.captureStackTrace(this, this.constructor);
    }
}

export const notFound = (req, res, next) => {
    const error = new AppError(`Not found - ${req.originalUrl}`, 404);
    next(error);
};

export const errorHandler = (
    err,
    req,
    res,
    next
) => {
    let error = { ...err };
    error.message = err.message;

        logger.error(err);

        if (err.name === 'CastError') {
        const message = 'Resource not found';
        error = new AppError(message, 404);
    }

        if (err.code === 11000) {
        const field = Object.keys(err.keyValue)[0];
        const message = `Duplicate field value: ${field}. Please use another value`;
        error = new AppError(message, 400);
    }

        if (err.name === 'ValidationError') {
        const message = Object.values(err.errors)
            .map((val) => val.message)
            .join(', ');
        error = new AppError(message, 400);
    }

        if (err.name === 'JsonWebTokenError') {
        const message = 'Invalid token. Please log in again';
        error = new AppError(message, 401);
    }

    if (err.name === 'TokenExpiredError') {
        const message = 'Token expired. Please log in again';
        error = new AppError(message, 401);
    }

    const statusCode = error.statusCode || 500;

    res.status(statusCode).json({
        success: false,
        message: error.message || 'Server Error',
        ...(error.errors && { errors: error.errors }),
        ...(process.env.NODE_ENV === 'development' && statusCode >= 500 && { stack: err.stack }),
    });
};
