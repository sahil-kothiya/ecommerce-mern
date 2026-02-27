# Frontend Documentation

## 1. Overview

The frontend is a React 19 single-page application built with Vite 5. It serves both the public storefront and a full admin panel using role-based route protection. The app uses Redux Toolkit for state management, React Router v6 for routing (all routes lazy-loaded), cookie-based authentication with CSRF protection, and Tailwind CSS for styling. All code is pure JavaScript (no TypeScript).

---

## 2. Technology Stack

| Technology                  | Version | Purpose                                   |
| --------------------------- | ------- | ----------------------------------------- |
| React                       | 19.2.4  | UI framework (functional components only) |
| React DOM                   | 19.2.4  | DOM rendering                             |
| Vite                        | 5.4.21  | Build tool and dev server                 |
| React Router DOM            | 6.30.3  | Client-side routing                       |
| Redux Toolkit               | 2.11.2  | State management                          |
| React Redux                 | 9.2.0   | React-Redux bindings                      |
| React Hook Form             | 7.71.2  | Form state management                     |
| @hookform/resolvers         | 5.2.2   | Validation schema resolvers               |
| Yup                         | 1.7.1   | Schema validation                         |
| Tailwind CSS                | 3.4.19  | Utility-first CSS                         |
| @stripe/react-stripe-js     | 5.6.0   | Stripe Elements integration               |
| @stripe/stripe-js           | 8.8.0   | Stripe.js loader                          |
| @dnd-kit/core               | 6.3.1   | Drag-and-drop framework                   |
| @dnd-kit/sortable           | 10.0.0  | Sortable lists                            |
| @dnd-kit/utilities          | 3.2.2   | DnD utilities                             |
| react-hot-toast             | 2.6.0   | Toast notifications                       |
| Vitest                      | 4.0.18  | Unit testing                              |
| @testing-library/react      | 16.3.2  | Component testing                         |
| @testing-library/jest-dom   | 6.9.1   | DOM matchers                              |
| @testing-library/user-event | 14.6.1  | User interaction simulation               |
| ESLint                      | 9.39.3  | Linting                                   |
| Prettier                    | 3.8.1   | Code formatting                           |
| PostCSS                     | 8.4.47  | CSS processing                            |
| Autoprefixer                | 10.4.24 | Vendor prefixing                          |

---

## 3. Folder Structure

```
frontend/
├── index.html                     # HTML entry point
├── vite.config.js                 # Vite config (proxy, aliases, chunking)
├── tailwind.config.js             # Tailwind theme (primary color scale, Inter font)
├── postcss.config.js              # PostCSS plugins
├── eslint.config.js               # ESLint flat config
├── package.json
├── public/
│   └── images/                    # Static product/variant images
└── src/
    ├── main.jsx                   # App entry — ErrorBoundary → Redux Provider → BrowserRouter → Toaster
    ├── App.jsx                    # Route definitions, CSRF init, auth session restore
    ├── index.css                  # Global styles + Tailwind directives
    ├── assets/                    # Static assets (images, fonts)
    ├── components/
    │   ├── common/                # ProtectedRoute, ErrorBoundary, ErrorAlert, FieldError, ConfirmDialog, LazyImage, StoreNav, Toast
    │   ├── layout/                # StoreHeader, StoreFooter
    │   ├── product/               # ProductCard
    │   ├── checkout/              # AddressPicker, SearchableSelect, StripeCardSection
    │   └── admin/                 # AdminTheme
    ├── pages/
    │   ├── HomePage.jsx           # Landing page
    │   ├── ProductsPage.jsx       # Product listing with filters
    │   ├── ProductDetailPage.jsx  # Single product detail
    │   ├── CategoryPage.jsx       # Category-filtered products
    │   ├── CartPage.jsx           # Shopping cart
    │   ├── CheckoutPage.jsx       # Checkout flow with Stripe
    │   ├── WishlistPage.jsx       # Wishlist
    │   ├── NotFound.jsx           # 404 page
    │   ├── auth/                  # LoginPage, RegisterPage, ForgotPasswordPage, ResetPasswordPage
    │   ├── account/               # AccountDashboard, AccountOrders, AccountProfile, AccountAddresses, AccountReturns, AccountWishlist, AccountReviews
    │   └── admin/                 # Dashboard, products/, categories/, users/, banners/, brands/, discounts/, coupons/, variants/, orders/, reviews/, settings/
    ├── services/
    │   ├── apiClient.js           # Singleton HTTP client with CSRF, interceptors, error normalization
    │   ├── authService.js         # Auth operations, user session management
    │   ├── brandService.js        # Brand CRUD
    │   ├── couponService.js       # Coupon CRUD
    │   ├── discountService.js     # Discount CRUD
    │   ├── reviewService.js       # Review CRUD
    │   ├── settingsService.js     # Site settings
    │   ├── paymentService.js      # Stripe config and payment intents
    │   └── imageService.js        # Local image URL resolution and caching
    ├── store/
    │   ├── index.js               # Redux store configuration
    │   └── slices/                # authSlice, cartSlice, productSlice
    ├── hooks/
    │   ├── index.js               # 12 custom hooks
    │   └── useWishlistCount.js    # Wishlist count hook
    ├── context/
    │   ├── siteSettingsContextStore.js  # Context creation + defaults
    │   ├── SiteSettingsContext.jsx      # Provider component
    │   └── useSiteSettings.js          # Consumer hook
    ├── layouts/
    │   ├── PublicLayout.jsx       # Storefront layout (header + footer)
    │   ├── AdminLayout.jsx        # Admin panel layout (sidebar + header)
    │   ├── UserLayout.jsx         # User account layout (sidebar + header)
    │   └── MainLayout.jsx         # Simple layout (unused)
    ├── utils/                     # Helper functions (see section below)
    ├── constants/
    │   └── index.js               # API config, image config, product config, UI config, validation rules
    └── test/
        └── setup.js               # Vitest setup
```

