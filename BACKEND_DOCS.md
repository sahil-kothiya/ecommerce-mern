# Backend Documentation

## 1. Overview

The backend is a Node.js/Express REST API server powering an enterprise e-commerce platform. It follows a three-tier architecture — **Routes → Controllers → Services → Models** — with centralized error handling, JWT-based cookie authentication, role-based access control, and background job processing via Bull queues. The server runs on port 5001 and uses ESM (`import/export`) exclusively.

---

## 2. Technology Stack

| Technology             | Version     | Purpose                             |
| ---------------------- | ----------- | ----------------------------------- |
| Node.js                | 25.6.1+     | Runtime                             |
| Express                | 5.2.1       | HTTP framework                      |
| MongoDB                | 6.0+        | Document database                   |
| Mongoose               | 8.23.0      | ODM with schema validation          |
| JWT (jsonwebtoken)     | 9.0.2       | Authentication tokens               |
| bcryptjs               | 2.4.3       | Password hashing                    |
| Stripe                 | 17.2.1      | Payment processing                  |
| Bull                   | 4.12.0      | Redis-backed job queues             |
| multer                 | 1.4.5-lts.1 | File upload handling                |
| express-validator      | 7.2.0       | Request validation                  |
| helmet                 | 8.0.0       | Security headers                    |
| cors                   | 2.8.5       | Cross-origin resource sharing       |
| express-rate-limit     | 7.5.1       | Rate limiting                       |
| express-mongo-sanitize | 2.2.0       | NoSQL injection prevention          |
| hpp                    | 0.2.3       | HTTP parameter pollution prevention |
| winston                | 3.15.0      | Logging                             |
| nodemailer             | 6.10.1      | Email sending                       |
| slugify                | 1.6.6       | URL slug generation                 |
| compression            | 1.8.0       | Response compression                |
| cookie-parser          | 1.4.7       | Cookie parsing                      |
| uuid                   | 11.0.5      | Unique ID generation                |
| @faker-js/faker        | 9.4.0       | Test data seeding                   |
| dotenv                 | 16.4.7      | Environment variables               |

**Dev Dependencies:** eslint 9.39.3, jest 29.7.0, supertest 7.2.2, nodemon 3.1.14, prettier 3.8.1

---

## 3. Folder Structure

```
backend/
├── src/
│   ├── server.js              # HTTP server entry, graceful shutdown
│   ├── app.js                 # Express app setup, middleware chain, route mounting
│   ├── config/
│   │   ├── index.js           # Validated environment configuration object
│   │   └── database.js        # MongoDB connection, pooling, slow query monitoring
│   ├── constants/
│   │   └── index.js           # HTTP status codes, roles, statuses, enums, regex, messages
│   ├── core/
│   │   ├── BaseController.js  # Response helpers, pagination parsing, cookie management
│   │   └── BaseService.js     # CRUD operations, transactions, pagination, soft delete
│   ├── controllers/           # 16 controllers (HTTP request handlers)
│   ├── services/              # 13 services (business logic layer)
│   ├── models/                # 16 Mongoose models
│   ├── routes/                # 17 route files
│   ├── middleware/            # Auth, error handling, rate limiting, CSRF, uploads, validation
│   ├── validators/            # Express-validator rule sets per resource
│   ├── utils/                 # Logger, email, pricing, caching, response formatter, validators
│   ├── queues/                # Bull job queues (ratings, email, image processing)
│   └── seeders/               # Database seeding scripts
├── uploads/                   # File storage (banners, brands, categories, products, users)
├── logs/                      # Winston log files (error.log, all.log)
├── scripts/                   # Migration and optimization scripts
├── seeder.js                  # CLI seeder entry (--import / --destroy)
└── package.json
```

---

## 4. Environment Variables

All variables loaded via `dotenv` and validated at startup through `config/index.js`. Production blocks insecure JWT defaults.

