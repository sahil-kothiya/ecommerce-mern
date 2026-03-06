# Backend Technical Documentation

## 1. Overview

The backend is a Node.js/Express REST API server for an enterprise e-commerce platform. It follows a strict **Routes → Controllers → Services → Models** architecture. Business logic lives exclusively in services; controllers are thin HTTP delegates. All code is ESM (`import/export`), async/await only.

- **Runtime:** Node.js 25.6+ on port 5001
- **Database:** MongoDB 6+ via Mongoose 8 (strict schemas, lean queries)
- **Auth:** JWT (access + refresh token pair) in HTTP-only cookies
- **Payments:** Stripe PaymentIntents with webhook signature verification
- **Queues:** Bull (Redis-backed) for background email and ratings jobs
- **Logging:** Winston structured JSON logs

---

## 2. Technology Stack

| Package | Version | Role |
|---------|---------|------|
| `express` | 5.2.1 | HTTP framework (ESM, async error propagation) |
| `mongoose` | 8.23.0 | MongoDB ODM — strict schemas, lean queries, transactions |
| `jsonwebtoken` | 9.0.3 | JWT signing and verification (access + refresh) |
| `bcryptjs` | 2.4.3 | Password hashing (salt rounds: 12) |
| `stripe` | 17.2.1 | Stripe PaymentIntents and webhook verification |
| `bull` | 4.12.0 | Redis-backed job queue for async tasks |
| `nodemailer` | 7.0.13 | SMTP email dispatch (password reset, order emails) |
| `multer` | 1.4.5-lts.1 | Multipart file upload handling |
| `express-validator` | 7.2.0 | Request validation rule chains |
| `helmet` | 8.0.0 | Security HTTP headers |
| `cors` | 2.8.6 | Cross-origin resource sharing with whitelist |
| `express-rate-limit` | 7.5.1 | Rate limiting — global + per-route auth limiters |
| `express-mongo-sanitize` | 2.2.0 | NoSQL injection prevention |
| `hpp` | 0.2.3 | HTTP Parameter Pollution prevention |
| `compression` | 1.7.4 | Gzip response compression (level 6, threshold 1 KB) |
| `cookie-parser` | 1.4.7 | Parse HTTP cookies |
| `uuid` | 11.0.2 | UUID generation for idempotency keys |
| `slugify` | 1.6.6 | Auto-generate URL-safe slugs |
| `winston` | 3.15.0 | Structured logging to console and files |
| `dotenv` | 17.3.1 | `.env` file loading |
| `nodemon` | 3.1.14 | (dev) Auto-restart on file change |
| `jest` | 29.7.0 | (dev) Test runner |
| `supertest` | 7.2.2 | (dev) HTTP assertion for integration tests |
| `@faker-js/faker` | 10.3.0 | (dev) Realistic seed data generation |

---

## 3. Folder Structure

