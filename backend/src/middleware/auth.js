import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { User } from '../models/User.js';
import { AppError } from './errorHandler.js';
import { logger } from '../utils/logger.js';

const extractToken = (req) => {
    if (req.headers.authorization?.startsWith('Bearer ')) {
        return req.headers.authorization.split(' ')[1];
    }

    if (req.cookies?.accessToken) {
        return req.cookies.accessToken;
    }

    if (req.cookies?.token) {
        return req.cookies.token;
    }

    return null;
};

export const protect = async (req, res, next) => {
    try {
        const token = extractToken(req);

        if (!token) {
            return next(new AppError('Not authorized to access this route', 401));
        }

        const decoded = jwt.verify(token, config.jwt.secret);
        const userId = decoded.userId || decoded.id;

        const user = await User.findById(userId).select('name email role status');

        if (!user) {
            return next(new AppError('User no longer exists', 401));
        }

        if (user.status !== 'active') {
            return next(new AppError('Your account has been deactivated', 401));
        }

        req.user = user;
        return next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return next(new AppError('Token expired', 401));
        }

        if (error.name === 'JsonWebTokenError') {
            return next(new AppError('Invalid token', 401));
        }

        logger.error(`Auth middleware error: ${error.message}`);
        return next(error);
    }
};

export const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return next(new AppError('Not authorized to access this route', 401));
        }

        if (!roles.includes(req.user.role)) {
            return next(
                new AppError(`User role ${req.user.role} is not authorized to access this route`, 403)
            );
        }

        return next();
    };
};

export const optionalAuth = async (req, res, next) => {
    try {
        const token = extractToken(req);

        if (!token) {
            return next();
        }

        try {
            const decoded = jwt.verify(token, config.jwt.secret);
            const userId = decoded.userId || decoded.id;
            const user = await User.findById(userId).select('name email role status');

            if (user && user.status === 'active') {
                req.user = user;
            }
        } catch {
            // Optional auth intentionally ignores invalid token errors.
        }

        return next();
    } catch (error) {
        return next(error);
    }
};