| Variable                  | Default                 | Description                    |
| ------------------------- | ----------------------- | ------------------------------ |
| `NODE_ENV`                | `development`           | Environment mode               |
| `PORT`                    | `5001`                  | Server port                    |
| `API_URL`                 | —                       | Public API URL                 |
| `FRONTEND_URL`            | `http://localhost:5173` | CORS origin                    |
| `TRUST_PROXY`             | `false`                 | Express trust proxy setting    |
| `MONGODB_URI`             | —                       | MongoDB connection string      |
| `MONGODB_TEST_URI`        | —                       | Test database URI              |
| `JWT_SECRET`              | —                       | Access token signing secret    |
| `JWT_EXPIRE`              | `7d`                    | Access token expiry            |
| `JWT_REFRESH_SECRET`      | —                       | Refresh token signing secret   |
| `JWT_REFRESH_EXPIRE`      | `30d`                   | Refresh token expiry           |
| `SMTP_HOST`               | —                       | Email server host              |
| `SMTP_PORT`               | `587`                   | Email server port              |
| `SMTP_USER`               | —                       | Email username                 |
| `SMTP_PASSWORD`           | —                       | Email password                 |
| `SMTP_FROM`               | —                       | Sender email address           |
| `STRIPE_PUBLIC_KEY`       | —                       | Stripe publishable key         |
| `STRIPE_SECRET_KEY`       | —                       | Stripe secret key              |
| `STRIPE_WEBHOOK_SECRET`   | —                       | Stripe webhook signing secret  |
| `PAYPAL_CLIENT_ID`        | —                       | PayPal client ID               |
| `PAYPAL_CLIENT_SECRET`    | —                       | PayPal client secret           |
| `PAYPAL_MODE`             | `sandbox`               | PayPal environment             |
| `MAX_FILE_SIZE`           | `5242880` (5MB)         | Upload file size limit         |
| `ADMIN_EMAIL`             | —                       | Default admin email            |
| `RATE_LIMIT_WINDOW_MS`    | `900000` (15min)        | General rate limit window      |
| `RATE_LIMIT_MAX`          | `1000`                  | Max requests per window        |
| `LOG_LEVEL`               | `info`                  | Winston log level              |
| `ENABLE_MONITORING`       | `true`                  | Performance monitoring toggle  |
| `SLOW_ROUTE_THRESHOLD_MS` | `800`                   | Slow route detection threshold |
| `SLOW_QUERY_THRESHOLD_MS` | `300`                   | Slow query detection threshold |

---

## 5. Models

### User

| Field                  | Type    | Details                                                                                                   |
| ---------------------- | ------- | --------------------------------------------------------------------------------------------------------- |
| name                   | String  | required, 2–50 chars                                                                                      |
| email                  | String  | required, unique, lowercase                                                                               |
| phone                  | String  | trim                                                                                                      |
| password               | String  | select: false, required for local provider, min 8                                                         |
| role                   | String  | enum: `admin`, `user` (default: `user`)                                                                   |
| photo                  | String  | —                                                                                                         |
| status                 | String  | enum: `active`, `inactive` (default: `active`)                                                            |
| provider               | String  | enum: `local`, `google`, `facebook`, `github`                                                             |
| providerId             | String  | select: false                                                                                             |
| emailVerified          | Boolean | default: false                                                                                            |
| emailVerificationToken | String  | select: false                                                                                             |
| passwordResetToken     | String  | select: false                                                                                             |
| passwordResetExpires   | Date    | select: false                                                                                             |
| refreshToken           | String  | select: false                                                                                             |
| addresses              | Array   | embedded subdocuments (firstName, lastName, phone, address1/2, city, state, postCode, country, isDefault) |
| preferences            | Object  | savedFilters (max 20), recentSearches (max 20)                                                            |

Pre-save hook hashes password with bcrypt (salt rounds 12). Instance method `comparePassword()`.

### Product

| Field          | Type     | Details                                                                          |
| -------------- | -------- | -------------------------------------------------------------------------------- |
| title          | String   | required, 3–200 chars                                                            |
| slug           | String   | unique index                                                                     |
| summary        | String   | max 500                                                                          |
| description    | String   | —                                                                                |
| condition      | String   | enum: `default`, `new`, `hot`                                                    |
| status         | String   | enum: `active`, `inactive`, `draft`                                              |
| isFeatured     | Boolean  | default: false                                                                   |
| hasVariants    | Boolean  | default: false                                                                   |
| basePrice      | Number   | min: 0                                                                           |
| baseDiscount   | Number   | 0–100                                                                            |
| baseStock      | Number   | min: 0                                                                           |
| baseSku        | String   | uppercase, unique sparse                                                         |
| variants       | Array    | embedded (sku, displayName, price, discount, stock, status, options[], images[]) |
| images         | Array    | embedded (path, isPrimary, sortOrder, altText)                                   |
| category       | Object   | embedded (id ref Category, title, slug, path)                                    |
| brand          | Object   | embedded (id ref Brand, title, slug)                                             |
| ratings        | Object   | average, count, distribution (1–5 star counts)                                   |
| activeDiscount | Object   | embedded (discountId, type, value, startsAt, endsAt)                             |
| tags           | [String] | —                                                                                |
| viewCount      | Number   | default: 0                                                                       |
| salesCount     | Number   | default: 0                                                                       |