---

## 4. Routing

All routes are lazy-loaded via `React.lazy()` with a `<Suspense>` fallback showing `<PageSkeleton>` (animated skeleton with header bar and 8 card placeholders).

### App Initialization

On mount, `App.jsx`:

1. Fetches CSRF token from `GET /api/auth/csrf-token` to establish the `_csrf` cookie.
2. If `authService.isAuthenticated()` (localStorage has `auth_user`), calls `authService.getCurrentUser()` to verify the session cookie is still valid. On 401, calls `authService.reset()` to clear stale local state.
3. Clears legacy recently-viewed data via `clearLegacyRecentlyViewed()`.

### Public Routes (wrapped in `<PublicLayout>`)

| Path                | Component               | Protected |
| ------------------- | ----------------------- | --------- |
| `/`                 | `HomePage`              | No        |
| `/products`         | `ProductsPage`          | No        |
| `/products/:id`     | `ProductDetailPage`     | No        |
| `/categories`       | `ProductsPage`          | No        |
| `/categories/:slug` | `CategoryPage`          | No        |
| `/cart`             | `CartPage`              | User      |
| `/checkout`         | `CheckoutPage`          | User      |
| `/wishlist`         | `WishlistPage`          | User      |
| `/login`            | `LoginPage`             | No        |
| `/register`         | `RegisterPage`          | No        |
| `/forgot-password`  | `ForgotPasswordPage`    | No        |
| `/reset-password`   | `ResetPasswordPage`     | No        |
| `/dashboard`        | Redirects to `/account` | —         |

### Admin Routes (wrapped in `<ProtectedRoute requireAdmin>` → `<SiteSettingsProvider>` → `<AdminLayout>`)

