import dotenv from 'dotenv';

dotenv.config();

const parsedPort = parseInt(process.env.PORT || '5001', 10);
const parsedEmailPort = parseInt(process.env.SMTP_PORT || '587', 10);
const parsedMaxFileSize = parseInt(process.env.MAX_FILE_SIZE || '5242880', 10);
const parsedRateWindow = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10);
const parsedRateMax = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10);

export const config = {
    // Server
    nodeEnv: process.env.NODE_ENV || 'development',
    port: Number.isNaN(parsedPort) ? 5000 : parsedPort,
    apiUrl: process.env.API_URL || 'http://localhost:5001',
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',

    // Database
    mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/enterprise-ecommerce',

    // JWT
    jwt: {
        secret: process.env.JWT_SECRET || 'default-secret-change-in-production',
        expire: process.env.JWT_EXPIRE || '7d',
        refreshSecret: process.env.JWT_REFRESH_SECRET || 'default-refresh-secret',
        refreshExpire: process.env.JWT_REFRESH_EXPIRE || '30d',
    },

    // Email
    email: {
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: Number.isNaN(parsedEmailPort) ? 587 : parsedEmailPort,
        user: process.env.SMTP_USER || '',
        password: process.env.SMTP_PASSWORD || '',
        from: process.env.EMAIL_FROM || 'noreply@example.com',
    },

    // Payment Gateways
    stripe: {
        secretKey: process.env.STRIPE_SECRET_KEY || '',
        publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
    },
    paypal: {
        clientId: process.env.PAYPAL_CLIENT_ID || '',
        clientSecret: process.env.PAYPAL_CLIENT_SECRET || '',
        mode: process.env.PAYPAL_MODE || 'sandbox',
    },

    // OAuth
    oauth: {
        google: {
            clientId: process.env.GOOGLE_CLIENT_ID || '',
            clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
        },
        facebook: {
            appId: process.env.FACEBOOK_APP_ID || '',
            appSecret: process.env.FACEBOOK_APP_SECRET || '',
        },
    },

    // File Upload
    upload: {
        maxFileSize: Number.isNaN(parsedMaxFileSize) ? 5242880 : parsedMaxFileSize, // 5MB
        allowedTypes: (process.env.ALLOWED_FILE_TYPES || 'jpg,jpeg,png,gif,webp').split(','),
        uploadPath: process.env.UPLOAD_PATH || 'uploads',
    },

    // Admin
    admin: {
        email: process.env.ADMIN_EMAIL || 'admin@enterprise-ecommerce.com',
        password: process.env.ADMIN_PASSWORD || 'admin123!',
    },

    // Rate Limiting
    rateLimit: {
        windowMs: Number.isNaN(parsedRateWindow) ? 900000 : parsedRateWindow, // 15 minutes
        maxRequests: Number.isNaN(parsedRateMax) ? 100 : parsedRateMax,
    },

    // Logging
    logLevel: process.env.LOG_LEVEL || 'info',
};

const validateProductionSecurity = () => {
    if (config.nodeEnv !== 'production') {
        return;
    }

    const insecureSecrets = ['default-secret-change-in-production', 'default-refresh-secret'];
    if (insecureSecrets.includes(config.jwt.secret) || insecureSecrets.includes(config.jwt.refreshSecret)) {
        throw new Error('Insecure JWT secret detected in production. Set JWT_SECRET and JWT_REFRESH_SECRET.');
    }

    if (config.admin.password === 'admin123!') {
        throw new Error('Default admin password cannot be used in production. Set ADMIN_PASSWORD.');
    }
};

validateProductionSecurity();