```
backend/
├── src/
│   ├── server.js              # HTTP server entry point; graceful shutdown
│   ├── app.js                 # Express app init; middleware chain; route mounting
│   ├── config/
│   │   ├── index.js           # All env vars parsed, defaulted, and exported as `config`
│   │   └── database.js        # Mongoose connection — pooling, slow query monitoring
│   ├── constants/
│   │   └── index.js           # Enums: roles, order statuses, file types, regex patterns
│   ├── core/
│   │   ├── BaseController.js  # sendSuccess(), sendError(), parsePagination(), setCookie()
│   │   └── BaseService.js     # findAll(), findById(), create(), update(), delete(), paginate()
│   ├── controllers/           # 14 controllers — one per resource, extends BaseController
│   │   ├── AuthController.js
│   │   ├── ProductController.js
│   │   ├── OrderController.js
│   │   ├── CartController.js
│   │   ├── PaymentController.js
│   │   ├── ReviewController.js
│   │   ├── UserController.js
│   │   ├── CategoryController.js
│   │   ├── BrandController.js
│   │   ├── BannerController.js
│   │   ├── CouponController.js
│   │   ├── DiscountController.js
│   │   ├── WishlistController.js
│   │   └── SettingController.js
│   ├── services/              # 16 services — all business logic lives here
│   ├── models/                # 16 Mongoose models
│   ├── routes/                # 17 Express router files
│   ├── middleware/
│   │   ├── auth.js            # protect, authorize, authorizeOwner, optionalAuth
│   │   ├── errorHandler.js    # AppError class, notFound, global error handler
│   │   ├── rateLimiter.js     # Global + auth-specific rate limiters
│   │   ├── csrf.js            # CSRF double-submit cookie protection
│   │   ├── cache.js           # In-memory response caching middleware
│   │   ├── mongoSanitize.js   # express-mongo-sanitize wrapper
│   │   ├── uploadEnhanced.js  # Multer config with file type/size validation
│   │   └── validation.js      # validate() — runs express-validator and sends errors
│   ├── validators/            # express-validator rule chains per resource
│   ├── utils/
│   │   ├── logger.js          # Winston logger instance
│   │   └── ...                # Email helpers, pricing utils, response formatter
│   └── queues/
│       ├── index.js           # Queue factory and registration
│       ├── emailQueue.js      # Email job definitions
│       ├── ratingsQueue.js    # Product rating recalculation jobs
│       └── worker.js          # Standalone worker process (run with npm run queue:start)
├── scripts/
│   ├── migrate-coupons-canonical.js  # One-off coupon schema migration
│   └── optimize-production.js        # DB index optimization script
├── seeders/                   # Faker-based seed data generators per model
├── seeder.js                  # CLI entry: node seeder.js --import | --destroy
├── uploads/                   # Local file storage (banners/ brands/ categories/ products/ users/)
└── logs/                      # Winston log output
```

---

## 4. Environment Variables

| Variable | Default | Required | Description |
|----------|---------|----------|-------------|
| `NODE_ENV` | `development` | No | Runtime environment |
| `PORT` | `5001` | No | API server port |
| `MONGODB_URI` | — | **Yes** | MongoDB connection string |
| `JWT_SECRET` | — | **Yes** | Access token signing secret (32+ chars) |
| `JWT_EXPIRE` | `7d` | No | Access token lifespan |
| `JWT_REFRESH_SECRET` | — | **Yes** | Refresh token signing secret |
| `JWT_REFRESH_EXPIRE` | `30d` | No | Refresh token lifespan |
| `FRONTEND_URL` | `http://localhost:5173` | **Yes** | CORS allowed origin |
| `STRIPE_SECRET_KEY` | — | Yes (payments) | Stripe secret key |
| `STRIPE_PUBLISHABLE_KEY` | — | Yes (payments) | Stripe publishable key |
| `STRIPE_WEBHOOK_SECRET` | — | Yes (webhooks) | Stripe webhook endpoint secret |
| `SMTP_HOST` | `smtp.gmail.com` | No | SMTP server hostname |
| `SMTP_PORT` | `587` | No | SMTP server port |
| `SMTP_USER` | — | No | SMTP username |
| `SMTP_PASSWORD` | — | No | SMTP password |
| `EMAIL_FROM` | `noreply@example.com` | No | Sender email address |
| `REDIS_URL` | `redis://localhost:6379` | No (queues need it) | Redis connection URL |
| `ADMIN_EMAIL` | `admin@enterprise-ecommerce.com` | No | Seeder admin email |
| `ADMIN_PASSWORD` | `admin123!` | No | Seeder admin password |
| `RATE_LIMIT_WINDOW_MS` | `900000` | No | Rate limit window in ms (15 min) |
| `RATE_LIMIT_MAX_REQUESTS` | `100` | No | Max requests per window |
| `AUTH_RATE_LIMIT_LOGIN_MAX` | `10` | No | Max login attempts per window |
| `AUTH_RATE_LIMIT_REFRESH_MAX` | `20` | No | Max refresh attempts per window |
| `AUTH_RATE_LIMIT_FORGOT_PASSWORD_MAX` | `5` | No | Max forgot-password attempts |
| `AUTH_RATE_LIMIT_RESET_PASSWORD_MAX` | `10` | No | Max reset-password attempts |
| `MAX_FILE_SIZE` | `5242880` | No | File upload size limit in bytes |
| `UPLOAD_PATH` | `uploads` | No | Upload directory relative path |
| `SLOW_ROUTE_THRESHOLD_MS` | `800` | No | Slow route warning threshold |
| `SLOW_QUERY_THRESHOLD_MS` | `300` | No | Slow query warning threshold |

