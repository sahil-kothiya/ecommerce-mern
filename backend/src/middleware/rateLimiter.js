import rateLimit from 'express-rate-limit';
import { config } from '../config/index.js';

export const rateLimiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: () => (config.nodeEnv === 'development' ? 5000 : config.rateLimit.maxRequests),
    message: 'Too many requests from this IP, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => req.method === 'OPTIONS',
});

export const authRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 15,
    message: 'Too many login attempts, please try again after 15 minutes',
    skipSuccessfulRequests: true,
});