| Path                             | Component             |
| -------------------------------- | --------------------- |
| `/admin`                         | `Dashboard`           |
| `/admin/products`                | `ProductsList`        |
| `/admin/products/create`         | `ProductForm`         |
| `/admin/products/:id/edit`       | `ProductForm`         |
| `/admin/categories`              | `CategoriesList`      |
| `/admin/categories/tree`         | `CategoryTreeManager` |
| `/admin/categories/create`       | `CategoryEditorPage`  |
| `/admin/categories/:id/edit`     | `CategoryEditorPage`  |
| `/admin/categories/list`         | `CategoriesList`      |
| `/admin/users`                   | `UsersList`           |
| `/admin/users/create`            | `UserForm`            |
| `/admin/users/:id/edit`          | `UserForm`            |
| `/admin/banners`                 | `BannersList`         |
| `/admin/banners/create`          | `BannerForm`          |
| `/admin/banners/:id/edit`        | `BannerForm`          |
| `/admin/brands`                  | `BrandsList`          |
| `/admin/brands/create`           | `BrandForm`           |
| `/admin/brands/:id/edit`         | `BrandForm`           |
| `/admin/discounts`               | `DiscountsList`       |
| `/admin/discounts/create`        | `DiscountForm`        |
| `/admin/discounts/:id/edit`      | `DiscountForm`        |
| `/admin/coupons`                 | `CouponsList`         |
| `/admin/coupons/create`          | `CouponForm`          |
| `/admin/coupons/:id/edit`        | `CouponForm`          |
| `/admin/variant-type`            | `VariantTypesList`    |
| `/admin/variant-type/create`     | `VariantTypeForm`     |
| `/admin/variant-type/:id`        | `VariantTypeView`     |
| `/admin/variant-type/:id/edit`   | `VariantTypeForm`     |
| `/admin/variant-option`          | `VariantOptionsList`  |
| `/admin/variant-option/create`   | `VariantOptionForm`   |
| `/admin/variant-option/:id/edit` | `VariantOptionForm`   |
| `/admin/orders`                  | `OrdersList`          |
| `/admin/reviews`                 | `ReviewsList`         |
| `/admin/settings`                | `SettingsPage`        |

### User Account Routes (wrapped in `<ProtectedRoute>` → `<SiteSettingsProvider>` → `<UserLayout>`)

| Path                 | Component          |
| -------------------- | ------------------ |
| `/account`           | `AccountDashboard` |
| `/account/orders`    | `AccountOrders`    |
| `/account/profile`   | `AccountProfile`   |
| `/account/addresses` | `AccountAddresses` |
| `/account/returns`   | `AccountReturns`   |
| `/account/wishlist`  | `AccountWishlist`  |
| `/account/reviews`   | `AccountReviews`   |

### Catch-All

| Path | Component  |
| ---- | ---------- |
| `*`  | `NotFound` |

---

## 5. State Management

### Store Configuration

```javascript
configureStore({
  reducer: { auth, cart, product },
  middleware: getDefaultMiddleware({ serializableCheck: false }),
});
```

### authSlice

| Property          | Type           | Description                        |
| ----------------- | -------------- | ---------------------------------- |
| `user`            | Object \| null | Current user `{ _id, role, name }` |
| `isAuthenticated` | Boolean        | Authentication status              |
| `loading`         | Boolean        | Auth operation in progress         |

| Reducer          | Action                                       |
| ---------------- | -------------------------------------------- |
| `setCredentials` | Sets `user` and `isAuthenticated: true`      |
| `logout`         | Clears `user`, sets `isAuthenticated: false` |
| `setLoading`     | Sets loading boolean                         |

Auth logic (login, register, token management) lives in `authService.js`, not in thunks. The slice holds last-known state dispatched from the service layer.

### cartSlice

| Property      | Type    | Description                |
| ------------- | ------- | -------------------------- |
| `items`       | Array   | Cart items                 |
| `totalItems`  | Number  | Sum of quantities          |
| `totalAmount` | Number  | Sum of price × quantity    |
| `loading`     | Boolean | Cart operation in progress |

| Reducer      | Action                                                      |
| ------------ | ----------------------------------------------------------- |
| `setCart`    | Replaces items, recalculates totals via `calculateTotals()` |
| `clearCart`  | Resets to empty                                             |
| `setLoading` | Sets loading boolean                                        |

Cart is server-managed. The slice holds the last-known snapshot for optimistic UI rendering.

### productSlice

| Property     | Type           | Description              |
| ------------ | -------------- | ------------------------ |
| `products`   | Array          | Product list             |
| `product`    | Object \| null | Single product detail    |
| `loading`    | Boolean        | Loading state            |
| `error`      | String \| null | Error message            |
| `filters`    | Object         | Active filter criteria   |
| `pagination` | Object         | `{ page, limit, total }` |

| Reducer         | Action                         |
| --------------- | ------------------------------ |
| `setProducts`   | Replaces products array        |
| `setProduct`    | Sets single product            |
| `setLoading`    | Sets loading boolean           |
| `setError`      | Sets error                     |
| `setFilters`    | Shallow merges into filters    |
| `clearFilters`  | Resets to `{}`                 |
| `setPagination` | Shallow merges into pagination |

