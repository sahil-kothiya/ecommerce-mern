# Environment Variable Matrix

## Backend (`backend/.env`)

| Variable | Required | Example | Notes |
|---|---|---|---|
| `NODE_ENV` | Yes | `development` | `development` or `production` |
| `PORT` | Yes | `5001` | Backend listen port |
| `API_URL` | Yes | `http://localhost:5001` | Public API base URL |
| `MONGODB_URI` | Yes | `mongodb://localhost:27017/enterprise-ecommerce` | Primary DB connection |
| `FRONTEND_URL` | Yes | `http://localhost:5173` | CORS allowlist target |
| `JWT_SECRET` | Yes | `<secure-32+-chars>` | Never use defaults in production |
| `JWT_EXPIRE` | Yes | `15m` | Access token TTL |
| `JWT_REFRESH_SECRET` | Yes | `<secure-32+-chars>` | Refresh token secret |
| `JWT_REFRESH_EXPIRE` | Yes | `30d` | Refresh token TTL |
| `ADMIN_EMAIL` | Yes | `admin@example.com` | Seeder/admin bootstrap |
| `ADMIN_PASSWORD` | Yes | `<strong-password>` | Must not be default in production |
| `RATE_LIMIT_WINDOW_MS` | No | `900000` | Request throttling window |
| `RATE_LIMIT_MAX_REQUESTS` | No | `100` | Request throttling max |
| `LOG_LEVEL` | No | `info` | Logging verbosity |
| `SMTP_*` | Optional | SMTP values | Required for real email flow |
| `STRIPE_*` | Optional | Stripe keys | Required for Stripe checkout |
| `PAYPAL_*` | Optional | PayPal keys | Required for PayPal checkout |
| `GOOGLE_*` | Optional | OAuth keys | Required for Google OAuth |
| `FACEBOOK_*` | Optional | OAuth keys | Required for Facebook OAuth |

## Frontend (`frontend/.env`)

| Variable | Required | Example | Notes |
|---|---|---|---|
| `VITE_API_BASE_URL` | Yes | `http://localhost:5001` | Frontend API base |
| `VITE_APP_NAME` | No | `Enterprise Ecommerce` | UI branding |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Optional | `pk_test_xxx` | Stripe client key |
| `VITE_PAYPAL_CLIENT_ID` | Optional | `xxx` | PayPal client id |
| `VITE_GOOGLE_CLIENT_ID` | Optional | `xxx.apps.googleusercontent.com` | OAuth client id |
| `VITE_FACEBOOK_APP_ID` | Optional | `xxx` | OAuth app id |

## Validation Rules
- Never commit real secrets.
- Ensure backend `FRONTEND_URL` matches deployed frontend origin.
- Ensure frontend `VITE_API_BASE_URL` targets deployed backend URL.
- In production, enforce non-default JWT/admin secrets.
