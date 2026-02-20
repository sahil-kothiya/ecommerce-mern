import dotenv from "dotenv";

dotenv.config();

const parsedPort = parseInt(process.env.PORT || "5001", 10);
const parsedEmailPort = parseInt(process.env.SMTP_PORT || "587", 10);
const parsedMaxFileSize = parseInt(process.env.MAX_FILE_SIZE || "5242880", 10);
const parsedRateWindow = parseInt(
  process.env.RATE_LIMIT_WINDOW_MS || "900000",
  10,
);
const parsedRateMax = parseInt(
  process.env.RATE_LIMIT_MAX_REQUESTS || "100",
  10,
);
const parsedSlowRouteThresholdMs = parseInt(
  process.env.SLOW_ROUTE_THRESHOLD_MS || "800",
  10,
);
const parsedSlowQueryThresholdMs = parseInt(
  process.env.SLOW_QUERY_THRESHOLD_MS || "300",
  10,
);
const parsedLatencyWindowSize = parseInt(
  process.env.LATENCY_WINDOW_SIZE || "200",
  10,
);
const parsedLatencyReportEvery = parseInt(
  process.env.LATENCY_REPORT_EVERY || "100",
  10,
);

const parseBoolean = (value, defaultValue = false) => {
  if (value === undefined || value === null || value === "") {
    return defaultValue;
  }

  return value === "true" || value === true || value === "1" || value === 1;
};

const parseTrustProxy = (value, nodeEnv) => {
  if (value === undefined || value === null || value === "") {
    return nodeEnv === "production" ? 1 : false;
  }

  if (value === "true") return true;
  if (value === "false") return false;

  const parsed = parseInt(value, 10);
  if (!Number.isNaN(parsed)) {
    return parsed;
  }

  return value;
};

export const config = {
    nodeEnv: process.env.NODE_ENV || "development",
  port: Number.isNaN(parsedPort) ? 5000 : parsedPort,
  apiUrl: process.env.API_URL || "http://localhost:5001",
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:5173",
  trustProxy: parseTrustProxy(
    process.env.TRUST_PROXY,
    process.env.NODE_ENV || "development",
  ),

    mongodbUri:
    process.env.MONGODB_URI || "mongodb://localhost:27017/enterprise-ecommerce",
  mongodbTestUri:
    process.env.MONGODB_TEST_URI ||
    process.env.MONGODB_URI ||
    "mongodb://localhost:27017/enterprise-ecommerce-test",

    jwt: {
    secret: process.env.JWT_SECRET || "default-secret-change-in-production",
    expire: process.env.JWT_EXPIRE || "7d",
    refreshSecret: process.env.JWT_REFRESH_SECRET || "default-refresh-secret",
    refreshExpire: process.env.JWT_REFRESH_EXPIRE || "30d",
  },

    email: {
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number.isNaN(parsedEmailPort) ? 587 : parsedEmailPort,
    user: process.env.SMTP_USER || "",
    password: process.env.SMTP_PASSWORD || "",
    from: process.env.EMAIL_FROM || "noreply@example.com",
  },

    stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY || "",
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || "",
  },
  paypal: {
    clientId: process.env.PAYPAL_CLIENT_ID || "",
    clientSecret: process.env.PAYPAL_CLIENT_SECRET || "",
    mode: process.env.PAYPAL_MODE || "sandbox",
  },

    oauth: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    },
    facebook: {
      appId: process.env.FACEBOOK_APP_ID || "",
      appSecret: process.env.FACEBOOK_APP_SECRET || "",
    },
  },

    upload: {
    maxFileSize: Number.isNaN(parsedMaxFileSize) ? 5242880 : parsedMaxFileSize,
    allowedTypes: (
      process.env.ALLOWED_FILE_TYPES || "jpg,jpeg,png,gif,webp"
    ).split(","),
    uploadPath: process.env.UPLOAD_PATH || "uploads",
  },

    admin: {
    email: process.env.ADMIN_EMAIL || "admin@enterprise-ecommerce.com",
    password: process.env.ADMIN_PASSWORD || "admin123!",
  },

    rateLimit: {
    windowMs: Number.isNaN(parsedRateWindow) ? 900000 : parsedRateWindow,
    maxRequests: Number.isNaN(parsedRateMax) ? 100 : parsedRateMax,
  },

    logLevel: process.env.LOG_LEVEL || "info",

    performance: {
    enableMonitoring: parseBoolean(
      process.env.ENABLE_PERFORMANCE_MONITORING,
      true,
    ),
    slowRouteThresholdMs: Number.isNaN(parsedSlowRouteThresholdMs)
      ? 800
      : parsedSlowRouteThresholdMs,
    slowQueryThresholdMs: Number.isNaN(parsedSlowQueryThresholdMs)
      ? 300
      : parsedSlowQueryThresholdMs,
    latencyWindowSize: Number.isNaN(parsedLatencyWindowSize)
      ? 200
      : parsedLatencyWindowSize,
    latencyReportEvery: Number.isNaN(parsedLatencyReportEvery)
      ? 100
      : parsedLatencyReportEvery,
  },
};

const validateSecurityConfiguration = () => {
  const localEnvironments = new Set(["development", "test", "local"]);
  if (localEnvironments.has(config.nodeEnv)) {
    return;
  }

  const insecureSecrets = [
    "default-secret-change-in-production",
    "default-refresh-secret",
  ];
  if (
    insecureSecrets.includes(config.jwt.secret) ||
    insecureSecrets.includes(config.jwt.refreshSecret)
  ) {
    throw new Error(
      "Insecure JWT secret detected. Set JWT_SECRET and JWT_REFRESH_SECRET.",
    );
  }

  if (!config.jwt.secret || config.jwt.secret.length < 32) {
    throw new Error(
      "JWT_SECRET must be at least 32 characters in non-local environments.",
    );
  }

  if (!config.jwt.refreshSecret || config.jwt.refreshSecret.length < 32) {
    throw new Error(
      "JWT_REFRESH_SECRET must be at least 32 characters in non-local environments.",
    );
  }

  if (config.admin.password === "admin123!") {
    throw new Error(
      "Default admin password cannot be used in non-local environments. Set ADMIN_PASSWORD.",
    );
  }
};

validateSecurityConfiguration();