---

## 5. Database Models

### User

| Field | Type | Constraints |
|-------|------|-------------|
| `name` | String | required, 2–50 chars, trim |
| `email` | String | required, unique, lowercase, trim |
| `phone` | String | trim |
| `password` | String | select:false, min 8 chars (local auth only) |
| `role` | String | enum: `admin` \| `user`, default: `user` |
| `photo` | String | — |
| `status` | String | enum: `active` \| `inactive`, default: `active` |
| `provider` | String | enum: `local` \| `google` \| `facebook` \| `github` |
| `passwordResetToken` | String | select:false |
| `passwordResetExpires` | Date | select:false |
| `refreshToken` | String | select:false |
| `addresses` | [AddressSchema] | max 10, embedded subdoc |
| `preferences.savedFilters` | Array | max 20 saved filter presets |
| `preferences.recentSearches` | Array | max 20 recent searches |

**Pre-save hook:** bcrypt hash password at salt rounds 12 if modified.
**Instance method:** `comparePassword(candidate)` — returns boolean.
**Indexes:** `email` (unique), `status`, `role`.

---

### Product

| Field | Type | Details |
|-------|------|---------|
| `title` | String | required, 3–200 chars |
| `slug` | String | unique, auto-generated from title |
| `summary` | String | max 500 |
| `description` | String | HTML allowed |
| `status` | String | enum: `active` \| `inactive` \| `draft` |
| `isFeatured` | Boolean | default: false |
| `hasVariants` | Boolean | default: false |
| `basePrice` | Number | used when hasVariants is false |
| `stock` | Number | used when hasVariants is false |
| `images` | [ImageSchema] | path, isPrimary, sortOrder, altText |
| `variants` | [VariantSchema] | sku, displayName, price, stock, options[], status |
| `category` | ObjectId | ref: Category |
| `brand` | ObjectId | ref: Brand |
| `tags` | [String] | — |
| `averageRating` | Number | default: 0, recalculated via queue |
| `reviewCount` | Number | default: 0 |
| `condition` | String | enum: `default` \| `new` \| `hot` |

**Indexes:** `slug` (unique), `status`, `category`, `brand`, `isFeatured`, `hasVariants`, `averageRating`, `basePrice`, compound `{category, status}`, compound `{brand, status}`.
**Pre-save hook:** auto-generates unique slug from title using slugify.

---

### Order

| Field | Type | Details |
|-------|------|---------|
| `orderNumber` | String | unique, UUID-based |
| `user` | ObjectId | ref: User |
| `items` | [OrderItemSchema] | productId, variantId, title, sku, price, quantity, amount |
| `shippingAddress` | Object | snapshot of address at order time |
| `status` | String | enum: `pending` \| `processing` \| `shipped` \| `delivered` \| `cancelled` \| `refunded` |
| `paymentStatus` | String | enum: `pending` \| `paid` \| `failed` \| `refunded` |
| `paymentMethod` | String | `stripe` \| `paypal` |
| `paymentIntentId` | String | Stripe PaymentIntent ID |
| `subtotal` | Number | sum of item amounts |
| `discount` | Number | coupon discount amount |
| `shippingCost` | Number | — |
| `tax` | Number | — |
| `total` | Number | final amount charged |
| `couponCode` | String | applied coupon code |
| `returnRequests` | [ReturnRequestSchema] | reason, notes, items, status, requestedAt |
| `notes` | String | customer notes |

