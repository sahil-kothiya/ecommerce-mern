# Frontend Technical Documentation

## 1. Overview

The frontend is a React 19 single-page application built with Vite 5. It serves both the public storefront and a complete admin panel using role-based route protection. All state is either server-synced (via API calls) or local component state — there is no global client-side state library (no Redux). Data fetching is handled by service modules wrapping a central `apiClient.js`. All code is pure JavaScript (no TypeScript).

- **Framework:** React 19 (functional components, hooks only)
- **Build Tool:** Vite 5 (ESM, instant HMR)
- **Styling:** Tailwind CSS 3 (utility-first, responsive)
- **Routing:** React Router v6 (all routes lazy-loaded with Suspense)
- **Auth:** JWT in HTTP-only cookies, CSRF token on state-changing requests
- **Payments:** Stripe React Elements (@stripe/react-stripe-js)

---

## 2. Technology Stack

| Package | Version | Role |
|---------|---------|------|
| `react` | 19.2.4 | UI library (functional components, hooks) |
| `react-dom` | 19.2.4 | DOM rendering |
| `react-router-dom` | 6.30.3 | Client-side routing with lazy loading |
| `react-hook-form` | 7.71.2 | Performant form state management |
| `@hookform/resolvers` | 5.2.2 | Yup schema adapter for React Hook Form |
| `yup` | 1.7.1 | Schema-based form validation |
| `react-hot-toast` | 2.6.0 | Toast notification system |
| `@stripe/react-stripe-js` | 5.6.0 | Stripe card Elements for React |
| `@stripe/stripe-js` | 8.8.0 | Stripe.js lazy loader |
| `@dnd-kit/core` | 6.3.1 | Drag-and-drop primitives |
| `@dnd-kit/sortable` | 10.0.0 | Sortable list implementation |
| `@dnd-kit/utilities` | 3.2.2 | DnD utility helpers |
| `vite` | 5.4.21 | Build tool and dev server |
| `tailwindcss` | 3.4.19 | Utility-first CSS |
| `postcss` | 8.4.47 | CSS processing |
| `vitest` | 4.0.18 | (dev) Test runner (Vite-native) |
| `@testing-library/react` | 16.3.2 | (dev) Component testing utilities |
| `@testing-library/user-event` | 14.6.1 | (dev) User interaction simulation |
| `eslint` | 9.39.3 | (dev) Linting |
| `prettier` | 3.8.1 | (dev) Code formatting |

---

## 3. Folder Structure

