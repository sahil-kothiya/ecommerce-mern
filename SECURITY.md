# Security Policy

## Supported Versions

Only the latest release on the `main` branch receives security updates. Older tagged releases are not patched.

| Version         | Supported |
| --------------- | --------- |
| Latest (`main`) | ✅ Yes    |
| Older releases  | ❌ No     |

---

## Reporting a Vulnerability

**Do NOT open a public GitHub Issue for security vulnerabilities.**

Publicly disclosing a security issue before a fix is available puts all users at risk. Instead, please report vulnerabilities privately.

### How to report

Email the security team at: **sahilk.itpath@gmail.com**

Use the subject line: `[SECURITY] Brief description of the vulnerability`

### What to include in your report

To help us triage and fix the issue quickly, please include:

1. **Description** — A clear explanation of the vulnerability
2. **Affected component** — Backend API? Frontend? Auth flow? Payment?
3. **Steps to reproduce** — Exact steps to trigger the vulnerability
4. **Proof of concept** — Code snippet, curl command, or screenshot if possible
5. **Potential impact** — What could an attacker do? Data exposure? Account takeover? Privilege escalation?
6. **Suggested fix** — If you have one (optional but appreciated)

### Response timeline

| Stage                   | Timeline                      |
| ----------------------- | ----------------------------- |
| Initial acknowledgement | Within 48 hours               |
| Status update           | Within 7 days                 |
| Fix deployment          | Based on severity (see below) |

### Severity-based fix timeline

| Severity                 | Fix Target           |
| ------------------------ | -------------------- |
| Critical (CVSS 9.0–10.0) | Within 48 hours      |
| High (CVSS 7.0–8.9)      | Within 7 days        |
| Medium (CVSS 4.0–6.9)    | Within 30 days       |
| Low (CVSS 0.1–3.9)       | Next regular release |

---

## Security Measures in This Project

The following security controls are implemented:

### Authentication & Authorization

- **JWT with HTTP-only cookies** — Tokens are never stored in `localStorage`; `httpOnly` and `sameSite: strict` flags prevent XSS and CSRF token theft
- **Refresh token rotation** — Every token refresh issues a new refresh token and invalidates the old one, preventing replay attacks
- **Role-based access control (RBAC)** — Admin routes are protected with `authorize('admin')` middleware; all role checks happen server-side
- **Password hashing** — Passwords are hashed with `bcryptjs` at salt rounds ≥ 12 before storage

### Input Validation & Sanitization

- **express-validator** — All API request bodies and query parameters are validated with strict rule sets before reaching controllers
- **express-mongo-sanitize** — User-supplied data is sanitized to prevent MongoDB operator injection (`$where`, `$gt`, etc.)
- **hpp (HTTP Parameter Pollution)** — Duplicate query string parameters are stripped to prevent HPP attacks
- **JSON body size limit** — Set to 1 MB to prevent request flooding

### Transport & Headers

- **Helmet.js** — Sets security-related HTTP headers (HSTS, X-Frame-Options, X-Content-Type-Options, CSP, etc.)
- **CORS whitelist** — Only the configured `FRONTEND_URL` is allowed as an origin; wildcard `*` is never used
- **HTTPS-only in production** — TLS is enforced at the deployment platform level

### Rate Limiting

- **Global rate limiter** — 100 requests per 15-minute window on all `/api` routes
- **Auth-specific rate limiters:** Login (10/window), refresh (20/window), forgot-password (5/window), reset-password (10/window)
- Prevents brute-force attacks on login and password reset flows

### CSRF Protection

- **Double-submit cookie pattern** — A CSRF token is issued via `GET /api/auth/csrf-token` and must be included in the `X-CSRF-Token` header for all state-changing requests
- Token is validated by the `csrfProtection` middleware applied to all `/api` routes

### Payment Security

- **Stripe webhook signature verification** — All incoming Stripe webhook payloads are verified using `stripe.webhooks.constructEvent()` with the `STRIPE_WEBHOOK_SECRET` before processing
- **Raw body preserved** — The webhook route registers before `express.json()` to ensure raw body integrity for signature verification
- **Payment intent model** — Charges are never created directly; Stripe PaymentIntents are used so the client never touches card data

### File Uploads

- **Multer file type validation** — Only `jpg`, `jpeg`, `png`, `gif`, and `webp` files are accepted
- **File size limit** — Configurable via `MAX_FILE_SIZE` env var (default 5 MB per file)
- **Renamed files** — Uploaded files are stored with UUIDs, not original filenames, preventing path traversal

### Logging & Monitoring

- **Winston logger** — Structured JSON logs; no sensitive data (passwords, tokens) is ever logged
- **Stack traces hidden from clients** — Production error responses use generic messages; full error detail is only logged server-side

---

## Known Limitations

The following areas are known to be imperfect and are being actively improved:

- **Email notifications** — Nodemailer SMTP is implemented but not tested against all providers. Misconfigured SMTP credentials will cause silent failures on password-reset flows.
- **File storage** — Uploads are stored on local disk. This does not scale horizontally. For production, files should be moved to S3 or equivalent object storage.
- **Redis dependency** — The Bull job queue requires Redis. Without it, background jobs (email, rating recalculation) fail silently. A fallback in-process queue is not currently implemented.
- **OAuth** — Google and Facebook OAuth config keys exist in the codebase but the OAuth flow is not fully implemented in this release.
- **Refresh token revocation list** — Refresh tokens are currently stored in the User document. There is no centralized revocation list; a compromised refresh token remains valid until it expires or the user logs out.

---

## Security Hall of Fame

If you responsibly disclose a valid security issue, we will acknowledge you here (with your permission).

_No disclosures yet._
