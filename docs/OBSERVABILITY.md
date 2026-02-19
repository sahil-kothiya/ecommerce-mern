# Observability Plan

## Objectives
- Detect checkout-impacting issues quickly
- Reduce mean time to detect (MTTD) and recover (MTTR)
- Provide visibility into auth, API, and order flow health

## 1. Centralized Error Tracking

## Backend
- Capture unhandled exceptions and operational errors
- Include metadata: route, userId (if available), requestId, statusCode
- Forward to central sink (Sentry, Datadog, New Relic, or ELK)

## Frontend
- Capture runtime exceptions and API failures
- Include route, browser, and user session context (without PII secrets)

## 2. API Latency Dashboard

Track for key endpoints:
- `GET /health`
- `POST /api/auth/login`
- `POST /api/auth/reset-password`
- `GET /api/products`
- `POST /api/orders`
- `GET /api/orders`

Metrics:
- Request throughput
- p50/p95/p99 latency
- 4xx and 5xx rate

Alerts:
- p95 latency > 800ms for 5 minutes (critical endpoints)
- 5xx rate > 2% for 5 minutes

## 3. Auth Failure Dashboard

Metrics:
- Login attempts
- Login failures (invalid credentials)
- Token refresh failures
- Password reset requests and completion ratio
- 401 response count by route

Alerts:
- Sudden spike in 401 or login failures
- Password reset completion drops below expected baseline

## 4. Recommended Log Fields
- `timestamp`
- `level`
- `service`
- `environment`
- `requestId`
- `userId` (if available)
- `route`
- `method`
- `statusCode`
- `durationMs`
- `errorCode`

## 5. Operational Targets
- MTTD: < 10 minutes
- MTTR: < 60 minutes for checkout-impacting incidents
- Error budget: define per quarter after baseline is collected