12+ indexes including text index on title/tags/brand/summary. Virtuals: `finalPrice`, `primaryImage`, `inStock`. Statics: `findBySlug`, `findFeatured`, `findByCategory`, `searchProducts`, `updateCategoryInfo`, `updateBrandInfo`.

### Order

| Field                                              | Type     | Details                                                          |
| -------------------------------------------------- | -------- | ---------------------------------------------------------------- |
| orderNumber                                        | String   | unique, UUID-generated                                           |
| userId                                             | ObjectId | ref: User                                                        |
| items                                              | Array    | productId, variantId, title, sku, price, quantity, amount, image |
| subTotal                                           | Number   | required                                                         |
| shippingCost                                       | Number   | default: 0                                                       |
| couponDiscount                                     | Number   | default: 0                                                       |
| totalAmount                                        | Number   | required                                                         |
| quantity                                           | Number   | required                                                         |
| firstName, lastName, email, phone                  | String   | required shipping details                                        |
| address1, address2, city, state, postCode, country | String   | shipping address                                                 |
| paymentMethod                                      | String   | enum: `cod`, `stripe`, `paypal`                                  |
| paymentStatus                                      | String   | enum: `paid`, `unpaid`                                           |
| transactionId                                      | String   | —                                                                |
| idempotencyKey                                     | String   | unique sparse (userId compound)                                  |
| status                                             | String   | enum: `new`, `process`, `delivered`, `cancelled`                 |
| couponCode                                         | String   | —                                                                |
| notes                                              | String   | —                                                                |
| trackingNumber                                     | String   | —                                                                |
| returnRequests                                     | Array    | reason, notes, status, items[], requestedAt                      |

### Category

| Field               | Type       | Details                           |
| ------------------- | ---------- | --------------------------------- |
| title               | String     | required, 2–100 chars             |
| code                | String     | uppercase, 3 chars, unique sparse |
| slug                | String     | unique                            |
| summary             | String     | max 500                           |
| photo               | String     | —                                 |
| parentId            | ObjectId   | self-referencing                  |
| level               | Number     | default: 0                        |
| path                | String     | hierarchy path                    |
| sortOrder           | Number     | default: 0                        |
| hasChildren         | Boolean    | default: false                    |
| childrenCount       | Number     | default: 0                        |
| productsCount       | Number     | default: 0                        |
| status              | String     | enum: `active`, `inactive`        |
| isFeatured          | Boolean    | —                                 |
| isNavigationVisible | Boolean    | default: true                     |
| brandIds            | [ObjectId] | ref: Brand                        |
| filterIds           | [ObjectId] | ref: Filter                       |

Post-save/delete hooks sync parent `hasChildren`/`childrenCount`.

### Brand

| Field       | Type     | Details                    |
| ----------- | -------- | -------------------------- |
| title       | String   | required, unique           |
| slug        | String   | auto-generated             |
| status      | String   | enum: `active`, `inactive` |
| logo        | String   | —                          |
| banners     | [String] | —                          |
| description | String   | —                          |

### Cart

| Field     | Type     | Details                     |
| --------- | -------- | --------------------------- |
| userId    | ObjectId | ref: User                   |
| productId | ObjectId | ref: Product                |
| variantId | ObjectId | optional                    |
| quantity  | Number   | required, min: 1            |
| price     | Number   | —                           |
| amount    | Number   | computed (price × quantity) |

Unique compound index on userId + productId + variantId.

### Review

| Field     | Type     | Details                                          |
| --------- | -------- | ------------------------------------------------ |
| productId | ObjectId | ref: Product                                     |
| userId    | ObjectId | ref: User                                        |
| orderId   | ObjectId | ref: Order                                       |
| rating    | Number   | 1–5                                              |
| title     | String   | —                                                |
| comment   | String   | 10–1000 chars                                    |
| status    | String   | enum: `active`, `inactive`, `pending`, `deleted` |
| helpful   | Number   | default: 0                                       |

Post-save/delete hooks recalculate product ratings via aggregation pipeline.

### Coupon

| Field                        | Type   | Details                                 |
| ---------------------------- | ------ | --------------------------------------- |
| code                         | String | required, unique, uppercase, 3–20 chars |
| type                         | String | enum: `fixed`, `percent`                |
| value                        | Number | required, min: 0                        |
| minPurchase / minOrderAmount | Number | dual-synced fields                      |
| maxDiscount                  | Number | —                                       |
| usageLimit                   | Number | —                                       |
| usedCount / usageCount       | Number | dual-synced fields                      |
| startDate / validFrom        | Date   | dual-synced fields                      |
| expiryDate / validUntil      | Date   | dual-synced fields                      |
| status                       | String | enum: `active`, `inactive`              |
| description                  | String | —                                       |