**Indexes:** `user`, `status`, `paymentStatus`, `createdAt`.
**Auto-generates:** `orderNumber` using UUID v4 prefix.

---

### Cart

| Field | Type | Details |
|-------|------|---------|
| `user` | ObjectId | ref: User, unique index |
| `items` | [CartItemSchema] | productId, variantId, quantity, price snapshot |

---

### Review

| Field | Type | Details |
|-------|------|---------|
| `user` | ObjectId | ref: User |
| `product` | ObjectId | ref: Product |
| `order` | ObjectId | ref: Order |
| `rating` | Number | required, 1–5 |
| `comment` | String | max 1000 |

**Unique compound index:** `{user, product}` — one review per user per product.
**Indexes:** `product`, `user`, `rating`.

---

### Category

| Field | Type | Details |
|-------|------|---------|
| `name` | String | required, unique |
| `slug` | String | unique, auto-generated |
| `description` | String | — |
| `image` | String | image path |
| `parent` | ObjectId | ref: Category (null for root) |
| `sortOrder` | Number | for ordering in tree |
| `status` | String | enum: `active` \| `inactive` |

---

### Brand

| Field | Type | Details |
|-------|------|---------|
| `name` | String | required, unique |
| `slug` | String | unique |
| `description` | String | — |
| `logo` | String | image path |
| `status` | String | enum: `active` \| `inactive` |

---

### Banner

| Field | Type | Details |
|-------|------|---------|
| `title` | String | required |
| `subtitle` | String | — |
| `image` | String | required, image path |
| `link` | String | click-through URL |
| `position` | Number | sort order in carousel |
| `isActive` | Boolean | default: true |

---

### Coupon

| Field | Type | Details |
|-------|------|---------|
| `code` | String | required, unique, uppercase |
| `type` | String | enum: `percentage` \| `fixed` |
| `value` | Number | discount value |
| `minOrderValue` | Number | minimum order total to apply |
| `maxDiscount` | Number | cap for percentage coupons |
| `usageLimit` | Number | total redemptions allowed |
| `perUserLimit` | Number | redemptions per user |
| `usedCount` | Number | current total redemptions |
| `expiresAt` | Date | — |
| `isActive` | Boolean | default: true |
| `usedBy` | [{ userId, usedAt }] | usage tracking |

---

### Discount

| Field | Type | Details |
|-------|------|---------|
| `product` | ObjectId | ref: Product |
| `type` | String | enum: `percentage` \| `fixed` |
| `value` | Number | — |
| `startDate` | Date | — |
| `endDate` | Date | — |
| `isActive` | Boolean | default: true |

---

### Wishlist

| Field | Type | Details |
|-------|------|---------|
| `user` | ObjectId | ref: User, unique |
| `products` | [ObjectId] | ref: Product |

---

### Setting

| Field | Type | Details |
|-------|------|---------|
| `key` | String | unique setting key |
| `value` | Mixed | setting value |
| `group` | String | settings group (general, payment, etc.) |

---

### VariantType

| Field | Type | Details |
|-------|------|---------|
| `name` | String | internal name (e.g., `color`) |
| `displayName` | String | display name (e.g., `Color`) |
| `inputType` | String | `color` \| `select` \| `radio` |
| `status` | String | `active` \| `inactive` |

---

### VariantOption

| Field | Type | Details |
|-------|------|---------|
| `typeId` | ObjectId | ref: VariantType |
| `value` | String | internal value (lowercase) |
| `displayValue` | String | display value |
| `hexColor` | String | optional hex color code |
| `status` | String | `active` \| `inactive` |

---

## 6. Middleware Chain

Middleware executes in this order on every request:

