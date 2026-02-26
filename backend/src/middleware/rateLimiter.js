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
    windowMs: config.authRateLimit.windowMs,
    max: config.authRateLimit.loginMax,
    message: 'Too many login attempts, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    skip: (req) => req.method === 'OPTIONS',
    keyGenerator: (req) => {
        const ip = req.ip || req.connection?.remoteAddress || 'unknown';
        const email = String(req.body?.email || '').trim().toLowerCase();
        return email ? `auth:login:${ip}:${email}` : `auth:login:${ip}`;
    },
});

export const authRefreshRateLimiter = rateLimit({
    windowMs: config.authRateLimit.windowMs,
    max: config.authRateLimit.refreshMax,
    message: 'Too many token refresh attempts, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => req.method === 'OPTIONS',
    keyGenerator: (req) => {
        const ip = req.ip || req.connection?.remoteAddress || 'unknown';
        return `auth:refresh:${ip}`;
    },
});

export const authForgotPasswordRateLimiter = rateLimit({
    windowMs: config.authRateLimit.windowMs,
    max: config.authRateLimit.forgotPasswordMax,
    message: 'Too many password reset requests, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => req.method === 'OPTIONS',
    keyGenerator: (req) => {
        const ip = req.ip || req.connection?.remoteAddress || 'unknown';
        const email = String(req.body?.email || '').trim().toLowerCase();
        return email ? `auth:forgot:${ip}:${email}` : `auth:forgot:${ip}`;
    },
});

export const authResetPasswordRateLimiter = rateLimit({
    windowMs: config.authRateLimit.windowMs,
    max: config.authRateLimit.resetPasswordMax,
    message: 'Too many password reset attempts, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => req.method === 'OPTIONS',
    keyGenerator: (req) => {
        const ip = req.ip || req.connection?.remoteAddress || 'unknown';
        return `auth:reset:${ip}`;
    },
});