---

## 6. API Communication

### apiClient (Singleton)

The `ApiClient` class wraps `fetch()` with:

- **Base URL:** `http://localhost:5001` (configurable via `API_CONFIG.BASE_URL`)
- **Timeout:** 30,000ms
- **Credentials:** `include` (sends cookies on every request)
- **CSRF:** Reads `csrfToken` cookie, attaches `X-CSRF-Token` header on non-GET/HEAD/OPTIONS requests
- **Content-Type:** Auto-set to `application/json` unless body is `FormData`

**Request interceptors:** Adds `metadata.startTime` for duration tracking.

**Response interceptors:** Logs `[API] METHOD url - Xms` for every response.

**Error handling:** On 401 (except login/register endpoints) → clears `auth_user` from localStorage, dispatches `auth:logout` custom event, shows toast, redirects to `/login`.

**Error normalization:**

| Scenario              | Error Shape                           |
| --------------------- | ------------------------------------- |
| AbortError (timeout)  | `{ type: 'TIMEOUT' }`                 |
| Server error response | `{ type: 'API_ERROR', status, data }` |
| Network failure       | `{ type: 'NETWORK_ERROR' }`           |

**Methods:** `get()`, `post()`, `put()`, `patch()`, `delete()`, `upload()` (XHR-based with progress callback).

### authService (Singleton)

Manages authentication state across localStorage (`auth_user` key storing `{ _id, role, name }` only), in-memory cache, and server cookies.

| Method                               | Endpoint                         | Notes                                                 |
| ------------------------------------ | -------------------------------- | ----------------------------------------------------- |
| `login(email, password, rememberMe)` | `POST /api/auth/login`           | Stores sanitized user, emits `auth:login` event       |
| `register(userData)`                 | `POST /api/auth/register`        | Strips `confirmPassword` and `role` before sending    |
| `logout()`                           | `POST /api/auth/logout`          | Calls `reset()` to clear all local state              |
| `getCurrentUser()`                   | `GET /api/auth/me`               | Deduplicates concurrent calls via `_pendingUserFetch` |
| `updateProfile(data)`                | `PUT /api/auth/profile`          | —                                                     |
| `changePassword(current, new)`       | `PUT /api/auth/change-password`  | Validates min 8 chars before sending                  |
| `forgotPassword(email)`              | `POST /api/auth/forgot-password` | —                                                     |
| `resetPassword(token, newPassword)`  | `POST /api/auth/reset-password`  | —                                                     |
| `getUser()`                          | —                                | Returns from cache or localStorage                    |
| `isAuthenticated()`                  | —                                | `!!getUser()`                                         |
| `isAdmin()`                          | —                                | `user.role === 'admin'`                               |
| `getCsrfToken()`                     | —                                | Reads `csrfToken` cookie                              |
| `reset()`                            | —                                | Clears cache + localStorage                           |

Listens for `auth:logout` custom events to clear state when 401 is detected elsewhere.

### Service Files

| Service             | Endpoints                                                                                                                                    |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| **brandService**    | `GET/POST /api/brands`, `GET /api/brands/:slug`, `GET /api/brands/:slug/products`, `PUT/DELETE /api/brands/:id`                              |
| **couponService**   | `GET/POST /api/coupons`, `GET/PUT/DELETE /api/coupons/:id`                                                                                   |
| **discountService** | `GET/POST /api/discounts`, `GET /api/discounts/form-options`, `GET/PUT/DELETE /api/discounts/:id`                                            |
| **reviewService**   | `GET /api/reviews/product/:productId`, `POST /api/reviews`, `PUT/DELETE /api/reviews/:id`, `GET /api/reviews`, `PUT /api/reviews/:id/status` |
| **settingsService** | `GET/PUT /api/settings`, `POST /api/settings/test-email`                                                                                     |
| **paymentService**  | `GET /api/payments/config`, `POST /api/payments/create-intent`                                                                               |
| **imageService**    | No API calls. Resolves local image URLs from `public/images/` with hardcoded product (56) and variant (35) image arrays                      |

### authFetch Utility

Drop-in `fetch()` wrapper in `utils/authFetch.js` that adds `credentials: 'include'` and `X-CSRF-Token` header. Used by some components that call endpoints directly without going through `apiClient`.