```
1. helmet()                    → Security HTTP headers
2. mongoSanitizeMiddleware()   → Strip MongoDB operators from input
3. hpp()                       → Deduplicate query string parameters
4. cors()                      → Check Origin against FRONTEND_URL whitelist
5. express.raw()               → Stripe webhook route only (before json parser)
6. express.json({ limit:'1mb' }) → Parse JSON body
7. express.urlencoded()        → Parse URL-encoded bodies
8. cookieParser()              → Parse cookie header
9. compression()               → Gzip response bodies > 1 KB
10. rateLimiter                → Global 100 req/15min on /api/* routes
11. csrfProtection             → Validate X-CSRF-Token on state-changing requests
12. [optional] request logger  → Log method + path (development only)
13. [optional] latency monitor → Track P50/P95/P99 latency
14. Route handlers             → auth.js, route-specific middleware, controllers
15. notFound()                 → 404 handler
16. errorHandler()             → Centralized error formatter — sends AppError responses
```

---

## 7. Authentication Flow

### Register
1. `POST /api/auth/register` → `authRateLimiter` → `registerValidator` → `validate` → `AuthController.register`
2. `AuthService.register` checks email uniqueness
3. Creates User (password hashed via pre-save hook)
4. Issues access token (JWT, `config.jwt.expire`) + refresh token (longer-lived)
5. Sets `accessToken` and `refreshToken` HTTP-only cookies
6. Returns user object (without sensitive fields)

### Login
1. `POST /api/auth/login` → `authRateLimiter` → `loginValidator` → `validate` → `AuthController.login`
2. `AuthService.login` finds user by email, calls `user.comparePassword()`
3. On success, generates new access + refresh tokens
4. Stores hashed refresh token on user document
5. Sets cookies; returns user object

### Token Refresh
1. `POST /api/auth/refresh-token` → `authRefreshRateLimiter` → `AuthController.refreshToken`
2. Reads `refreshToken` cookie → verifies JWT signature
3. Looks up user by ID from decoded payload → verifies stored token hash matches
4. **Rotation:** new refresh token issued, old one invalidated on user document
5. New access + refresh cookies set

### Protected Routes
- `protect` middleware extracts access token from cookie or `Authorization: Bearer` header
- Verifies JWT, fetches user from DB (selects only `name email role status`)
- Attaches `req.user`; rejects expired/invalid tokens with 401

---

## 8. API Endpoints — Complete Reference

### Auth Routes — `/api/auth`

| Method | Path | Middleware | Description |
|--------|------|-----------|-------------|
| `POST` | `/register` | authRateLimit, registerValidator | Register new user |
| `GET` | `/csrf-token` | — | Issue CSRF token |
| `POST` | `/login` | authRateLimit, loginValidator | Login |
| `POST` | `/logout` | protect | Clear cookies |
| `POST` | `/refresh-token` | authRefreshRateLimit | Rotate refresh token |
| `GET` | `/me` | protect | Current user profile |
| `PUT` | `/profile` | protect | Update name/photo |
| `PUT` | `/password` | protect | Change password |
| `POST` | `/forgot-password` | authForgotRateLimit, emailValidator | Send reset email |
| `POST` | `/reset-password/:token` | authResetRateLimit, resetPasswordValidator | Reset password |
| `POST` | `/addresses` | protect, createAddressValidator | Add address |
| `PUT` | `/addresses/:id` | protect, createAddressValidator, addressIdValidator | Update address |
| `DELETE` | `/addresses/:id` | protect, addressIdValidator | Delete address |
| `PUT` | `/addresses/:id/default` | protect, addressIdValidator | Set default address |
| `PUT` | `/search-preferences` | protect, updateSearchPreferencesValidator | Save filter preset |

### Product Routes — `/api/products`

| Method | Path | Middleware | Description |
|--------|------|-----------|-------------|
| `GET` | `/` | optionalAuth, cache(30s) | List products with filters |
| `GET` | `/featured` | cache(120s) | Featured products |
| `GET` | `/search` | cache(30s) | Keyword search |
| `GET` | `/admin/:id` | protect, authorize('admin') | Admin product detail |
| `GET` | `/:slug` | optionalAuth, cache(60s) | Public product detail |
| `POST` | `/` | protect, authorize('admin'), upload, handleUploadError | Create product |
| `PUT` | `/:id` | protect, authorize('admin'), upload, handleUploadError | Update product |
| `DELETE` | `/:id` | protect, authorize('admin') | Delete product |