```
frontend/src/
├── App.jsx                     # Root — defines all routes, wraps providers
├── main.jsx                    # Entry point — mounts App with BrowserRouter + Toaster
├── index.css                   # Global styles + Tailwind directives
│
├── pages/                      # Route-level components (lazy-loaded)
│   ├── HomePage.jsx            # Storefront home with banners, featured products
│   ├── ProductsPage.jsx        # Product listing with filter sidebar
│   ├── ProductDetailPage.jsx   # Single product with variants, reviews
│   ├── CartPage.jsx            # Shopping cart
│   ├── CheckoutPage.jsx        # Multi-step checkout with Stripe Elements
│   ├── WishlistPage.jsx        # User wishlist
│   ├── CategoryPage.jsx        # Products filtered by category
│   ├── NotFound.jsx            # 404 page
│   │
│   ├── auth/
│   │   ├── LoginPage.jsx
│   │   ├── RegisterPage.jsx
│   │   ├── ForgotPasswordPage.jsx
│   │   └── ResetPasswordPage.jsx
│   │
│   ├── account/                # Authenticated user area
│   │   ├── AccountDashboard.jsx
│   │   ├── AccountOrders.jsx
│   │   ├── AccountProfile.jsx
│   │   ├── AccountAddresses.jsx
│   │   ├── AccountReturns.jsx
│   │   ├── AccountWishlist.jsx
│   │   └── AccountReviews.jsx
│   │
│   └── admin/                  # Admin panel pages
│       ├── Dashboard.jsx
│       ├── products/           # ProductsList, ProductForm
│       ├── categories/         # CategoriesList, CategoryTreeManager, CategoryEditorPage
│       ├── brands/             # BrandsList, BrandForm
│       ├── banners/            # BannersList, BannerForm
│       ├── discounts/          # DiscountsList, DiscountForm
│       ├── coupons/            # CouponsList, CouponForm
│       ├── orders/             # OrdersList
│       ├── users/              # UsersList, UserForm
│       ├── reviews/            # ReviewsList
│       ├── settings/           # SettingsPage
│       └── variants/           # VariantTypesList, VariantTypeForm, VariantTypeView,
│                               # VariantOptionsList, VariantOptionForm
│
├── components/
│   ├── common/
│   │   ├── ProtectedRoute.jsx  # Redirects to /login if not authenticated
│   │   └── GuestRoute.jsx      # Redirects to / if already authenticated
│   ├── layout/
│   │   ├── Navbar.jsx          # Top navigation with cart count, auth state
│   │   ├── Footer.jsx
│   │   └── Sidebar.jsx         # Admin sidebar navigation
│   ├── product/
│   │   ├── ProductCard.jsx     # Product grid card
│   │   ├── ProductGrid.jsx     # Responsive product grid
│   │   └── ...                 # Filter panels, variant pickers, review form
│   ├── checkout/
│   │   └── ...                 # Step components, Stripe CardElement wrapper
│   ├── admin/
│   │   └── ...                 # DataTable, StatusBadge, ImageUploader, etc.
│   └── ui/
│       └── ...                 # Button, Modal, Spinner, Pagination, Badge, etc.
│
├── services/                   # API call wrappers — one file per resource
│   ├── apiClient.js            # Core HTTP client (see section 6)
│   ├── authService.js
│   ├── productService.js
│   ├── orderService.js
│   ├── cartService.js
│   ├── paymentService.js
│   ├── reviewService.js
│   ├── wishlistService.js
│   ├── categoryService.js
│   ├── brandService.js
│   ├── bannerService.js
│   ├── couponService.js
│   ├── discountService.js
│   ├── userService.js
│   ├── settingsService.js
│   ├── variantService.js
│   └── imageService.js
│
├── hooks/
│   ├── index.js                # Named hook exports
│   └── useWishlistCount.js     # Wishlist badge count hook
│
├── layouts/
│   ├── PublicLayout.jsx        # Navbar + Footer wrapper for storefront
│   ├── UserLayout.jsx          # Account sidebar + content area
│   └── AdminLayout.jsx         # Admin sidebar + main content area
│
├── context/
│   ├── SiteSettingsContext.jsx # React context provider for site settings
│   ├── siteSettingsContextStore.js # Settings fetch and cache logic
│   └── useSiteSettings.js     # Hook: const settings = useSiteSettings()
│
├── constants/
│   └── index.js               # API_CONFIG (BASE_URL, ENDPOINTS), app constants
│
└── utils/
    ├── logger.js               # Frontend structured logger (dev-only output)
    ├── recentlyViewed.js       # localStorage recently-viewed product helpers
    └── ...                     # Formatters (currency, date), validators
```

---

## 4. Routing Structure

All routes are defined in `App.jsx`. Every page is lazy-loaded with `React.lazy` and wrapped in `<Suspense fallback={<PageSkeleton />}>`.