---

## 7. Feature Flows

### Authentication Flow

1. **Login:** `LoginPage` renders email/password form with demo quick-login buttons (admin/user credentials from env vars). On submit → `authService.login()` → API call → stores `{ _id, role, name }` in localStorage → dispatches `setCredentials` to Redux → redirects to `/` or previous page.
2. **Register:** `RegisterPage` renders name/email/password/confirmPassword form → `authService.register()` → same storage/redirect flow.
3. **Session Restore:** On app mount, if `auth_user` exists in localStorage, `authService.getCurrentUser()` verifies the cookie session against the server. On 401, resets local state.
4. **Logout:** Calls `POST /api/auth/logout` → `authService.reset()` → dispatches `logout` to Redux → redirect to `/login`.

### Product Browsing

1. **ProductsPage:** Fetches products from `GET /api/products` with query params for pagination, sorting, category/brand/price filters. Uses URL search params for state persistence across page loads.
2. **ProductDetailPage:** Fetches product by slug from `GET /api/products/:slug`. Renders variant selection (color/size selectors), image gallery, pricing, reviews. Variant products redirect to PDP on card click; non-variant products allow direct add-to-cart from cards.
3. **CategoryPage:** Fetches category by slug, then products filtered by that category.

### Cart & Checkout

1. **CartPage:** Fetches cart from `GET /api/cart` (server-computed pricing with discounts). Renders items with quantity controls, per-item pricing, summary with subtotal/shipping/total.
2. **CheckoutPage:** Multi-step flow — shipping address (with `AddressPicker` for saved addresses and `SearchableSelect` for state selection) → payment method selection → Stripe card input (`StripeCardSection` using Stripe Elements) → order placement. Free shipping for orders ≥$100.
3. **Payment Flow:** Fetches Stripe publishable key from `GET /api/payments/config` → loads Stripe.js → creates PaymentIntent via `POST /api/payments/create-intent` with idempotency key → confirms payment client-side → submits order to `POST /api/orders`.

### Wishlist

1. `WishlistPage` fetches items from `GET /api/wishlist`.
2. Items can be moved to cart via `POST /api/wishlist/:id/move-to-cart`.
3. `useWishlistCount` hook polls count on window focus and listens for `wishlist:changed` custom events.

### Admin Dashboard

1. `Dashboard` fetches `GET /api/orders/admin/summary` for aggregated stats: total orders, revenue, average order value, status breakdown, payment method breakdown, daily orders (last 30 days), recent orders.
2. Each admin CRUD module follows the same pattern: List page (paginated table with search/filters) + Form page (create/edit with React Hook Form + Yup validation).

### Category Management

1. `CategoriesList` — paginated list with search and status filters.
2. `CategoryTreeManager` — drag-and-drop tree view using `@dnd-kit` for reordering and reparenting categories.
3. `CategoryEditorPage` wraps `CategoryForm` — handles parent selection, image upload, SEO fields, brand/filter associations.

### Reviews

1. `AccountReviews` — user's submitted reviews.
2. `ProductDetailPage` shows product reviews and a review form (only for users with verified purchase).
3. `ReviewsList` (admin) — filterable/searchable review moderation with status toggle.

---

## 8. Protected Routes

### ProtectedRoute Component

Located at `components/common/ProtectedRoute.jsx`.

**Props:**

| Prop           | Type      | Default | Description                 |
| -------------- | --------- | ------- | --------------------------- |
| `requireAdmin` | Boolean   | `false` | Requires `role === 'admin'` |
| `children`     | ReactNode | —       | Protected content           |

**Behavior:**

1. Calls `authService.isAuthenticated()` — checks if `auth_user` exists in localStorage.
2. If not authenticated → redirects to `/login`.
3. If `requireAdmin` is true → calls `authService.isAdmin()` — checks `user.role === 'admin'`.
4. If not admin → redirects to `/login`.
5. If all checks pass → renders `children` (or `<Outlet>` for nested routes).

**Usage in routes:**

- User-protected routes (cart, checkout, wishlist, account) wrap content in `<ProtectedRoute>`.
- Admin routes wrap in `<ProtectedRoute requireAdmin={true}>`.
- Both admin and user route groups inject `<SiteSettingsProvider>` between `ProtectedRoute` and the layout.

