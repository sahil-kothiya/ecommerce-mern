/**
 * @fileoverview Application Constants
 * @description Centralized constants for the application
 * @author Enterprise E-Commerce Team
 * @version 1.0.0
 */

/**
 * HTTP Status Codes
 */
export const HTTP_STATUS = {
    OK: 200,
    CREATED: 201,
    NO_CONTENT: 204,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    UNPROCESSABLE_ENTITY: 422,
    TOO_MANY_REQUESTS: 429,
    INTERNAL_SERVER_ERROR: 500,
    SERVICE_UNAVAILABLE: 503
};

/**
 * User Roles
 */
export const USER_ROLES = {
    ADMIN: 'admin',
    USER: 'user',
    MODERATOR: 'moderator'
};

/**
 * User Status
 */
export const USER_STATUS = {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
    SUSPENDED: 'suspended',
    PENDING: 'pending'
};

/**
 * Product Status
 */
export const PRODUCT_STATUS = {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
    DRAFT: 'draft',
    OUT_OF_STOCK: 'out_of_stock'
};

/**
 * Product Conditions
 */
export const PRODUCT_CONDITIONS = {
    NEW: 'new',
    HOT: 'hot',
    DEFAULT: 'default'
};

/**
 * Order Status
 */
export const ORDER_STATUS = {
    PENDING: 'pending',
    PROCESSING: 'processing',
    CONFIRMED: 'confirmed',
    SHIPPED: 'shipped',
    DELIVERED: 'delivered',
    CANCELLED: 'cancelled',
    REFUNDED: 'refunded',
    FAILED: 'failed'
};

/**
 * Payment Status
 */
export const PAYMENT_STATUS = {
    PENDING: 'pending',
    PAID: 'paid',
    FAILED: 'failed',
    REFUNDED: 'refunded',
    PARTIALLY_REFUNDED: 'partially_refunded'
};

/**
 * Payment Methods
 */
export const PAYMENT_METHODS = {
    CREDIT_CARD: 'credit_card',
    DEBIT_CARD: 'debit_card',
    PAYPAL: 'paypal',
    STRIPE: 'stripe',
    CASH_ON_DELIVERY: 'cash_on_delivery',
    BANK_TRANSFER: 'bank_transfer'
};

/**
 * Shipping Methods
 */
export const SHIPPING_METHODS = {
    STANDARD: 'standard',
    EXPRESS: 'express',
    OVERNIGHT: 'overnight',
    PICKUP: 'pickup'
};

/**
 * File Upload Limits
 */
export const FILE_LIMITS = {
    MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB in bytes
    MAX_FILES: 10,
    ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
    ALLOWED_DOCUMENT_TYPES: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
};

/**
 * Pagination Defaults
 */
export const PAGINATION = {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 20,
    MAX_LIMIT: 100,
    MIN_LIMIT: 1
};

/**
 * Cache TTL (Time To Live) in seconds
 */
export const CACHE_TTL = {
    SHORT: 60,          // 1 minute
    MEDIUM: 300,        // 5 minutes
    LONG: 3600,         // 1 hour
    VERY_LONG: 86400    // 24 hours
};

/**
 * Rate Limiting
 */
export const RATE_LIMITS = {
    GENERAL: {
        WINDOW_MS: 15 * 60 * 1000, // 15 minutes
        MAX_REQUESTS: 100
    },
    AUTH: {
        WINDOW_MS: 15 * 60 * 1000, // 15 minutes
        MAX_REQUESTS: 5
    },
    API: {
        WINDOW_MS: 60 * 1000, // 1 minute
        MAX_REQUESTS: 60
    }
};

/**
 * Regular Expressions
 */
export const REGEX = {
    EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    PHONE: /^\+?[1-9]\d{1,14}$/,
    SLUG: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    HEX_COLOR: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/,
    PASSWORD: /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{6,}$/,
    URL: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/
};

/**
 * Error Messages
 */