| Path | Component | Guard | Notes |
|------|-----------|-------|-------|
| `/` | `HomePage` | Public | — |
| `/products` | `ProductsPage` | Public | Filter/sort via URL query params |
| `/products/:slug` | `ProductDetailPage` | Public | Slug-based product URL |
| `/category/:slug` | `CategoryPage` | Public | — |
| `/cart` | `CartPage` | Public | Shows empty state if not logged in |
| `/checkout` | `CheckoutPage` | ProtectedRoute | Redirects to /login |
| `/wishlist` | `WishlistPage` | Public | Empty state if not logged in |
| `/login` | `LoginPage` | GuestRoute | Redirects to / if authed |
| `/register` | `RegisterPage` | GuestRoute | — |
| `/forgot-password` | `ForgotPasswordPage` | GuestRoute | — |
| `/reset-password/:token` | `ResetPasswordPage` | GuestRoute | — |
| `/account` | `AccountDashboard` (UserLayout) | ProtectedRoute | — |
| `/account/orders` | `AccountOrders` | ProtectedRoute | — |
| `/account/profile` | `AccountProfile` | ProtectedRoute | — |
| `/account/addresses` | `AccountAddresses` | ProtectedRoute | — |
| `/account/returns` | `AccountReturns` | ProtectedRoute | — |
| `/account/wishlist` | `AccountWishlist` | ProtectedRoute | — |
| `/account/reviews` | `AccountReviews` | ProtectedRoute | — |
| `/admin` | `Dashboard` (AdminLayout) | ProtectedRoute + admin role | — |
| `/admin/products` | `ProductsList` | Admin | URL-synced status+variant filters |
| `/admin/products/new` | `ProductForm` | Admin | Multi-image upload, variant builder |
| `/admin/products/:id/edit` | `ProductForm` | Admin | — |
| `/admin/categories` | `CategoriesList` | Admin | — |
| `/admin/categories/tree` | `CategoryTreeManager` | Admin | @dnd-kit drag-and-drop tree |
| `/admin/categories/:id/edit` | `CategoryEditorPage` | Admin | — |
| `/admin/brands` | `BrandsList` / `BrandForm` | Admin | — |
| `/admin/banners` | `BannersList` / `BannerForm` | Admin | — |
| `/admin/discounts` | `DiscountsList` / `DiscountForm` | Admin | — |
| `/admin/coupons` | `CouponsList` / `CouponForm` | Admin | — |
| `/admin/orders` | `OrdersList` | Admin | — |
| `/admin/users` | `UsersList` / `UserForm` | Admin | — |
| `/admin/reviews` | `ReviewsList` | Admin | — |
| `/admin/settings` | `SettingsPage` | Admin | — |
| `/admin/variant-types` | `VariantTypesList` / Form / View | Admin | — |
| `/admin/variant-options` | `VariantOptionsList` / Form | Admin | — |
| `*` | `NotFound` | Public | 404 catch-all |

---

## 5. Route Guards

### `ProtectedRoute`
```jsx
// Checks localStorage 'auth_user' for a persisted user object.
// If absent → redirects to /login (preserves intended destination in state).
// Used for: /checkout, all /account/*, all /admin/*
```

### `GuestRoute`
```jsx
// If user is already authenticated → redirects to /.
// Used for: /login, /register, /forgot-password, /reset-password/:token
```

Admin pages use `ProtectedRoute` and additionally check `user.role === 'admin'` — non-admin authenticated users are redirected to `/`.

---

## 6. API Communication

### `apiClient.js` — Core HTTP Client

The `ApiClient` class is a custom `fetch`-based HTTP client (no Axios). It provides:

- **Request interceptors** — Add timing metadata to every request
- **Response interceptors** — Log response time
- **Error interceptors** — Handle 401 with automatic token refresh + request retry
- **CSRF token** — Automatically attached to all mutating requests via `X-CSRF-Token` header
- **Credentials** — `credentials: 'include'` on all requests (sends cookies)

**401 handling flow:**
```
Request returns 401
  → Check if URL is an auth endpoint (skip for login/register/refresh)
  → attemptTokenRefresh() — POST /auth/refresh-token
    → If success: retry original request
    → If fail: redirect to /login, clear localStorage 'auth_user'
```

**Token refresh queue:**
Multiple simultaneous 401s are handled with a refresh queue — only one refresh request is made; all queued requests resolve after the single refresh completes.

### Service Layer Pattern

Every API resource has a dedicated service file:

```javascript
// productService.js
import apiClient from './apiClient.js'

export const productService = {
  getProducts: (params) => apiClient.get('/products', { params }),
  getProduct: (slug) => apiClient.get(`/products/${slug}`),
  createProduct: (data) => apiClient.post('/products', data),
  updateProduct: (id, data) => apiClient.put(`/products/${id}`, data),
  deleteProduct: (id) => apiClient.delete(`/products/${id}`),
}
```

All component data-fetching is done through these service modules — never direct `fetch` inside components.

---

## 7. Site Settings

`SiteSettingsContext` fetches site config from `GET /api/settings` on app load and exposes it to all components.

```jsx
// Usage in any component:
import { useSiteSettings } from '../context/useSiteSettings'
const { storeName, currency, contactEmail } = useSiteSettings()
```

App startup sequence in `App.jsx`:
1. Clear legacy `recentlyViewed` localStorage keys
2. Fetch CSRF token from `GET /api/auth/csrf-token` (stores in memory)
3. Attempt silent `authService.getMe()` to restore session from cookie (non-blocking)