### 401 Handling

When `apiClient` receives a 401 response (from any endpoint except login/register):

1. Clears `auth_user` from localStorage.
2. Dispatches `auth:logout` custom event (which `authService` listens for to run `reset()`).
3. Shows error toast.
4. Redirects to `/login`.

This handles session expiry transparently — the user is redirected without stale UI.

---

## 9. Reusable Components

### Common Components (`components/common/`)

| Component          | Props                                                                                         | Description                                                                                                                                                                       |
| ------------------ | --------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ProtectedRoute** | `requireAdmin`, `children`                                                                    | Route guard with auth + role check. Redirects to `/login` if unauthorized                                                                                                         |
| **ErrorBoundary**  | `children`                                                                                    | React error boundary. Catches render errors and displays fallback UI with error details (shown only when `import.meta.env.DEV` is true for Vite compatibility) and retry button   |
| **ErrorAlert**     | `message`, `className`                                                                        | Styled red alert box for displaying error messages                                                                                                                                |
| **FieldError**     | `message`                                                                                     | Inline form field error message (red text below input)                                                                                                                            |
| **ConfirmDialog**  | `isOpen`, `title`, `message`, `onConfirm`, `onCancel`, `confirmText`, `cancelText`, `variant` | Modal confirmation dialog with configurable button styles (danger/primary)                                                                                                        |
| **LazyImage**      | `src`, `alt`, `className`, `fallback`, `onLoad`, `onError`                                    | Three-slot image loader: shimmer placeholder on first load with fade-in transition, left/right slide transitions on subsequent source changes. Handles image errors with fallback |
| **StoreNav**       | —                                                                                             | Store navigation bar component                                                                                                                                                    |
| **Toast**          | —                                                                                             | Toast notification component                                                                                                                                                      |

### Layout Components (`components/layout/`)

| Component       | Description                                                                                                                                                                                                                                                                                                                                                                                 |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **StoreHeader** | Public storefront header. Fixed position with logo (from site settings), navigation links (Home, Products, Categories), search bar, cart icon with item count badge, wishlist icon with count badge, user menu (login/register or profile/admin/logout dropdown). Mobile hamburger menu with slide-out navigation. Uses `useSiteSettings()` for branding and `useWishlistCount()` for badge |
| **StoreFooter** | Public storefront footer. Company info from site settings, navigation links, social media icons, newsletter signup, copyright. Fetches settings from `GET /api/settings/public`                                                                                                                                                                                                             |

### Product Components (`components/product/`)

| Component       | Description                                                                                                                                                                                                                                                   |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ProductCard** | Product card for listings. Shows image (with `LazyImage`), title, price/discount, rating stars, add-to-cart button. Variant products link to PDP on click. Non-variant products allow direct add to cart from the card. Never shows variant selectors on card |

### Checkout Components (`components/checkout/`)

| Component             | Props                                                           | Description                                                                                                |
| --------------------- | --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| **AddressPicker**     | `addresses`, `selectedId`, `onSelect`, `onAddNew`               | Displays saved addresses as selectable cards with default address highlighting                             |
| **SearchableSelect**  | `options`, `value`, `onChange`, `placeholder`, `label`, `error` | Dropdown with search/filter functionality for long option lists (e.g., US states)                          |
| **StripeCardSection** | `clientSecret`, `onPaymentSuccess`, `onPaymentError`            | Stripe Elements card input. Renders `CardElement` within `Elements` provider, handles payment confirmation |

### Admin Components (`components/admin/`)

| Component      | Description                                 |
| -------------- | ------------------------------------------- |
| **AdminTheme** | Admin panel theme/styling wrapper component |

### Layouts (`layouts/`)

| Layout           | Structure                                                                                                                                                                                                                                                                                   | Used By            |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ |
| **PublicLayout** | `SiteSettingsProvider` → `StoreHeader` → `<main>` (with 105px top padding for fixed header) → `<Outlet>` → `StoreFooter`                                                                                                                                                                    | All public routes  |
| **AdminLayout**  | Fixed header (sidebar toggle, branding, "View Site" link, user info, logout) + collapsible sidebar (72rem open / 0 closed) with icon-based nav menu (Dashboard, Products, Categories, Users, Orders, Banners, Brands, Discounts, Coupons, Variants submenu, Reviews, Settings) → `<Outlet>` | All admin routes   |
| **UserLayout**   | Fixed header (sidebar toggle, avatar, "Back to Store", logout) + collapsible sidebar (w-64) with user card (avatar, name, email, "Customer" badge) + nav menu (Account, Orders, Returns, Profile, Addresses, Wishlist, Reviews) + quick links (Shop, Cart) → `<Outlet>`                     | All account routes |

