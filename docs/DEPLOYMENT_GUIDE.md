# Deployment Guide

## Prerequisites
- Node.js 18+
- MongoDB instance
- Process manager (PM2/systemd/container platform)
- Reverse proxy/SSL termination (Nginx or platform-managed)

## 1. Build and Validate
```bash
npm ci
npm run lint
npm test
npm run build
```

## 2. Configure Environment
- Backend: set variables from `docs/ENVIRONMENT_MATRIX.md`
- Frontend: set `VITE_API_BASE_URL` to deployed API origin
- Ensure production secrets are strong and unique

## 3. Database Preparation
- Confirm DB backup/snapshot exists
- Run required seed/migration scripts intentionally
```bash
npm run seed
```

## 4. Deploy Backend
```bash
cd backend
npm run start
```

## 5. Deploy Frontend
- Serve `frontend/dist` from static host or CDN.
- Ensure SPA fallback routing is enabled.

## 6. Post-Deploy Checks
- `GET /health` returns success
- Login works
- Product listing works
- Checkout order creation works
- Admin order status update works

## 7. Rollback Procedure
1. Re-point traffic to previous stable backend/frontend artifact.
2. If schema changed, execute documented rollback plan.
3. Verify `/health` and checkout smoke tests.
4. Announce rollback and open incident review.
