import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import cookieParser from "cookie-parser";
import hpp from "hpp";
import morgan from "morgan";
import crypto from "crypto";
import path from "path";
import { fileURLToPath } from "url";
import { config } from "./config/index.js";
import { logger } from "./utils/logger.js";
import { errorHandler, notFound } from "./middleware/errorHandler.js";
import { rateLimiter } from "./middleware/rateLimiter.js";
import { mongoSanitizeMiddleware } from "./middleware/mongoSanitize.js";
import { csrfProtection } from "./middleware/csrf.js";
import mongoose from "mongoose";
import { handleStripeWebhook } from "./routes/payment.routes.js";
import { apiRouteRegistry } from "./routes/registry.js";
import { createSuccessEnvelope } from "./utils/responseEnvelope.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectImagesPath = path.resolve(__dirname, "../../images");
const frontendPublicImagesPath = path.resolve(
  __dirname,
  "../../frontend/public/images",
);

const app = express();

// ─────────────── Performance monitoring ───────────────
const latencyWindow = [];
const { latencyWindowSize, latencyReportEvery } = config.performance;
let observedRequestCount = 0;

const getPercentile = (values, percentile) => {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[Math.max(index, 0)];
};

// ─────────────── Trust proxy ───────────────
app.set("trust proxy", config.trustProxy);

// ─────────────── Security headers ───────────────
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        "img-src": ["'self'", "data:", "blob:", ...config.frontendOrigins],
      },
    },
  }),
);

// ─────────────── CORS ───────────────
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        return callback(null, true);
      }

      if (config.frontendOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("CORS origin denied"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-CSRF-Token",
      "Idempotency-Key",
      "X-Idempotency-Key",
      "X-Request-ID",
    ],
    exposedHeaders: ["Content-Length", "Content-Type", "X-Request-ID"],
  }),
);

// ─────────────── Request correlation ID ───────────────
app.use((req, res, next) => {
  req.id = req.headers["x-request-id"] || crypto.randomUUID();
  res.setHeader("X-Request-ID", req.id);
  next();
});

// ─────────────── Stripe webhook — raw body before express.json() ───────────────
app.post(
  `/api/${config.apiVersion}/payments/webhook`,
  express.raw({ type: "application/json" }),
  handleStripeWebhook,
);

// ─────────────── Body parsing ───────────────
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));
app.use(cookieParser());

// ─────────────── Security middleware ───────────────
app.use(mongoSanitizeMiddleware());
app.use(hpp());
app.use(compression({ level: 6, threshold: 1024 }));

// ─────────────── HTTP access logging (Morgan) ───────────────
morgan.token("id", (req) => req.id);
app.use(
  morgan(
    config.nodeEnv === "production"
      ? ":id :method :url :status :response-time ms - :res[content-length]"
      : "dev",
  ),
);

// ─────────────── Global rate limiter ───────────────
app.use("/api", rateLimiter);
app.use("/api", csrfProtection);

// ─────────────── Performance monitoring middleware ───────────────
if (config.performance.enableMonitoring) {
  app.use((req, res, next) => {
    const startedAt = Date.now();
    res.on("finish", () => {
      const durationMs = Date.now() - startedAt;
      latencyWindow.push(durationMs);
      if (latencyWindow.length > latencyWindowSize) latencyWindow.shift();
      observedRequestCount += 1;

      if (durationMs >= config.performance.slowRouteThresholdMs) {
        logger.warn(
          `[PERF][SLOW_ROUTE] ${req.method} ${req.originalUrl} ${durationMs}ms status=${res.statusCode} requestId=${req.id}`,
        );
      }

      if (observedRequestCount % latencyReportEvery === 0) {
        const p95 = getPercentile(latencyWindow, 95);
        const avg = Math.round(
          latencyWindow.reduce((sum, v) => sum + v, 0) / latencyWindow.length,
        );
        logger.info(
          `[PERF][ROUTE_METRICS] window=${latencyWindow.length} avg=${avg}ms p95=${p95}ms`,
        );
      }
    });
    next();
  });
}

// ─────────────── Info / health endpoints ───────────────
app.get("/", (_req, res) => {
  res.status(200).json(
    createSuccessEnvelope({
      data: {
        version: "1.0.0",
        documentation: `/api/${config.apiVersion}/docs`,
        health: `/api/${config.apiVersion}/health`,
      },
      message: "Enterprise E-commerce API",
    }),
  );
});

app.get(`/api/${config.apiVersion}/health`, (_req, res) => {
  const memoryUsage = process.memoryUsage();
  const dbState = mongoose.connection.readyState;
  const dbStatusMap = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting",
  };
  res.status(200).json(
    createSuccessEnvelope({
      data: {
        environment: config.nodeEnv,
        version: "1.0.0",
        uptime: Math.round(process.uptime()),
        memory: {
          rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
          heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
          heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
        },
        database: { status: dbStatusMap[dbState] || "unknown" },
      },
      message: "Server is running",
    }),
  );
});

// ─────────────── API routes ───────────────
for (const route of apiRouteRegistry) {
  app.use(`/api/${config.apiVersion}${route.path}`, route.router);
}

// ─────────────── Static files ───────────────
const staticHeaders = (req, res, next) => {
  const requestOrigin = req.headers.origin;
  const allowedOrigin =
    requestOrigin && config.frontendOrigins.includes(requestOrigin)
      ? requestOrigin
      : config.frontendOrigins[0];

  res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
  res.setHeader("Access-Control-Allow-Methods", "GET");
  res.setHeader("Vary", "Origin");
  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
  res.setHeader("Cache-Control", "public, max-age=604800, immutable");
  next();
};

app.use(
  "/uploads",
  staticHeaders,
  express.static(path.resolve(__dirname, "../uploads"), { maxAge: "7d" }),
);
app.use(
  "/images",
  staticHeaders,
  express.static(frontendPublicImagesPath, { maxAge: "7d" }),
  express.static(projectImagesPath, { maxAge: "7d" }),
);

// ─────────────── Error handling ───────────────
app.use(notFound);
app.use(errorHandler);

export default app;