---

## 8. Form Handling

All forms use **React Hook Form** with **Yup** schema validation:

```javascript
// Standard pattern used across all forms
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'

const schema = yup.object({
  email: yup.string().email().required(),
  password: yup.string().min(8).required(),
})

const { register, handleSubmit, formState: { errors } } = useForm({
  resolver: yupResolver(schema),
})
```

Validation is triggered on submit by default. Field-level error messages are shown inline beneath each input.

---

## 9. Feature Flows

### Login Flow
```
User submits LoginPage form
  → Yup validation (client-side)
  → authService.login({ email, password })
  → POST /api/auth/login
  → On 200: server sets accessToken + refreshToken cookies
           response body contains user object
  → Store user in localStorage 'auth_user' (for SSR-less auth check)
  → react-hot-toast success
  → Navigate to previous page (from location.state) or /
```

### Add to Cart
```
User clicks "Add to Cart" on ProductDetailPage
  → Validate variant selected (if product hasVariants)
  → cartService.addItem({ productId, variantId, quantity })
  → POST /api/cart (with credentials — JWT cookie sent automatically)
  → On 200: update local cart state
  → react-hot-toast success ("Added to cart")
  → Cart count in Navbar updates
```

### Checkout Flow
```
CheckoutPage mounts
  ├── 1. Load saved addresses from authService.getAddresses()
  ├── 2. Load cart from cartService.getCart()
  ├── 3. GET /api/payments/config → load Stripe publishable key
  └── 4. Initialize Stripe Elements

User fills address → selects shipping → enters coupon code
  → couponService.validateCoupon(code) → show discount

User submits payment
  ├── 1. paymentService.createIntent({ orderId }) → clientSecret
  ├── 2. stripe.confirmPayment({ clientSecret, confirmParams })
  └── 3. On stripe success → POST /api/orders to record order
         → Navigate to order confirmation page
```

### Admin Product Listing Filters
```
ProductsList mounts
  → Reads URL search params: ?status=active&hasVariants=true&page=1
  → Fetches products with those filters
  → Filter tabs rendered: [All] [Active] [Inactive] [With Variants] [No Variants]
  → User clicks filter → URL updated → re-fetch → pagination reset to page 1
  → Each filter tab shows count badge from API response
```

### Category Tree Management
```
CategoryTreeManager mounts
  → Fetches full category tree
  → Renders @dnd-kit SortableContext with category items
  → User drags item → onDragEnd fires
  → categoryService.reorderCategories(newOrder) → PUT /api/categories/reorder
  → Optimistic UI update
```

---

## 10. Layouts

### `PublicLayout`
Wraps all storefront pages. Renders `<Navbar>` and `<Footer>` around `<Outlet>`.

### `UserLayout`
Wraps all `/account/*` pages. Renders account sidebar navigation with links to Dashboard, Orders, Profile, Addresses, Returns, Wishlist, Reviews. The main content is in `<Outlet>`.

### `AdminLayout`
Wraps all `/admin/*` pages. Renders the admin sidebar with grouped navigation links. Protected — redirects non-admin users.

---

## 11. Hooks

### `useWishlistCount`
```javascript
// Returns the number of items in the user's wishlist for the Navbar badge.
// Fetches from wishlistService.getWishlist() on mount if user is authenticated.
const count = useWishlistCount()
```

Additional hooks are exported from `hooks/index.js` — see that file for the full list.

---

## 12. Environment Variables

| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `VITE_API_BASE_URL` | Full API base URL without trailing slash | `http://localhost:5001/api` | **Yes** |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key for Elements initialization | `pk_test_...` | Yes (payments) |

All `VITE_` prefixed variables are inlined at build time by Vite and accessible as `import.meta.env.VITE_API_BASE_URL`.

---

## 13. Build & Development Commands

```bash
npm run dev          # Start Vite dev server (HMR, port 5173)
npm run build        # Production build → dist/
npm run preview      # Serve production build locally
npm run lint         # ESLint
npm run lint:fix     # ESLint with auto-fix
npm run format       # Prettier format all src files
npm test             # Vitest run once
npm run test:watch   # Vitest interactive watch
npm run analyze      # Bundle size visualizer (vite-bundle-analyzer)
npm run clean        # Remove dist and .vite cache
```