Methods: `calculateDiscount(orderAmount)`, `isValid()`.

### Discount

| Field      | Type       | Details                               |
| ---------- | ---------- | ------------------------------------- |
| title      | String     | required                              |
| type       | String     | enum: `percentage`, `fixed`, `amount` |
| value      | Number     | required, min: 0                      |
| startsAt   | Date       | required                              |
| endsAt     | Date       | required                              |
| isActive   | Boolean    | default: true                         |
| categories | [ObjectId] | ref: Category                         |
| products   | [ObjectId] | ref: Product                          |
| priority   | Number     | default: 0                            |

Methods: `isCurrentlyActive()`, `calculateDiscountedPrice()`. Statics: `findActive()`, `findByProduct()`, `findByCategory()`.

### Banner

| Field                  | Type       | Details                                 |
| ---------------------- | ---------- | --------------------------------------- |
| title                  | String     | required, 2–200 chars                   |
| slug                   | String     | unique sparse                           |
| description            | String     | max 500                                 |
| image                  | String     | —                                       |
| link                   | String     | —                                       |
| linkType               | String     | —                                       |
| linkTarget             | String     | enum: `_blank`, `_self`                 |
| sortOrder              | Number     | default: 0                              |
| status                 | String     | enum: `active`, `inactive`, `scheduled` |
| startDate / endDate    | Date       | for scheduled activation                |
| clickCount / viewCount | Number     | analytics counters                      |
| discountIds            | [ObjectId] | ref: Discount                           |

Statics: `getActiveBanners()`, `getAnalytics()`, `activateScheduled()`, `deactivateExpired()`.

### Other Models

| Model             | Key Fields                                                                                                                                                                                         |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Filter**        | name (unique, lowercase), title, description, status                                                                                                                                               |
| **Setting**       | Single-document (key: `main`). Site config: name, tagline, URL, logo, favicon, emails, phone, whatsapp, address, currency, timezone, maintenance mode, SEO, social links, SMTP, Stripe/PayPal keys |
| **Shipping**      | type, price, estimatedDays, description, status, sortOrder                                                                                                                                         |
| **Wishlist**      | userId, productId. Unique compound index                                                                                                                                                           |
| **VariantType**   | name (unique, lowercase), displayName, sortOrder, status. Virtual: `options`                                                                                                                       |
| **VariantOption** | variantTypeId (ref), value (lowercase), displayValue, hexColor, sortOrder, status. Unique compound: typeId + value                                                                                 |

---

## 6. API Endpoints

### Authentication (`/api/auth`)

| Method | Path                             | Auth | Description                         |
| ------ | -------------------------------- | ---- | ----------------------------------- |
| POST   | `/register`                      | —    | Register new user                   |
| POST   | `/login`                         | —    | Login with email/password           |
| POST   | `/logout`                        | User | Revoke refresh token, clear cookies |
| POST   | `/refresh-token`                 | —    | Rotate access + refresh tokens      |
| GET    | `/csrf-token`                    | —    | Issue CSRF token cookie             |
| GET    | `/me`                            | User | Get current user profile            |
| PUT    | `/profile`                       | User | Update profile                      |
| PUT    | `/change-password`               | User | Change password                     |
| GET    | `/addresses`                     | User | List user addresses                 |
| POST   | `/addresses`                     | User | Add address                         |
| PUT    | `/addresses/:addressId`          | User | Update address                      |
| DELETE | `/addresses/:addressId`          | User | Delete address                      |
| GET    | `/preferences/product-discovery` | User | Get search preferences              |
| PUT    | `/preferences/product-discovery` | User | Update search preferences           |
| POST   | `/forgot-password`               | —    | Request password reset email        |
| POST   | `/reset-password`                | —    | Reset password with token           |

### Products (`/api/products`)

| Method | Path         | Auth     | Description                                 |
| ------ | ------------ | -------- | ------------------------------------------- |
| GET    | `/`          | Optional | List products (paginated, filtered, sorted) |
| GET    | `/featured`  | —        | Featured products (limit 10)                |
| GET    | `/search`    | —        | Text search with cursor pagination          |
| GET    | `/:slug`     | Optional | Product detail by slug                      |
| GET    | `/admin/:id` | Admin    | Product detail by ID (no status filter)     |
| POST   | `/`          | Admin    | Create product (multipart upload)           |
| PUT    | `/:id`       | Admin    | Update product (multipart upload)           |
| DELETE | `/:id`       | Admin    | Delete product                              |