---

## Appendix: Custom Hooks

| Hook                | Signature                   | Return                                                                                                      | Purpose                                                                         |
| ------------------- | --------------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `useDebounce`       | `(value, delay=500)`        | `debouncedValue`                                                                                            | Debounces any value                                                             |
| `useAsync`          | `(asyncFn, immediate=true)` | `{ data, loading, error, status, execute, reset }`                                                          | Manages async operation lifecycle                                               |
| `useLocalStorage`   | `(key, initialValue)`       | `[storedValue, setValue, removeValue]`                                                                      | Typed localStorage with JSON                                                    |
| `useClickOutside`   | `(handler)`                 | `ref`                                                                                                       | Detects clicks outside a ref element                                            |
| `useWindowSize`     | `()`                        | `{ width, height }`                                                                                         | Tracks window dimensions                                                        |
| `useMediaQuery`     | `(query)`                   | `matches`                                                                                                   | CSS media query match                                                           |
| `usePrevious`       | `(value)`                   | `previousValue`                                                                                             | Previous render's value                                                         |
| `useInterval`       | `(callback, delay)`         | —                                                                                                           | setInterval with cleanup                                                        |
| `useForm`           | `(initialValues={})`        | `{ values, handleChange, reset, setValues }`                                                                | Simple form state                                                               |
| `usePagination`     | `(items, perPage=10)`       | `{ currentPage, totalPages, currentItems, goToPage, nextPage, previousPage, hasNextPage, hasPreviousPage }` | Client-side pagination                                                          |
| `useToggle`         | `(initial=false)`           | `[state, toggle, setTrue, setFalse]`                                                                        | Boolean toggle                                                                  |
| `useScrollPosition` | `()`                        | `{ x, y }`                                                                                                  | Window scroll position                                                          |
| `useWishlistCount`  | `()`                        | `{ count, refresh }`                                                                                        | Wishlist count from API, refreshes on `wishlist:changed` event and window focus |

## Appendix: Utility Modules

### utils/index.js — General Utilities

`formatPrice`, `calculateDiscountPrice`, `calculateSavings`, `isValidEmail`, `isValidPhone`, `validatePassword` (returns `{ isValid, strength, message, criteria }`), `debounce`, `throttle`, `deepClone`, `generateId`, `capitalizeWords`, `truncateText`, `createSlug`, `formatDate`, `timeAgo`, `isMobile`, `scrollToTop`, `getRandomItems`, `isEmpty`, `storage` (localStorage wrapper with `set`/`get`/`remove`/`clear`).

### utils/productUtils.js — Product Pricing

`formatPrice`, `calculateDiscountPrice`, `getProductDisplayPricing` (resolves variant-based/range pricing with selected variant and fallbacks), `calculateDiscountPercentage`, `formatDiscountLabel`, `calculateSavings`, `hasDiscount`, `getPriceRange`, `formatPriceRange`, `isValidPrice`, `calculateTax`, `calculatePriceWithTax`.

### utils/errorUtils.js — API Error Processing

`processApiError` (extracts `{ fieldErrors, errorMessages, generalError }` from API responses — includes a single `logger.debug` call for error processing, no verbose stack tracing), `getFieldClasses` (returns Tailwind CSS classes — red for error, blue for valid), `getFieldError`, `hasFieldError`.

### utils/formValidation.js — Form Validation Helpers

`getFieldBorderClass`, `clearFieldError`, `mapServerFieldErrors`, `hasValidationErrors`, `getValidationMessages`, `applyServerFieldErrors`.

### utils/notify.js — Toast Notifications

`getApiErrorMessage`, `getErrorMessage`, `notify.success()`, `notify.error()` (auto-extracts message from any error type), `notify.info()`.

### utils/imageUrl.js — Image URL Resolution

