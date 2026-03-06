# 🛒 MERN Enterprise E-Commerce

> A production-grade, full-stack e-commerce platform built with React, Node.js, Express, and MongoDB. Designed to scale to millions of products with a complete admin dashboard, Stripe payments, JWT authentication, and real-time cart management.

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)
[![Node Version](https://img.shields.io/badge/node-%3E%3D22.0.0-brightgreen)]()
[![MongoDB](https://img.shields.io/badge/MongoDB-6.0+-green)]()
[![React](https://img.shields.io/badge/React-19+-blue)]()
[![Express](https://img.shields.io/badge/Express-5.x-lightgrey)]()

**Live Demo:** _Coming soon_

---

A feature-rich e-commerce application suitable for production deployment. It includes a customer-facing storefront with product browsing, search, cart, wishlist, and Stripe checkout; a full admin panel for managing products, categories, orders, users, coupons, and banners; and a hardened backend API with role-based access control, rate limiting, CSRF protection, and background job processing.

---

## 📸 Screenshots

> Screenshots will be added soon.

---

## ✨ Features

### 👤 Customer Features

| Feature                | Description                                                                     |
| ---------------------- | ------------------------------------------------------------------------------- |
| 🔐 Authentication      | Register, login, logout with JWT + HTTP-only cookies and refresh token rotation |
| 📧 Password Reset      | Forgot/reset password via email (Nodemailer + SMTP)                             |
| 🛍️ Product Browsing    | Browse by category, filter by brand/price/rating/variant, sort options          |
| 🔍 Product Search      | Full-text search with debounced API calls                                       |
| 📦 Product Variants    | Size, color, and custom variant selection with per-variant stock and pricing    |
| 🛒 Shopping Cart       | Add, update, remove items; persistent server-side cart with stock validation    |
| ❤️ Wishlist            | Save products for later; sync across sessions                                   |
| 💳 Checkout & Payments | Stripe payment intent flow with card processing                                 |
| 📋 Order Management    | Place orders, view order history, track order status                            |
| 🔄 Returns             | Request returns on delivered orders                                             |
| ⭐ Product Reviews     | Leave star ratings and text reviews (verified purchase required)                |
| 👤 Account Dashboard   | Manage profile, addresses, password, and search preferences                     |
| 📍 Address Book        | Multiple saved addresses with default selection                                 |
| 🏷️ Coupon Codes        | Apply discount coupons at checkout                                              |
| 🔁 Reorder             | Reorder any previous order with one click                                       |
| 📱 Responsive Design   | Fully responsive UI for desktop, tablet, and mobile                             |

### 🔧 Admin Features

| Feature                    | Description                                                                 |
| -------------------------- | --------------------------------------------------------------------------- |
| 📊 Dashboard               | Revenue, order, user, and product statistics via MongoDB aggregations       |
| 📦 Product Management      | Create/edit/delete products with multi-image upload and variant management  |
| 🗂️ Category Management     | Hierarchical category tree with drag-and-drop reordering                    |
| 🏷️ Brand Management        | Brand list with logo upload                                                 |
| 🎨 Banner Management       | Homepage banner carousel management with image upload                       |
| 🏷️ Discount Management     | Percentage and fixed-amount product discounts with scheduling               |
| 🎟️ Coupon Management       | Create/edit coupons with usage limits, expiry dates, and per-user caps      |
| 📋 Order Management        | View all orders, update status (pending → processing → shipped → delivered) |
| 👥 User Management         | View and manage customer accounts                                           |
| ⭐ Review Moderation       | View and delete product reviews                                             |
| ⚙️ Site Settings           | Store name, contact email, currency, and feature flags                      |
| 🔩 Variant Types & Options | Define custom product attributes (Color, Size, Material, etc.)              |

---

## 🛠️ Tech Stack

| Layer              | Technology                                          | Purpose                                                   |
| ------------------ | --------------------------------------------------- | --------------------------------------------------------- |
| **Frontend**       | React 19 + Vite 5                                   | UI framework and build tool                               |
| **Routing**        | React Router v6                                     | Client-side routing with lazy loading                     |
| **Forms**          | React Hook Form + Yup                               | Form state management and schema validation               |
| **Styling**        | Tailwind CSS 3                                      | Utility-first CSS framework                               |
| **Notifications**  | React Hot Toast                                     | Toast notification system                                 |
| **Drag & Drop**    | @dnd-kit                                            | Accessible drag-and-drop for category reordering          |
| **Backend**        | Node.js + Express 5                                 | RESTful API server                                        |
| **Database**       | MongoDB + Mongoose 8                                | Document database with ODM                                |
| **Authentication** | JWT (access + refresh tokens) + HTTP-only cookies   | Secure stateless auth with token rotation                 |
| **Payment**        | Stripe                                              | Card payment processing with webhook verification         |
| **Email**          | Nodemailer + SMTP                                   | Transactional emails (password reset, order confirmation) |
| **File Storage**   | Multer + local disk                                 | Product/brand/category/banner image uploads               |
| **Job Queue**      | Bull + Redis                                        | Background email and ratings update jobs                  |
| **Security**       | Helmet, CORS, rate-limit, hpp, mongo-sanitize, CSRF | Multi-layer API hardening                                 |
| **Logging**        | Winston                                             | Structured application logging                            |
| **Testing (BE)**   | Jest + Supertest                                    | API integration and unit tests                            |
| **Testing (FE)**   | Vitest + React Testing Library                      | Component and hook tests                                  |
| **Linting**        | ESLint + Prettier                                   | Code quality and consistent formatting                    |

---

## 📁 Project Structure

```
ecommerce-mern/
├── backend/                        # Node.js / Express API (port 5001)
│   ├── src/
│   │   ├── app.js                  # Express app, middleware registration
│   │   ├── server.js               # HTTP server entry point
│   │   ├── config/
│   │   │   ├── index.js            # Validated env config export
│   │   │   └── database.js         # Mongoose connection
│   │   ├── controllers/            # HTTP request handlers — no business logic
│   │   ├── services/               # All business logic lives here
│   │   ├── models/                 # Mongoose schemas (User, Product, Order, …)
│   │   ├── routes/                 # Express routers
│   │   ├── middleware/             # auth, CSRF, rate-limit, error handler, upload
│   │   ├── validators/             # express-validator rule sets
│   │   ├── queues/                 # Bull job queues (email, ratings)
│   │   ├── utils/                  # logger, helpers
│   │   └── core/                   # BaseController, BaseService
│   ├── scripts/                    # DB migration scripts
│   ├── seeder.js                   # CLI seeder (--import / --destroy)
│   └── uploads/                    # Uploaded image files
│
├── frontend/                       # React / Vite client (port 5173)
│   ├── src/
│   │   ├── App.jsx                 # Root component, all routes
│   │   ├── pages/                  # Route-level page components
│   │   │   ├── auth/               # Login, Register, ForgotPassword, ResetPassword
│   │   │   ├── account/            # Dashboard, Orders, Profile, Addresses, Reviews
│   │   │   └── admin/              # Products, Categories, Orders, Users, etc.
│   │   ├── components/
│   │   │   ├── common/             # ProtectedRoute, GuestRoute, shared UI
│   │   │   ├── layout/             # Navbar, Footer, Sidebar
│   │   │   ├── product/            # ProductCard, ProductGrid, filters
│   │   │   ├── checkout/           # Checkout steps, Stripe Elements
│   │   │   ├── admin/              # Admin-specific components
│   │   │   └── ui/                 # Reusable UI primitives
│   │   ├── services/               # API call wrappers (one file per resource)
│   │   │   └── apiClient.js        # Core client: auth, retry, 401 refresh
│   │   ├── hooks/                  # Custom React hooks
│   │   ├── layouts/                # PublicLayout, UserLayout, AdminLayout
│   │   ├── context/                # SiteSettingsContext
│   │   └── constants/              # API config, route constants
│   └── public/images/              # Static images
│
├── .github/                        # CI workflow, issue/PR templates
├── docs/                           # Extended architecture documentation
├── BACKEND_DOCS.md
├── FRONTEND_DOCS.md
├── CONTRIBUTING.md
├── CODE_OF_CONDUCT.md
├── SECURITY.md
├── CHANGELOG.md
└── package.json                    # Root — runs both servers concurrently
```

---

## 🚀 Getting Started

### Prerequisites

```
Node.js  >= 22.0.0   https://nodejs.org
MongoDB  >= 6.0      https://www.mongodb.com/try/download/community
npm      >= 9.0.0    (bundled with Node.js)
Git                  https://git-scm.com
```

> **MongoDB Atlas:** Prefer a managed database? Create a free cluster at [cloud.mongodb.com](https://cloud.mongodb.com) and paste the connection string into `MONGODB_URI`.

### 1. Clone the Repository

```bash
git clone https://github.com/sahil-kothiya/ecommerce-mern.git
cd ecommerce-mern
```

### 2. Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Open .env and fill in required values
npm run dev
# API running at http://localhost:5001
```

### 3. Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env
# Set VITE_API_BASE_URL=http://localhost:5001/api
npm run dev
# App running at http://localhost:5173
```

### 4. Run Both Together

```bash
# From the project root directory
npm run dev
```

### 5. Seed the Database

```bash
cd backend
npm run seed:minimal      # 50 products, 12 users — fast
npm run seed:development  # 500 products, 80 users — realistic dev data
npm run seed              # 10,000 products — full dataset
npm run seed:destroy      # Clear all seeded data
```

Default admin after seeding: `admin@enterprise-ecommerce.com` / `admin123!`

---

## 🔑 Environment Variables

### Backend (`backend/.env`)

| Variable                  | Description                      | Example                                          | Required       |
| ------------------------- | -------------------------------- | ------------------------------------------------ | -------------- |
| `PORT`                    | API server port                  | `5001`                                           | No             |
| `NODE_ENV`                | Runtime environment              | `development`                                    | No             |
| `MONGODB_URI`             | MongoDB connection string        | `mongodb://localhost:27017/enterprise-ecommerce` | **Yes**        |
| `JWT_SECRET`              | Access token secret (32+ chars)  | `changeme-access-secret-min-32-chars`            | **Yes**        |
| `JWT_EXPIRE`              | Access token lifespan            | `7d`                                             | No             |
| `JWT_REFRESH_SECRET`      | Refresh token secret             | `changeme-refresh-secret`                        | **Yes**        |
| `JWT_REFRESH_EXPIRE`      | Refresh token lifespan           | `30d`                                            | No             |
| `FRONTEND_URL`            | CORS allowed origin              | `http://localhost:5173`                          | **Yes**        |
| `STRIPE_SECRET_KEY`       | Stripe secret API key            | `sk_test_...`                                    | Yes (payments) |
| `STRIPE_PUBLISHABLE_KEY`  | Stripe publishable key           | `pk_test_...`                                    | Yes (payments) |
| `STRIPE_WEBHOOK_SECRET`   | Stripe webhook signing secret    | `whsec_...`                                      | Yes (webhooks) |
| `SMTP_HOST`               | SMTP server host                 | `smtp.gmail.com`                                 | No             |
| `SMTP_PORT`               | SMTP server port                 | `587`                                            | No             |
| `SMTP_USER`               | SMTP login username              | `you@gmail.com`                                  | No             |
| `SMTP_PASSWORD`           | SMTP password / app password     | `your-app-password`                              | No             |
| `EMAIL_FROM`              | From address for outgoing emails | `noreply@yourstore.com`                          | No             |
| `REDIS_URL`               | Redis connection URL             | `redis://localhost:6379`                         | No (queues)    |
| `ADMIN_EMAIL`             | Seeder default admin email       | `admin@enterprise-ecommerce.com`                 | No             |
| `ADMIN_PASSWORD`          | Seeder default admin password    | `admin123!`                                      | No             |
| `RATE_LIMIT_WINDOW_MS`    | Rate limit window in ms          | `900000`                                         | No             |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window          | `100`                                            | No             |
| `MAX_FILE_SIZE`           | File upload limit in bytes       | `5242880`                                        | No             |

### Frontend (`frontend/.env`)

| Variable                      | Description            | Example                     | Required       |
| ----------------------------- | ---------------------- | --------------------------- | -------------- |
| `VITE_API_BASE_URL`           | Backend API base URL   | `http://localhost:5001/api` | **Yes**        |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key | `pk_test_...`               | Yes (payments) |

---

## 📡 API Reference

All endpoints are served under `/api`.

### Auth

| Method | Endpoint                      | Auth | Description             |
| ------ | ----------------------------- | ---- | ----------------------- |
| `POST` | `/auth/register`              | No   | Register new user       |
| `POST` | `/auth/login`                 | No   | Login, sets JWT cookies |
| `POST` | `/auth/logout`                | Yes  | Clear auth cookies      |
| `POST` | `/auth/refresh-token`         | No   | Rotate refresh token    |
| `GET`  | `/auth/me`                    | Yes  | Get current user        |
| `PUT`  | `/auth/profile`               | Yes  | Update profile          |
| `PUT`  | `/auth/password`              | Yes  | Change password         |
| `POST` | `/auth/forgot-password`       | No   | Send reset email        |
| `POST` | `/auth/reset-password/:token` | No   | Reset password          |
| `GET`  | `/auth/csrf-token`            | No   | Get CSRF token          |

### Products

| Method   | Endpoint             | Auth  | Description                       |
| -------- | -------------------- | ----- | --------------------------------- |
| `GET`    | `/products`          | No    | List with filters/sort/pagination |
| `GET`    | `/products/featured` | No    | Featured products                 |
| `GET`    | `/products/search`   | No    | Keyword search                    |
| `GET`    | `/products/:slug`    | No    | Product detail by slug            |
| `POST`   | `/products`          | Admin | Create product                    |
| `PUT`    | `/products/:id`      | Admin | Update product                    |
| `DELETE` | `/products/:id`      | Admin | Delete product                    |

### Orders

| Method | Endpoint                | Auth  | Description     |
| ------ | ----------------------- | ----- | --------------- |
| `POST` | `/orders`               | Yes   | Place order     |
| `GET`  | `/orders`               | Yes   | User order list |
| `GET`  | `/orders/:id`           | Yes   | Order detail    |
| `POST` | `/orders/:id/reorder`   | Yes   | Reorder         |
| `POST` | `/orders/:id/returns`   | Yes   | Return request  |
| `GET`  | `/orders/admin/all`     | Admin | All orders      |
| `GET`  | `/orders/admin/summary` | Admin | Revenue & stats |
| `PUT`  | `/orders/:id/status`    | Admin | Update status   |

### Cart · Wishlist · Reviews · Payments · Coupons

> See [BACKEND_DOCS.md](BACKEND_DOCS.md) for complete request/response schemas for all endpoints.

---

## 🧪 Running Tests

```bash
# Backend — Jest + Supertest
cd backend
npm test                   # run all tests with coverage
npm run test:watch         # watch mode

# Frontend — Vitest + React Testing Library
cd frontend
npm test                   # run once
npm run test:watch         # watch mode
```

---

## 🚢 Deployment

### Backend — Railway / Render

1. Connect repo → set root directory to `backend/`
2. Build: `npm install` · Start: `npm start`
3. Add all backend environment variables
4. Set `NODE_ENV=production` and update `FRONTEND_URL` to your deployed frontend URL

### Frontend — Vercel

1. Import repo → root directory: `frontend/`
2. Build: `npm run build` · Output: `dist`
3. Add `VITE_API_BASE_URL` and `VITE_STRIPE_PUBLISHABLE_KEY`

### Frontend — Netlify

1. Base: `frontend` · Build: `npm run build` · Publish: `frontend/dist`
2. Add environment variables in Site Settings
3. Create `frontend/public/_redirects`:
   ```
   /*  /index.html  200
   ```

### Database — MongoDB Atlas

1. Free cluster at [cloud.mongodb.com](https://cloud.mongodb.com)
2. Create DB user, whitelist deployment IP
3. Copy connection string → set as `MONGODB_URI`

---

## 🤝 Contributing

Contributions are welcome! Read [CONTRIBUTING.md](CONTRIBUTING.md) for the full process.

1. Fork → create branch: `git checkout -b feature/your-feature`
2. Make changes and add tests
3. `npm run lint` and `npm test` must pass
4. Commit: `git commit -m "feat(scope): description"`
5. Push and open a Pull Request

---

## 📄 License

MIT — see [LICENSE](LICENSE).

---

## 📬 Contact & Support

- **Author:** [Sahil Kothiya](https://github.com/sahil-kothiya)
- **Email:** sahilk.itpath@gmail.com
- **Issues:** [GitHub Issues](https://github.com/sahil-kothiya/ecommerce-mern/issues)
- **Discussions:** [GitHub Discussions](https://github.com/sahil-kothiya/ecommerce-mern/discussions)

---

## 🙏 Acknowledgements

[Express](https://expressjs.com) · [Mongoose](https://mongoosejs.com) · [React](https://react.dev) · [Vite](https://vitejs.dev) · [Tailwind CSS](https://tailwindcss.com) · [Stripe](https://stripe.com/docs) · [React Hook Form](https://react-hook-form.com) · [Winston](https://github.com/winstonjs/winston) · [Bull](https://github.com/OptimalBits/bull) · [Helmet](https://helmetjs.github.io) · [@faker-js/faker](https://fakerjs.dev)