### Admin Products (`/api/v1/admin/products`)

| Method | Path | Auth  | Description                          |
| ------ | ---- | ----- | ------------------------------------ |
| GET    | `/`  | Admin | Admin product listing (all statuses) |

### Categories (`/api/categories`)

| Method | Path              | Auth  | Description                    |
| ------ | ----------------- | ----- | ------------------------------ |
| GET    | `/`               | —     | Paginated category list        |
| GET    | `/tree`           | —     | Nested category tree           |
| GET    | `/flat`           | —     | Flat sorted list               |
| GET    | `/filters`        | —     | Filter definitions             |
| GET    | `/navigation`     | —     | Navigation-visible categories  |
| GET    | `/slug/:slug`     | —     | Category by slug               |
| GET    | `/:id`            | —     | Category by ID                 |
| GET    | `/:id/breadcrumb` | —     | Category breadcrumb chain      |
| GET    | `/:id/products`   | —     | Products in category           |
| GET    | `/:id/brands`     | —     | Brands in category             |
| POST   | `/`               | Admin | Create category (image upload) |
| POST   | `/reorder`        | Admin | Bulk reorder categories        |
| PUT    | `/:id`            | Admin | Update category (image upload) |
| DELETE | `/:id`            | Admin | Delete category                |

### Brands (`/api/brands`)

| Method | Path              | Auth  | Description                          |
| ------ | ----------------- | ----- | ------------------------------------ |
| GET    | `/`               | —     | List brands                          |
| GET    | `/:slug`          | —     | Brand by slug                        |
| GET    | `/:slug/products` | —     | Products under brand                 |
| POST   | `/`               | Admin | Create brand (logo + banners upload) |
| PUT    | `/:id`            | Admin | Update brand                         |
| DELETE | `/:id`            | Admin | Delete brand                         |

### Orders (`/api/orders`)

| Method | Path             | Auth  | Description                        |
| ------ | ---------------- | ----- | ---------------------------------- |
| POST   | `/`              | User  | Create order (with idempotency)    |
| GET    | `/`              | User  | User's orders (paginated)          |
| GET    | `/:id`           | User  | Single order detail                |
| GET    | `/returns`       | User  | User's return requests             |
| POST   | `/:id/reorder`   | User  | Re-add order items to cart         |
| POST   | `/:id/returns`   | User  | Request return                     |
| GET    | `/admin/summary` | Admin | Dashboard aggregation              |
| GET    | `/admin/all`     | Admin | All orders (paginated, searchable) |
| PUT    | `/:id/status`    | Admin | Update order status                |

### Cart (`/api/cart`)

Handled by `CartController` → `CartService`. Uses a flat document model (one Cart document per userId + productId + variantId combination). CartService resolves product pricing, validates stock, and builds enriched cart payloads with summary calculations.

| Method | Path   | Auth | Description                              |
| ------ | ------ | ---- | ---------------------------------------- |
| GET    | `/`    | User | Get cart with pricing calculations       |
| POST   | `/`    | User | Add to cart (stock + variant validation) |
| PUT    | `/:id` | User | Update item quantity                     |
| DELETE | `/:id` | User | Remove item                              |
| DELETE | `/`    | User | Clear cart                               |

### Wishlist (`/api/wishlist`)

Handled by `WishlistController` → `WishlistService`. Uses a flat document model (one Wishlist document per userId + productId). Move-to-cart validates stock and creates Cart entries.

| Method | Path                | Auth | Description          |
| ------ | ------------------- | ---- | -------------------- |
| GET    | `/`                 | User | Get wishlist         |
| POST   | `/`                 | User | Add to wishlist      |
| DELETE | `/:id`              | User | Remove from wishlist |
| POST   | `/:id/move-to-cart` | User | Move to cart         |
| DELETE | `/`                 | User | Clear wishlist       |

### Coupons (`/api/coupons`)

| Method | Path        | Auth  | Description                         |
| ------ | ----------- | ----- | ----------------------------------- |
| POST   | `/validate` | —     | Validate coupon code (rate-limited) |
| GET    | `/`         | Admin | List coupons                        |
| GET    | `/:id`      | Admin | Coupon detail                       |
| POST   | `/`         | Admin | Create coupon                       |
| PUT    | `/:id`      | Admin | Update coupon                       |
| DELETE | `/:id`      | Admin | Delete coupon                       |

### Reviews (`/api/reviews`)