export const ERROR_MESSAGES = {
    // Authentication
    INVALID_CREDENTIALS: 'Invalid email or password',
    UNAUTHORIZED: 'Unauthorized access',
    TOKEN_EXPIRED: 'Token expired. Please login again',
    TOKEN_INVALID: 'Invalid token',
    USER_NOT_FOUND: 'User not found',
    EMAIL_EXISTS: 'Email already exists',
    
    // Authorization
    FORBIDDEN: 'You do not have permission to perform this action',
    ADMIN_REQUIRED: 'Admin access required',
    
    // Validation
    REQUIRED_FIELD: 'This field is required',
    INVALID_EMAIL: 'Invalid email format',
    INVALID_PASSWORD: 'Password must be at least 6 characters with letters and numbers',
    INVALID_ID: 'Invalid ID format',
    
    // Resources
    RESOURCE_NOT_FOUND: 'Resource not found',
    PRODUCT_NOT_FOUND: 'Product not found',
    CATEGORY_NOT_FOUND: 'Category not found',
    ORDER_NOT_FOUND: 'Order not found',
    
    // Operations
    CREATE_FAILED: 'Failed to create resource',
    UPDATE_FAILED: 'Failed to update resource',
    DELETE_FAILED: 'Failed to delete resource',
    
    // File Upload
    FILE_TOO_LARGE: 'File size exceeds limit',
    INVALID_FILE_TYPE: 'Invalid file type',
    UPLOAD_FAILED: 'File upload failed',
    
    // General
    SERVER_ERROR: 'Internal server error',
    BAD_REQUEST: 'Bad request',
    NETWORK_ERROR: 'Network error. Please try again'
};

/**
 * Success Messages
 */
export const SUCCESS_MESSAGES = {
    // Authentication
    REGISTER_SUCCESS: 'Registration successful',
    LOGIN_SUCCESS: 'Login successful',
    LOGOUT_SUCCESS: 'Logout successful',
    PASSWORD_CHANGED: 'Password changed successfully',
    
    // CRUD Operations
    CREATED: 'Created successfully',
    UPDATED: 'Updated successfully',
    DELETED: 'Deleted successfully',
    
    // Specific Resources
    PRODUCT_CREATED: 'Product created successfully',
    PRODUCT_UPDATED: 'Product updated successfully',
    PRODUCT_DELETED: 'Product deleted successfully',
    
    ORDER_PLACED: 'Order placed successfully',
    ORDER_UPDATED: 'Order updated successfully',
    ORDER_CANCELLED: 'Order cancelled successfully',
    
    PROFILE_UPDATED: 'Profile updated successfully',
    
    // General
    OPERATION_SUCCESS: 'Operation completed successfully'
};

/**
 * Database Collections
 */
export const COLLECTIONS = {
    USERS: 'users',
    PRODUCTS: 'products',
    CATEGORIES: 'categories',
    BRANDS: 'brands',
    ORDERS: 'orders',
    CARTS: 'carts',
    REVIEWS: 'reviews',
    WISHLISTS: 'wishlists',
    COUPONS: 'coupons'
};

/**
 * Event Names for Event Emitters
 */
export const EVENTS = {
    USER_REGISTERED: 'user:registered',
    USER_LOGGED_IN: 'user:logged_in',
    USER_LOGGED_OUT: 'user:logged_out',
    ORDER_CREATED: 'order:created',
    ORDER_UPDATED: 'order:updated',
    PRODUCT_CREATED: 'product:created',
    PRODUCT_UPDATED: 'product:updated',
    PAYMENT_COMPLETED: 'payment:completed',
    EMAIL_SENT: 'email:sent'
};

/**
 * Supported Locales
 */
export const LOCALES = {
    EN_US: 'en-US',
    EN_GB: 'en-GB',
    FR_FR: 'fr-FR',
    DE_DE: 'de-DE',
    ES_ES: 'es-ES'
};

/**
 * Currency Codes
 */
export const CURRENCIES = {
    USD: 'USD',
    EUR: 'EUR',
    GBP: 'GBP',
    JPY: 'JPY',
    CAD: 'CAD'
};

/**
 * Environment Types
 */
export const ENVIRONMENTS = {
    DEVELOPMENT: 'development',
    PRODUCTION: 'production',
    TEST: 'test',
    STAGING: 'staging'
};