**Product list query parameters:**
`page`, `limit`, `sort` (price_asc, price_desc, rating, newest, featured), `category`, `brand`, `minPrice`, `maxPrice`, `status`, `hasVariants`, `isFeatured`, `tags`, `search`

### Admin Product Routes — `/api/admin/products`

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | Paginated product list with admin filters |
| `GET` | `/:id` | Admin product detail with full variant/pricing data |
| `DELETE` | `/:id/images/:imageId` | Delete a single product image |

### Order Routes — `/api/orders`

| Method | Path | Middleware | Description |
|--------|------|-----------|-------------|
| `POST` | `/` | protect, createOrderValidator | Place order |
| `GET` | `/` | protect, orderQueryValidator | User order list |
| `GET` | `/returns` | protect | User return requests |
| `GET` | `/admin/summary` | protect, authorize('admin') | Revenue/stats summary |
| `GET` | `/admin/all` | protect, authorize('admin'), orderQueryValidator | All orders (admin) |
| `GET` | `/:id` | protect, orderIdValidator | Single order |
| `POST` | `/:id/reorder` | protect, orderIdValidator | Reorder |
| `POST` | `/:id/returns` | protect, returnRequestValidator | Submit return |
| `PUT` | `/:id/status` | protect, authorize('admin'), updateOrderStatusValidator | Update order status |

### Cart Routes — `/api/cart`

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | Get user's cart |
| `POST` | `/` | Add item (productId, variantId?, quantity) |
| `PUT` | `/:id` | Update item quantity |
| `DELETE` | `/:id` | Remove item |
| `DELETE` | `/` | Clear cart |

### Payment Routes — `/api/payments`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/config` | No | Get Stripe publishable key |
| `POST` | `/create-intent` | Yes | Create PaymentIntent |
| `POST` | `/webhook` | Stripe sig | Stripe event webhook |

### Review Routes — `/api/reviews`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/product/:productId` | No | Product reviews |
| `POST` | `/` | Yes | Submit review |
| `DELETE` | `/:id` | Admin | Delete review |

### Category Routes — `/api/categories`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/` | No | All categories (tree) |
| `GET` | `/:id` | No | Single category |
| `POST` | `/` | Admin | Create category (image upload) |
| `PUT` | `/:id` | Admin | Update category |
| `DELETE` | `/:id` | Admin | Delete category |
| `PUT` | `/reorder` | Admin | Bulk reorder |

### Brand Routes — `/api/brands`

Full CRUD at `/api/brands` — admin-protected create/update (logo upload)/delete.

### Banner Routes — `/api/banners`

Full CRUD at `/api/banners` — admin-protected create/update (image upload)/delete.

### Coupon Routes — `/api/coupons`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/` | Admin | List coupons |
| `POST` | `/` | Admin | Create coupon |
| `PUT` | `/:id` | Admin | Update coupon |
| `DELETE` | `/:id` | Admin | Delete coupon |
| `POST` | `/validate` | Yes | Validate + get discount amount |

### Discount Routes — `/api/discounts`

Full CRUD at `/api/discounts` — admin-protected. Applied to products.

### Wishlist Routes — `/api/wishlist`

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | Get wishlist |
| `POST` | `/` | Add product |
| `DELETE` | `/:productId` | Remove product |

### User Routes — `/api/users`

Admin-only: list users, get user by ID, update user status.

### Settings Routes — `/api/settings`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/` | No | Get public settings |
| `PUT` | `/` | Admin | Batch update settings |

### Variant Type Routes — `/api/variant-types`

Full CRUD — admin-protected.