| Method | Path                  | Auth  | Description                       |
| ------ | --------------------- | ----- | --------------------------------- |
| GET    | `/product/:productId` | —     | Product reviews                   |
| POST   | `/`                   | User  | Create review (verified purchase) |
| PUT    | `/:id`                | User  | Update review (owner)             |
| DELETE | `/:id`                | User  | Delete review (owner/admin)       |
| GET    | `/mine`               | User  | User's reviews                    |
| GET    | `/`                   | Admin | All reviews (filterable)          |
| PUT    | `/:id/status`         | Admin | Approve/reject review             |

### Banners (`/api/banners`)

| Method | Path                | Auth  | Description         |
| ------ | ------------------- | ----- | ------------------- |
| GET    | `/`                 | —     | Active banners      |
| GET    | `/:id`              | —     | Banner detail       |
| POST   | `/:id/view`         | —     | Track impression    |
| POST   | `/:id/click`        | —     | Track click         |
| GET    | `/discount-options` | Admin | Available discounts |
| GET    | `/analytics`        | Admin | Banner analytics    |
| POST   | `/`                 | Admin | Create banner       |
| PUT    | `/:id`              | Admin | Update banner       |
| DELETE | `/:id`              | Admin | Delete banner       |

### Discounts (`/api/discounts`)

| Method | Path            | Auth  | Description                    |
| ------ | --------------- | ----- | ------------------------------ |
| GET    | `/`             | —     | List discounts                 |
| GET    | `/:id`          | —     | Discount detail                |
| GET    | `/form-options` | Admin | Categories + products for form |
| POST   | `/`             | Admin | Create discount                |
| PUT    | `/:id`          | Admin | Update discount                |
| DELETE | `/:id`          | Admin | Delete discount                |

### Settings (`/api/settings`)

| Method | Path          | Auth  | Description                           |
| ------ | ------------- | ----- | ------------------------------------- |
| GET    | `/public`     | —     | Public-safe site settings             |
| GET    | `/`           | Admin | Full settings                         |
| PUT    | `/`           | Admin | Update settings (logo/favicon upload) |
| POST   | `/test-email` | Admin | Send test email                       |

### Variant Types (`/api/variant-types`)

| Method | Path      | Auth  | Description           |
| ------ | --------- | ----- | --------------------- |
| GET    | `/active` | —     | Active types only     |
| GET    | `/`       | Admin | All types (paginated) |
| GET    | `/:id`    | Admin | Type detail           |
| POST   | `/`       | Admin | Create type           |
| PUT    | `/:id`    | Admin | Update type           |
| DELETE | `/:id`    | Admin | Delete type           |

### Variant Options (`/api/variant-options`)

| Method | Path   | Auth  | Description                      |
| ------ | ------ | ----- | -------------------------------- |
| GET    | `/`    | —     | All options (filterable by type) |
| GET    | `/:id` | —     | Option detail                    |
| POST   | `/`    | Admin | Create option                    |
| PUT    | `/:id` | Admin | Update option                    |
| DELETE | `/:id` | Admin | Delete option                    |

### Payments (`/api/payments`)

Handled by `PaymentController` → `PaymentService`. Stripe secret key and webhook secret are loaded dynamically from the Settings model. The webhook route is registered before the JSON body parser in `app.js` to preserve the raw body for Stripe signature verification.

| Method | Path             | Auth | Description                 |
| ------ | ---------------- | ---- | --------------------------- |
| GET    | `/config`        | —    | Stripe publishable key      |
| POST   | `/create-intent` | User | Create Stripe PaymentIntent |
| POST   | `/webhook`       | —    | Stripe webhook (raw body)   |

### Health / Info

| Method | Path      | Description                          |
| ------ | --------- | ------------------------------------ |
| GET    | `/health` | Uptime, memory, connection stats     |
| GET    | `/`       | API name, version, status, endpoints |

---

## 7. Feature Flows

### Registration

1. Client sends `POST /api/auth/register` with name, email, password, confirmPassword.
2. `registerValidator` validates fields (express-validator).
3. `AuthController.register` → `AuthService.register` checks duplicate email, validates password strength, creates user with bcrypt-hashed password.
4. Generates access token (JWT) + optional refresh token. Sets HTTP-only cookies.
5. Returns sanitized user object (no password/tokens).

### Login

1. Client sends `POST /api/auth/login` with email, password, optional rememberMe.
2. Rate-limited per IP+email composite key (20 requests / 15 min).
3. `AuthService.login` verifies credentials, checks active status.
4. Generates access token. If rememberMe, generates refresh token (stored as SHA-256 hash in DB) and sets 30-day cookie.
5. Returns sanitized user with access token cookie.

### Token Refresh

