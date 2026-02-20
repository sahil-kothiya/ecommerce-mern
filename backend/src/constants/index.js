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
  SERVICE_UNAVAILABLE: 503,
};

export const USER_ROLES = {
  ADMIN: "admin",
  USER: "user",
  MODERATOR: "moderator",
};

export const USER_STATUS = {
  ACTIVE: "active",
  INACTIVE: "inactive",
  SUSPENDED: "suspended",
  PENDING: "pending",
};

export const PRODUCT_STATUS = {
  ACTIVE: "active",
  INACTIVE: "inactive",
  DRAFT: "draft",
  OUT_OF_STOCK: "out_of_stock",
};

export const PRODUCT_CONDITIONS = {
  NEW: "new",
  HOT: "hot",
  DEFAULT: "default",
};

export const ORDER_STATUS = {
  PENDING: "pending",
  PROCESSING: "processing",
  CONFIRMED: "confirmed",
  SHIPPED: "shipped",
  DELIVERED: "delivered",
  CANCELLED: "cancelled",
  REFUNDED: "refunded",
  FAILED: "failed",
};

export const PAYMENT_STATUS = {
  PENDING: "pending",
  PAID: "paid",
  FAILED: "failed",
  REFUNDED: "refunded",
  PARTIALLY_REFUNDED: "partially_refunded",
};

export const PAYMENT_METHODS = {
  CREDIT_CARD: "credit_card",
  DEBIT_CARD: "debit_card",
  PAYPAL: "paypal",
  STRIPE: "stripe",
  CASH_ON_DELIVERY: "cash_on_delivery",
  BANK_TRANSFER: "bank_transfer",
};

export const SHIPPING_METHODS = {
  STANDARD: "standard",
  EXPRESS: "express",
  OVERNIGHT: "overnight",
  PICKUP: "pickup",
};

export const FILE_LIMITS = {
  MAX_FILE_SIZE: 5 * 1024 * 1024,
  MAX_FILES: 10,
  ALLOWED_IMAGE_TYPES: [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
  ],
  ALLOWED_DOCUMENT_TYPES: [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ],
};

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
  MIN_LIMIT: 1,
};

export const CACHE_TTL = {
  SHORT: 60,
  MEDIUM: 300,
  LONG: 3600,
  VERY_LONG: 86400,
};

export const RATE_LIMITS = {
  GENERAL: {
    WINDOW_MS: 15 * 60 * 1000,
    MAX_REQUESTS: 100,
  },
  AUTH: {
    WINDOW_MS: 15 * 60 * 1000,
    MAX_REQUESTS: 5,
  },
  API: {
    WINDOW_MS: 60 * 1000,
    MAX_REQUESTS: 60,
  },
};

export const REGEX = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE: /^\+?[1-9]\d{1,14}$/,
  SLUG: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
  HEX_COLOR: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/,
  PASSWORD: /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{6,}$/,
  URL: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&/=]*)$/,
};

export const ERROR_MESSAGES = {
  INVALID_CREDENTIALS: "Invalid email or password",
  UNAUTHORIZED: "Unauthorized access",
  TOKEN_EXPIRED: "Token expired. Please login again",
  TOKEN_INVALID: "Invalid token",
  USER_NOT_FOUND: "User not found",
  EMAIL_EXISTS: "Email already exists",

  FORBIDDEN: "You do not have permission to perform this action",
  ADMIN_REQUIRED: "Admin access required",

  REQUIRED_FIELD: "This field is required",
  INVALID_EMAIL: "Invalid email format",
  INVALID_PASSWORD:
    "Password must be at least 6 characters with letters and numbers",
  INVALID_ID: "Invalid ID format",

  RESOURCE_NOT_FOUND: "Resource not found",
  PRODUCT_NOT_FOUND: "Product not found",
  CATEGORY_NOT_FOUND: "Category not found",
  ORDER_NOT_FOUND: "Order not found",

  CREATE_FAILED: "Failed to create resource",
  UPDATE_FAILED: "Failed to update resource",
  DELETE_FAILED: "Failed to delete resource",

  FILE_TOO_LARGE: "File size exceeds limit",
  INVALID_FILE_TYPE: "Invalid file type",
  UPLOAD_FAILED: "File upload failed",

  SERVER_ERROR: "Internal server error",
  BAD_REQUEST: "Bad request",
  NETWORK_ERROR: "Network error. Please try again",
};

export const SUCCESS_MESSAGES = {
  REGISTER_SUCCESS: "Registration successful",
  LOGIN_SUCCESS: "Login successful",
  LOGOUT_SUCCESS: "Logout successful",
  PASSWORD_CHANGED: "Password changed successfully",

  CREATED: "Created successfully",
  UPDATED: "Updated successfully",
  DELETED: "Deleted successfully",

  PRODUCT_CREATED: "Product created successfully",
  PRODUCT_UPDATED: "Product updated successfully",
  PRODUCT_DELETED: "Product deleted successfully",

  ORDER_PLACED: "Order placed successfully",
  ORDER_UPDATED: "Order updated successfully",
  ORDER_CANCELLED: "Order cancelled successfully",

  PROFILE_UPDATED: "Profile updated successfully",

  OPERATION_SUCCESS: "Operation completed successfully",
};

export const COLLECTIONS = {
  USERS: "users",
  PRODUCTS: "products",
  CATEGORIES: "categories",
  BRANDS: "brands",
  ORDERS: "orders",
  CARTS: "carts",
  REVIEWS: "reviews",
  WISHLISTS: "wishlists",
  COUPONS: "coupons",
};

export const EVENTS = {
  USER_REGISTERED: "user:registered",
  USER_LOGGED_IN: "user:logged_in",
  USER_LOGGED_OUT: "user:logged_out",
  ORDER_CREATED: "order:created",
  ORDER_UPDATED: "order:updated",
  PRODUCT_CREATED: "product:created",
  PRODUCT_UPDATED: "product:updated",
  PAYMENT_COMPLETED: "payment:completed",
  EMAIL_SENT: "email:sent",
};

export const LOCALES = {
  EN_US: "en-US",
  EN_GB: "en-GB",
  FR_FR: "fr-FR",
  DE_DE: "de-DE",
  ES_ES: "es-ES",
};

export const CURRENCIES = {
  USD: "USD",
  EUR: "EUR",
  GBP: "GBP",
  JPY: "JPY",
  CAD: "CAD",
};

export const ENVIRONMENTS = {
  DEVELOPMENT: "development",
  PRODUCTION: "production",
  TEST: "test",
  STAGING: "staging",
};