### Variant Option Routes — `/api/variant-options`

Full CRUD — admin-protected.

---

## 9. Feature Flows

### Order Placement Flow

```
POST /api/orders
  │
  ├── 1. protect middleware — verify JWT, attach req.user
  ├── 2. createOrderValidator — validate body (addressId, items, couponCode?)
  ├── 3. validate() — check for validation errors
  │
  └── OrderController.store → OrderService.createOrder
        │
        ├── 4. Load user's cart or use provided items
        ├── 5. Validate stock availability for each item (DB read)
        ├── 6. Validate coupon (if provided) — check expiry, usage limits, min order
        ├── 7. Calculate totals: subtotal, discount, shipping, tax, total
        ├── 8. Start MongoDB session + transaction
        │     ├── 8a. Create Order document
        │     ├── 8b. Deduct stock from Product variants (atomic $inc)
        │     ├── 8c. Increment coupon usedCount (if coupon used)
        │     └── 8d. Clear user's cart
        └── 9. Commit transaction — rollback on any failure
        └── 10. Dispatch order confirmation email via Bull queue
        └── 11. Return created order
```

### Stripe Payment Flow

```
1. Client: GET /api/payments/config → receives publishable key
2. Client: POST /api/payments/create-intent { orderId }
           → server creates PaymentIntent with order amount
           → returns { clientSecret }
3. Client: Stripe.js completes payment using clientSecret
4. Stripe: POST /api/payments/webhook (raw body, Stripe-Signature header)
           → stripe.webhooks.constructEvent() verifies signature
           → on payment_intent.succeeded: order.paymentStatus = 'paid'
```

### Token Refresh Flow (Frontend-Triggered)

```
1. API call returns 401
2. apiClient errorInterceptor catches 401
3. attemptTokenRefresh() — POST /auth/refresh-token (with refresh cookie)
4. If refresh succeeds: retry original request
5. If refresh fails: redirect to /login, clear localStorage auth_user
```

---

## 10. Error Handling

All errors flow through the centralized `errorHandler` middleware:

```javascript
// AppError — operational errors (known, expected)
throw new AppError('Product not found', 404)

// Async controller errors — caught by Express 5 auto-propagation
// (no asyncHandler wrapper needed with Express 5)

// Global error handler formats:
{
  success: false,
  message: "Human-readable message",
  errors: [{ field, message }] // validation errors only
  // stack trace omitted in production
}
```

**Error type handling in the global handler:**
- `AppError.isOperational = true` → send `statusCode` and `message` to client
- `CastError` (invalid MongoDB ID) → 400
- `ValidationError` (Mongoose) → 422 with field-level errors
- `11000` (duplicate key) → 409 Conflict
- `JsonWebTokenError` → 401
- `TokenExpiredError` → 401
- Everything else → 500 with generic message

---

## 11. Background Jobs

### Email Queue (`emailQueue.js`)
- **Trigger:** order placed, password reset requested
- **Job data:** `{ type, to, subject, templateData }`
- **Processing:** Nodemailer SMTP send
- **Redis required:** yes

### Ratings Queue (`ratingsQueue.js`)
- **Trigger:** review created or deleted
- **Job data:** `{ productId }`
- **Processing:** MongoDB aggregation to recalculate `averageRating` and `reviewCount` on Product
- **Why queued:** prevents write-amplification on every review submission

### Worker Process
Start independently: `npm run queue:start` → runs `src/queues/worker.js`

---

## 12. Seeder

```bash
node seeder.js --import [options]   # Seed database
node seeder.js --destroy             # Drop all seeded collections

# Options
--products N   Number of products to create (default: 1000)
--users N      Number of users (default: 100)
--orders N     Number of orders (default: 500)
--reviews N    Number of reviews (default: 600)
```

**Insertion order:** Categories → Brands → Users → Products → Orders → Reviews

All seeded products: 98% with variants (2–4 variants each), 2% without. Every product has a unique slug, at least 2 images, tags, status: active.
