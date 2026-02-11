import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { User } from '../models/User.js';
import { AppError } from './errorHandler.js';

export const protect = async (req, res, next) => {
    try {
        let token;

        // Check for token in headers
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }
        // Check for token in cookies
        else if (req.cookies.token) {
            token = req.cookies.token;
        }

        if (!token) {
            return next(new AppError('Not authorized to access this route', 401));
        }

        try {
            // Verify token
            const decoded = jwt.verify(token, config.jwt.secret);
            const userId = decoded.userId || decoded.id; // Support both formats
            console.log('🔍 Token decoded - User ID:', userId);

            // Check if user still exists
            const user = await User.findById(userId).select('+password');
            if (!user) {
                console.log('❌ User not found in database! User ID:', userId);
                console.log('💡 This means the token is valid but references a deleted user');
                console.log('💡 Solution: Logout and login again to get a fresh token');
                return next(new AppError('User no longer exists', 401));
            }

            console.log('✅ User found:', user.email);

            // Check if user is active
            if (user.status !== 'active') {
                console.log('❌ User account is deactivated');
                return next(new AppError('Your account has been deactivated', 401));
            }

            // Attach user to request
            req.user = user;
            next();
        } catch (error) {
            console.log('❌ Token verification failed:', error.message);
            return next(new AppError('Invalid token', 401));
        }
    } catch (error) {
        next(error);
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

        next();
    };
};

export const optionalAuth = async (req, res, next) => {
    try {
        let token;

        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        } else if (req.cookies.token) {
            token = req.cookies.token;
        }

        if (token) {
            try {
                const decoded = jwt.verify(token, config.jwt.secret);
                const user = await User.findById(decoded.id);
                if (user && user.status === 'active') {
                    req.user = user;
                }
            } catch (error) {
                // Token invalid, but that's okay for optional auth
            }
        }

        next();
    } catch (error) {
        next(error);
    }
};
