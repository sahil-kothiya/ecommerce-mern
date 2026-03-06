# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added

- _Planned: OAuth login (Google, Facebook)_
- _Planned: Real-time order status notifications_
- _Planned: S3-backed file storage_
- _Planned: Product question & answer section_

### Changed

### Fixed

### Security

---

## [1.0.0] - 2026-03-05

Initial public release of the MERN Enterprise E-Commerce platform.

### Added

#### Authentication & User Accounts

- JWT-based authentication with HTTP-only cookies (access + refresh token pair)
- Refresh token rotation — every refresh issues a new refresh token and invalidates the old one
- User registration with email, name, and password
- Login / logout flow with cookie clearing on logout
- Forgot password flow — email with signed reset token (Nodemailer + SMTP)
- Reset password via token with expiry validation
- User profile update (name, avatar)
- Change password (requires current password verification)
- Saved address book — multiple addresses per user with default flag and CRUD
- Search preferences stored per user for persistent filter state

#### Product Catalog

- Full product model with title, slug, description, brand, category, tags, status, SEO fields
- Product variant system — variant types (Size, Color, Material, etc.) and options
- Per-variant pricing, stock quantity, and SKU tracking
- Products without variants supported (hasVariants: false)
- Multi-image support with primary image designation and sort order
- Auto-generated unique slug via `slugify` on create/update
- Featured product flag
- isFeatured and status (active/inactive) fields with seeder-compatible defaults

#### Product Discovery

- Paginated product listing with server-side filtering by category, brand, price range, rating, tags, variants
- Multi-sort options: price asc/desc, rating, newest, featured
- Full-text product search endpoint
- Featured products endpoint with cache (120s)
- Response caching on product list (30s), search (30s), and detail (60s) endpoints
- In-memory cache middleware configurable per route

#### Shopping Cart

- Server-side cart persisted per authenticated user
- Add item with stock validation (cannot exceed available stock)
- Update item quantity
- Remove individual item
- Clear entire cart
- Cart auto-populated with current product pricing on fetch

#### Wishlist

- Add/remove products from wishlist
- Per-user persistent wishlist
- Wishlist count exposed for UI badge

#### Checkout & Orders

- Order placement from cart contents with atomic stock deduction (DB transaction)
- Coupon code application at checkout with discount calculation
- Shipping address captured per order
- Order items snapshot (price, title, SKU) preserved at time of purchase
- Order statuses: pending, processing, shipped, delivered, cancelled, refunded
- Return request system — request returns on delivered orders with reason and items
- Reorder — re-add a past order's items to cart with one API call
- Order history per user with pagination and status filter

#### Payment (Stripe)

- Stripe PaymentIntent creation with amount, currency, and metadata
- Stripe webhook handler with signature verification
- Webhook processes `payment_intent.succeeded` to mark orders as paid
- Webhook uses raw body to preserve Stripe signature integrity
- Configurable endpoint — `/api/payments/webhook`

#### Reviews

- Star rating (1–5) and text review per product
- Verified purchase check — only users with a delivered order containing the product can review
- Duplicate review prevention — one review per user per product
- Review aggregation for average rating and rating count on product fetch
- Rating recalculation via background job queue (Bull)
- Admin review listing and deletion

#### Categories

- Hierarchical category model (parent/child relationship)
- Category tree management with drag-and-drop reordering (frontend)
- Slug-based routing for SEO-friendly category URLs
- Image upload per category

#### Brands

- Brand model with name, slug, logo image, description, and status
- Full CRUD for admin
- Brand filter on product listing

#### Banners

- Homepage banner model with image, title, subtitle, link, position, and active flag
- Multiple banners with sort order for carousel
- Admin CRUD with image upload

#### Discounts

- Percentage and fixed-amount discount types
- Discount applicable per product
- Start/end date scheduling
- Status (active/inactive) for manual control
- Discount amount reflected in product pricing APIs

#### Coupons

- Coupon codes with percentage or fixed discount types
- Minimum order value requirement
- Maximum discount cap for percentage coupons
- Total usage limit (across all users)
- Per-user usage limit
- Expiry date
- Migration script to canonical coupon format (`scripts/migrate-coupons-canonical.js`)

#### Admin Panel (API)

- Admin product listing with combined filters: status, hasVariants
- Admin order management: list all orders, paginated, searchable
- Admin order status update
- Admin summary statistics endpoint — total revenue, orders by status, recent orders, top products
- Admin user listing and management
- Admin category, brand, banner, coupon, discount, variant type/option CRUD
- Admin review moderation (list, delete)

#### Site Settings

- Key-value store for site configuration (store name, contact email, currency, etc.)
- Settings served to frontend via `SiteSettingsContext`
- Admin settings management page

#### Variant Types & Options

- Variant type model (e.g., Color, Size, Material)
- Variant option model (e.g., Red, Large, Cotton)
- Admin CRUD for both
- Used to populate variant pickers on product forms

#### Security

- Helmet.js HTTP security headers
- CORS with explicit origin whitelist
- express-mongo-sanitize to prevent NoSQL injection
- hpp to prevent HTTP Parameter Pollution
- CSRF double-submit cookie protection on all state-changing API routes
- Rate limiting: global API limiter + auth-specific limiters per endpoint
- JWT HTTP-only cookie storage (never localStorage)
- bcryptjs password hashing (salt rounds: 12)
- Stripe webhook signature verification
- Multer file type and size validation on uploads
- JSON body size limit (1 MB)

#### Background Jobs (Bull + Redis)

- Email job queue — order confirmation, password reset emails dispatched asynchronously
- Ratings recalculation queue — product average rating and count updated after review submission
- Dedicated worker process (`src/queues/worker.js`)

#### Logging & Observability

- Winston structured logging (JSON format in production, pretty-print in development)
- Per-request latency tracking with P50/P95/P99 percentile reporting
- Slow route detection (configurable threshold)
- MongoDB slow query logging (configurable threshold)

#### Developer Experience

- Faker-based database seeder with configurable counts for products, users, orders, reviews
- Seeder supports `--import` and `--destroy` flags
- Seed presets: minimal, development, production
- ESLint flat config for both frontend and backend
- Prettier formatting configuration
- Jest + Supertest test suite for backend
- Vitest + React Testing Library for frontend
- Code coverage thresholds enforced in CI

#### Frontend

- React 19 with Vite 5 build tooling
- Tailwind CSS 3 utility-first styling
- React Router v6 with lazy-loaded routes and Suspense fallback skeletons
- `ProtectedRoute` and `GuestRoute` components for route-level auth guarding
- `AdminLayout` with `AdminRoute` protecting all admin pages
- `PublicLayout` with Navbar and Footer for storefront
- `UserLayout` for account pages with sidebar navigation
- React Hook Form + Yup validation on all forms
- React Hot Toast for user-facing notifications
- `apiClient.js` — custom fetch wrapper with request interceptors, automatic token refresh on 401, and error surfacing
- `SiteSettingsContext` — site-wide settings available to all components
- Full storefront: Home, Products, Product Detail, Category, Cart, Checkout, Wishlist, Not Found
- Full account section: Dashboard, Orders, Profile, Addresses, Returns, Wishlist, Reviews
- Full admin panel: Dashboard, Products, Categories (with tree manager), Brands, Banners, Discounts, Coupons, Orders, Users, Reviews, Settings, Variant Types & Options
- @dnd-kit drag-and-drop for category tree reordering
- Stripe React Elements for secure card input
- Skeleton loading states on all data-dependent pages