1. Client sends `POST /api/auth/refresh-token` (refresh token in cookie).
2. `AuthService.refreshAccessToken` verifies JWT, compares SHA-256 hash with stored hash.
3. Issues new access token + rotated refresh token (old token invalidated).
4. Prevents replay attacks via single-use rotation.

### Product CRUD (Admin)

1. **Create:** Admin sends multipart form with product data + images. `ProductController.store` handles file uploads (product images + variant images), resolves category/brand from DB, generates unique slug, creates product.
2. **Update:** Merges uploaded images with existing, re-resolves category/brand, handles sparse unique index for baseSku.
3. **Delete:** Removes product, invalidates request cache.
4. **List:** Complex filtering by status, category, brand, price range, condition, featured, variants. Supports sort aliases (newest, price-low, price-high, popular, rating, best-selling). Uses in-memory request cache (15s TTL).

### Cart → Checkout → Payment

1. **Cart GET:** `CartService.getCartForUser()` fetches flat Cart documents (one per item), populates product data with field projection (`title`, `slug`, `images`, `basePrice`, `baseDiscount`, `baseStock`, `hasVariants`, `variants`, `status`), resolves per-item pricing (variant or base), applies discounts, and builds summary (subtotal, shipping, couponDiscount, total). Free shipping for orders ≥$100.
2. **Add to Cart:** `CartService.addItem()` validates product exists and is active, resolves variant pricing/stock, checks availability, creates or increments flat Cart document.
3. **Checkout:** Client creates Stripe PaymentIntent via `PaymentController` → `PaymentService.createPaymentIntent()`. Stripe secret key loaded dynamically from Settings model.
4. **Order Creation:** `POST /api/orders` with idempotency key. Validates payment method, verifies Stripe payment if applicable, validates stock, decrements stock atomically, creates order, clears cart. Uses MongoDB transaction with standalone fallback.
5. **Webhook:** Stripe webhook processes `payment_intent.succeeded` events via `POST /api/payments/webhook` (raw body, registered before JSON parser).

### Reviews

1. User creates review for product only if they have a delivered order containing that product.
2. Duplicate reviews per user/product prevented by unique compound index.
3. Post-save hook triggers aggregation pipeline to recalculate product ratings (average, count, star distribution).
4. Admin can approve/reject reviews via status update.

### Coupons

1. Public endpoint `POST /api/coupons/validate` validates code against order amount, checks date range, usage limits, minimum purchase.
2. Supports `fixed` and `percent` types with optional `maxDiscount` cap for percent coupons.
3. Dual-field synchronization (minPurchase ↔ minOrderAmount, startDate ↔ validFrom, etc.) for backward compatibility.

### Discounts

1. Discounts apply to categories or products with priority-based resolution.
2. Auto-deactivation of expired discounts on listing queries.
3. Type normalization (`amount` → `fixed`).

---

## 8. Middleware Pipeline

Middleware is applied in this exact order in `app.js`:

1. **helmet()** — Sets security headers (CSP, HSTS, X-Frame-Options, etc.).
2. **mongoSanitize()** — Strips `$` and `.` operators from req.body, params, query to prevent NoSQL injection.
3. **hpp()** — Prevents HTTP parameter pollution by deduplicating query params.
4. **cors()** — Whitelisted origin (`FRONTEND_URL`), credentials enabled.
5. **Stripe webhook route** — `POST /api/payments/webhook` with `express.raw()`. Registered before JSON parser so Stripe can verify raw body signatures.
6. **express.json()** — Parses JSON bodies (limit: 1MB).
7. **express.urlencoded()** — Parses URL-encoded bodies (limit: 1MB).
8. **cookieParser()** — Parses cookies into `req.cookies`.
9. **compression()** — Gzips responses.
10. **rateLimiter** — General rate limiter (5000/window in dev, configurable in prod).
11. **csrfProtection** — Cookie-based CSRF. Creates `_csrf` cookie, validates `X-CSRF-Token` header on state-changing requests. Bearer-only requests bypass CSRF.
12. **Dev logger** — Logs HTTP method, URL, response time in development.
13. **Performance monitor** — Records response times in circular buffer (1000 entries), calculates P95 latency, logs slow routes exceeding threshold.

### Route-Level Middleware