`getImageSource` (extracts path from string or `{ path, url, src }` object), `resolveImageUrl` (handles absolute URLs, `/images/`, `/uploads/`, relative paths, placeholder fallback), `getPrimaryProductImage` (finds primary image from product or active variant images).

### utils/currency.js — Currency Formatting

`formatCurrency(amount, settings, locale)` — formats using settings-based currency code/symbol.

### utils/recentlyViewed.js — Recently Viewed Products

`addRecentlyViewed` (stores in localStorage scoped by `role:userId` or `guest`, max 20), `getRecentlyViewed`, `clearRecentlyViewed`, `removeRecentlyViewed`, `clearLegacyRecentlyViewed` (removes old unscoped key).

### utils/bannerLink.js — Banner URL Resolution

`resolveBannerAction(banner)` — returns `{ href, target, external }` based on `linkType` (discount/product/category/custom).

### utils/authFetch.js — Fetch Wrapper

`getAuthHeaders()` (reads `csrfToken` cookie), `authFetch(url, options)` (wraps `fetch()` with credentials and CSRF header).

### utils/logger.js — Frontend Logger

`logger` object with `info`/`warn`/`error`/`debug`. In production, only `error` passes through; `info`, `warn`, and `debug` are suppressed (noop). Fully suppressed (noop) in test environment. In development, all levels map to their `console.*` equivalents. All frontend modules use `logger` instead of raw `console.*` calls.

## Appendix: Build Configuration

### Vite (`vite.config.js`)

- **Plugin:** `@vitejs/plugin-react`
- **Dev server:** Port 5173, proxy `/api` → `http://localhost:5001` (changeOrigin)
- **Build target:** ES2020, no sourcemaps, CSS code splitting, chunk size warning at 900KB
- **Manual chunks:** `react` (react + react-dom + react-router-dom), `redux` (@reduxjs/toolkit + react-redux)
- **Path aliases:** `@` → `./src`, plus `@/components`, `@/pages`, `@/hooks`, `@/store`, `@/services`, `@/utils`, `@/types`, `@/assets`
- **Test:** jsdom environment, globals enabled, setup file `./src/test/setup.js`

### Tailwind CSS (`tailwind.config.js`)

- **Content:** `./index.html`, `./src/**/*.{js,ts,jsx,tsx}`
- **Primary color scale:** Blue palette (50–950), base `#3b82f6` at 500
- **Font family:** `Inter, sans-serif`
- **Plugins:** None

## Appendix: Constants (`constants/index.js`)

| Export               | Description                                                                                                                 |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `API_CONFIG`         | Base URL, 18 endpoint paths, timeout (10s), retry attempts (3)                                                              |
| `DEMO_AUTH_CONFIG`   | Admin/user demo credentials from env vars                                                                                   |
| `IMAGE_CONFIG`       | Base path, product/variant paths, placeholder, supported formats, max size (5MB)                                            |
| `PRODUCT_CONFIG`     | Items per page (20), max per request (100), featured limit (8), related limit (4), max images (10), default sort (`newest`) |
| `UI_CONFIG`          | Breakpoints (SM–2XL), grid columns, debounce delay (300ms), animation duration (200ms)                                      |
| `PRODUCT_STATUS`     | `ACTIVE`, `INACTIVE`, `DRAFT`, `ARCHIVED`                                                                                   |
| `PRODUCT_CONDITIONS` | `NEW`, `HOT`, `SALE`, `DEFAULT`                                                                                             |
| `CURRENCY_CONFIG`    | USD, `$`, `en-US`, 2 decimal places                                                                                         |
| `SORT_OPTIONS`       | newest, price-low, price-high, rating, popularity                                                                           |
| `FILTER_CONFIG`      | 5 price ranges, rating threshold (1), max rating (5)                                                                        |
| `ERROR_MESSAGES`     | Network, server, not found, validation, unauthorized, image load, generic                                                   |
| `SUCCESS_MESSAGES`   | Cart, wishlist, order, profile, email                                                                                       |
| `STORAGE_KEYS`       | Cart, wishlist, user preferences, theme, language, search history                                                           |
| `VALIDATION_RULES`   | Email/phone regex, min/max lengths                                                                                          |
| `SEO_CONFIG`         | Default title, description, keywords, separator, max title/description lengths                                              |
| `THEME_CONFIG`       | 6 colors, 3 animation speeds (fast/normal/slow)                                                                             |
