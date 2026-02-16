import { logger } from '../utils/logger.js';

import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { User } from '../models/User.js';
import { AppError } from './errorHandler.js';

export const protect = async (req, res, next) => {
    // âš ï¸ TEMPORARY: JWT AUTHENTICATION DISABLED FOR TESTING
    // TODO: RE-ENABLE AUTHENTICATION BEFORE PRODUCTION
    try {
        logger.info('âš ï¸ WARNING: JWT authentication is TEMPORARILY DISABLED');
        
        // Get a default admin user for testing
        const adminUser = await User.findOne({ email: 'admin@admin.com' });
        
        if (adminUser) {
            logger.info('âœ… Using default admin user for testing:', adminUser.email);
            req.user = adminUser;
        } else {
            logger.info('âš ï¸ No admin user found, creating temporary user object');
            // Create a temporary user object if no admin exists
            req.user = {
                _id: '000000000000000000000000',
                email: 'temp@test.com',
                role: 'admin',
                status: 'active'
            };
        }
        
        next();
    } catch (error) {
        console.error('Error in bypass protect middleware:', error);
        next(error);
    }
};

/* ORIGINAL CODE - COMMENTED OUT FOR TESTING
export const protect = async (req, res, next) => {
    try {
        let token;

        // Check for token in headers first (priority)
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }
        // Check for token in cookies (accessToken)
        else if (req.cookies?.accessToken) {
            token = req.cookies.accessToken;
        }
        // Fallback to generic token cookie
        else if (req.cookies?.token) {
            token = req.cookies.token;
        }

        if (!token) {
            return next(new AppError('Not authorized to access this route', 401));
        }

        try {
            // Verify token
            const decoded = jwt.verify(token, config.jwt.secret);
            const userId = decoded.userId || decoded.id; // Support both formats
            logger.info('ðŸ” Token decoded - User ID:', userId);

            // Check if user still exists
            const user = await User.findById(userId).select('+password');
            if (!user) {
                logger.info('âŒ User not found in database! User ID:', userId);
                logger.info('ðŸ’¡ This means the token is valid but references a deleted user');
                logger.info('ðŸ’¡ Solution: Logout and login again to get a fresh token');
                return next(new AppError('User no longer exists', 401));
            }

            logger.info('âœ… User found:', user.email);

            // Check if user is active
            if (user.status !== 'active') {
                logger.info('âŒ User account is deactivated');
                return next(new AppError('Your account has been deactivated', 401));
            }

            // Attach user to request
            req.user = user;
            next();
        } catch (error) {
            logger.info('âŒ Token verification failed:', error.message);
            return next(new AppError('Invalid token', 401));
        }
    } catch (error) {
        next(error);
    }
};
*/

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
        } else if (req.cookies?.accessToken) {
            token = req.cookies.accessToken;
        } else if (req.cookies?.token) {
            token = req.cookies.token;
        }

        if (token) {
            try {
                const decoded = jwt.verify(token, config.jwt.secret);
                const userId = decoded.userId || decoded.id;
                const user = await User.findById(userId);
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