| Middleware                      | File                | Purpose                                                         |
| ------------------------------- | ------------------- | --------------------------------------------------------------- |
| `protect`                       | auth.js             | JWT verification, user lookup, status check. Sets `req.user`    |
| `authorize(...roles)`           | auth.js             | Role-based access. Admin bypasses all checks                    |
| `authorizeOwner(field)`         | auth.js             | Resource ownership check. Admin bypasses                        |
| `optionalAuth`                  | auth.js             | Non-failing auth. Sets `req.user` if valid, continues otherwise |
| `validate`                      | validators/index.js | Runs `validationResult(req)`, returns 400 with field errors     |
| `uploadCategoryImage`           | uploadEnhanced.js   | Multer single('photo') to `uploads/categories/`                 |
| `uploadProductAnyField`         | uploadEnhanced.js   | Multer any field, max 100 files to `uploads/products/`          |
| `uploadBrandMultiField`         | uploadEnhanced.js   | Multer fields: logo(1) + banners(5) to `uploads/brands/`        |
| `uploadBannerImage`             | uploadEnhanced.js   | Multer single('image') to `uploads/banners/`                    |
| `uploadUserAvatar`              | uploadEnhanced.js   | Multer single('photo') to `uploads/users/`                      |
| `uploadSettingsAssets`          | uploadEnhanced.js   | Multer fields: logo(1) + favicon(1)                             |
| `authRateLimiter`               | rateLimiter.js      | 20 requests / 15 min per IP+email                               |
| `authRefreshRateLimiter`        | rateLimiter.js      | 30 requests / 10 min                                            |
| `authForgotPasswordRateLimiter` | rateLimiter.js      | 5 requests / 60 min                                             |
| `authResetPasswordRateLimiter`  | rateLimiter.js      | 5 requests / 60 min                                             |

### Rate Limiters

| Limiter         | Window                        | Max Requests       | Key        |
| --------------- | ----------------------------- | ------------------ | ---------- |
| General         | Configurable (15 min default) | 1000 (5000 in dev) | IP         |
| Auth Login      | 15 min                        | 20                 | IP + email |
| Auth Refresh    | 10 min                        | 30                 | IP         |
| Forgot Password | 60 min                        | 5                  | IP         |
| Reset Password  | 60 min                        | 5                  | IP         |

---

## 9. Error Handling

### AppError Class

```javascript
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith("4") ? "fail" : "error";
    this.isOperational = true;
    this.errors = [];
  }
}
```

### Error Handler Middleware

The centralized `errorHandler` (last middleware in the chain) handles:

| Error Type                         | Mapped Status | Response                                        |
| ---------------------------------- | ------------- | ----------------------------------------------- |
| Mongoose `CastError`               | 404           | "Resource not found"                            |
| MongoDB duplicate key (code 11000) | 400           | "Duplicate field value"                         |
| Mongoose `ValidationError`         | 400           | Field-specific validation messages              |
| JWT `JsonWebTokenError`            | 401           | "Invalid token"                                 |
| JWT `TokenExpiredError`            | 401           | "Token expired"                                 |
| Operational errors (`AppError`)    | As specified  | Error message                                   |
| Programming errors                 | 500           | "Something went wrong" (no stack in production) |

### Response Format

All API responses follow a consistent shape:

```json
{
  "success": true,
  "message": "Human readable message",
  "data": {},
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "pages": 5,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

Error responses:

```json
{
  "success": false,
  "message": "Error description",
  "errors": [{ "field": "email", "message": "Email is required" }]
}
```

### Unhandled Errors

`server.js` catches:

- `unhandledRejection` — logs error, closes server, exits with code 1.
- `uncaughtException` — logs error, exits with code 1.
- `SIGTERM` — graceful shutdown (closes server, disconnects DB).

### Base Classes

- **BaseController** wraps all async handlers via `catchAsync()` which passes errors to `next()`.
- **BaseService** methods (`findByIdOrFail`, `updateOrFail`, `deleteOrFail`) throw `AppError(404)` on missing resources.
- MongoDB transactions in `BaseService.transaction()` use `session.withTransaction()` with automatic retry.

### Query Performance Patterns

- **`.lean()`** is used on all read-only queries (cart lookups, address fetches, category/brand resolution, review populates, banner details, discount existence checks) to skip Mongoose hydration overhead.
- **`.select()`** is applied to all `.populate()` calls to fetch only required fields (e.g., product populates project `title slug images basePrice baseDiscount baseStock hasVariants variants status`; discount populates project `title type value startsAt endsAt isActive`).
- **Batch queries** replace N+1 patterns: `CategoryService.getCategoryTree()` fetches all categories in a single query and builds the tree in-memory; `CategoryService.getNavigationCategories()` batch-fetches children for all visible parents in one query; `OrderService.reorderFromExisting()` batch-fetches all products with `Product.find({ $in })` and creates cart documents with `Cart.insertMany()`.
- **No error.message leaks** — controller catch blocks log the full error server-side but never expose `error.message` to the client response.
