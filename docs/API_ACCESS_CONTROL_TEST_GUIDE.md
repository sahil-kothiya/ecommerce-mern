# API Access Control Test Guide

> **Last Updated:** February 26, 2026  
> **Version:** 1.0.0  
> **Purpose:** Comprehensive RBAC testing matrix for all API endpoints

---

## 🎯 Overview

This document provides a complete test matrix for all API endpoints with role-based access control verification. Use this guide to ensure proper authentication and authorization across the entire platform.

## 🔐 Authentication Mechanism

- **Method:** JWT tokens stored in HTTP-only cookies
- **Token Expiry:** 7 days (development), 15 minutes (production with refresh)
- **Cookie Settings:** `HttpOnly`, `SameSite=Strict`, `Secure` (production only)
- **CSRF Protection:** Required for all non-GET requests

## 👥 User Roles

### **Admin**

- Full system access
- Can manage all resources
- Can access all admin panel routes
- Can modify any user data

### **User / Customer**

- Limited to own resources
- Can view public data
- Can create orders, reviews, manage cart
- Cannot access admin routes

### **Public (No Auth)**

- Read-only access to public resources
- Products, categories, public listings only
- Cannot place orders or access protected routes

---

## 📋 API Access Matrix

### ✅ Legend

- ✅ **200/201** - Success (allowed)
- 🚫 **401** - Unauthorized (not logged in)
- ⛔ **403** - Forbidden (wrong role)
- 🔓 **Public** - No auth required

---

## 1️⃣ Authentication APIs

| Method | Endpoint                    | Public | User | Admin | Expected Status | Notes                              |
| ------ | --------------------------- | ------ | ---- | ----- | --------------- | ---------------------------------- |
| POST   | `/api/auth/register`        | ✅     | ✅   | ✅    | 201             | Creates new user account           |
| POST   | `/api/auth/login`           | ✅     | ✅   | ✅    | 200             | Returns user + JWT token in cookie |
| POST   | `/api/auth/logout`          | 🚫     | ✅   | ✅    | 200             | Clears auth cookie                 |
| GET    | `/api/auth/me`              | 🚫     | ✅   | ✅    | 200             | Returns current user profile       |
| PUT    | `/api/auth/profile`         | 🚫     | ✅   | ✅    | 200             | Updates own profile only           |
| PUT    | `/api/auth/change-password` | 🚫     | ✅   | ✅    | 200             | Changes own password               |
| POST   | `/api/auth/refresh-token`   | ✅     | ✅   | ✅    | 200             | Refreshes expired access token     |
| POST   | `/api/auth/forgot-password` | ✅     | ✅   | ✅    | 200             | Sends password reset email         |
| POST   | `/api/auth/reset-password`  | ✅     | ✅   | ✅    | 200             | Resets password with valid token   |
| GET    | `/api/auth/addresses`       | 🚫     | ✅   | ✅    | 200             | Lists own addresses                |
| POST   | `/api/auth/addresses`       | 🚫     | ✅   | ✅    | 201             | Creates new address                |
| PUT    | `/api/auth/addresses/:id`   | 🚫     | ✅   | ✅    | 200             | Updates own address                |
| DELETE | `/api/auth/addresses/:id`   | 🚫     | ✅   | ✅    | 200             | Deletes own address                |
| GET    | `/api/auth/csrf-token`      | ✅     | ✅   | ✅    | 200             | Returns CSRF token cookie          |

**Test Scenarios:**

- [ ] Public hits `/api/auth/me` → 401
- [ ] User updates own profile → 200
- [ ] User tries to change role in profile → server ignores field
- [ ] Admin updates own profile → 200
- [ ] Token expired hits protected route → 401

---

## 2️⃣ User Management APIs

| Method | Endpoint         | Public | User | Admin | Expected Status | Notes                        |
| ------ | ---------------- | ------ | ---- | ----- | --------------- | ---------------------------- |
| GET    | `/api/users`     | 🚫     | ⛔   | ✅    | 200 / 403       | Admin only - lists all users |
| GET    | `/api/users/:id` | 🚫     | ⛔   | ✅    | 200 / 403       | Admin only - view any user   |
| POST   | `/api/users`     | 🚫     | ⛔   | ✅    | 201 / 403       | Admin only - create user     |
| PUT    | `/api/users/:id` | 🚫     | ⛔   | ✅    | 200 / 403       | Admin only - update any user |
| DELETE | `/api/users/:id` | 🚫     | ⛔   | ✅    | 200 / 403       | Admin only - delete user     |

**Test Scenarios:**

- [ ] User hits `/api/users` → 403 Forbidden
- [ ] Admin hits `/api/users` → 200 OK
- [ ] User tries to delete another user → 403
- [ ] Admin deletes user → 200

---

## 3️⃣ Product APIs

| Method | Endpoint                  | Public | User | Admin | Expected Status | Notes                       |
| ------ | ------------------------- | ------ | ---- | ----- | --------------- | --------------------------- |
| GET    | `/api/products`           | ✅     | ✅   | ✅    | 200             | Public product listing      |
| GET    | `/api/products/featured`  | ✅     | ✅   | ✅    | 200             | Featured products           |
| GET    | `/api/products/search`    | ✅     | ✅   | ✅    | 200             | Product search              |
| GET    | `/api/products/:slug`     | ✅     | ✅   | ✅    | 200             | Public product detail       |
| GET    | `/api/products/admin/:id` | 🚫     | ⛔   | ✅    | 200 / 403       | Admin - view any status     |
| POST   | `/api/products`           | 🚫     | ⛔   | ✅    | 201 / 403       | Admin only - create product |
| PUT    | `/api/products/:id`       | 🚫     | ⛔   | ✅    | 200 / 403       | Admin only - update product |
| DELETE | `/api/products/:id`       | 🚫     | ⛔   | ✅    | 200 / 403       | Admin only - delete product |

**Test Scenarios:**

- [ ] Public views active products → 200
- [ ] Public views inactive products → 404
- [ ] Admin views inactive products → 200
- [ ] User tries to create product → 403
- [ ] Admin creates product → 201

---

## 4️⃣ Category APIs

| Method | Endpoint                     | Public | User | Admin | Expected Status | Notes                      |
| ------ | ---------------------------- | ------ | ---- | ----- | --------------- | -------------------------- |
| GET    | `/api/categories`            | ✅     | ✅   | ✅    | 200             | Public category list       |
| GET    | `/api/categories/tree`       | ✅     | ✅   | ✅    | 200             | Hierarchical category tree |
| GET    | `/api/categories/:id`        | ✅     | ✅   | ✅    | 200             | Public category detail     |
| GET    | `/api/categories/slug/:slug` | ✅     | ✅   | ✅    | 200             | Get category by slug       |
| POST   | `/api/categories`            | 🚫     | ⛔   | ✅    | 201 / 403       | Admin only                 |
| PUT    | `/api/categories/:id`        | 🚫     | ⛔   | ✅    | 200 / 403       | Admin only                 |
| DELETE | `/api/categories/:id`        | 🚫     | ⛔   | ✅    | 200 / 403       | Admin only                 |

**Test Scenarios:**

- [ ] Public views categories → 200
- [ ] User tries to create category → 403
- [ ] Admin creates category → 201

---

## 5️⃣ Order APIs

| Method | Endpoint                    | Public | User | Admin | Expected Status | Notes                        |
| ------ | --------------------------- | ------ | ---- | ----- | --------------- | ---------------------------- |
| GET    | `/api/orders`               | 🚫     | ✅   | ✅    | 200             | User: own orders, Admin: all |
| GET    | `/api/orders/:id`           | 🚫     | ✅\* | ✅    | 200 / 403       | \*User: own order only       |
| POST   | `/api/orders`               | 🚫     | ✅   | ✅    | 201             | Create new order             |
| GET    | `/api/orders/admin/all`     | 🚫     | ⛔   | ✅    | 200 / 403       | Admin only - all orders      |
| GET    | `/api/orders/admin/summary` | 🚫     | ⛔   | ✅    | 200 / 403       | Admin only - statistics      |
| PUT    | `/api/orders/:id/status`    | 🚫     | ⛔   | ✅    | 200 / 403       | Admin only - update status   |
| POST   | `/api/orders/:id/cancel`    | 🚫     | ✅\* | ✅    | 200 / 403       | \*User: own pending order    |
| POST   | `/api/orders/:id/reorder`   | 🚫     | ✅\* | ✅    | 201 / 403       | \*User: own order only       |

**Test Scenarios:**

- [ ] User views own order → 200
- [ ] User tries to view another user's order → 403
- [ ] Admin views any order → 200
- [ ] User cancels own pending order → 200
- [ ] User tries to cancel delivered order → 400/403
- [ ] User tries to update order status → 403
- [ ] Admin updates order status → 200

---

## 6️⃣ Cart APIs

| Method | Endpoint            | Public | User | Admin | Expected Status | Notes                |
| ------ | ------------------- | ------ | ---- | ----- | --------------- | -------------------- |
| GET    | `/api/cart`         | 🚫     | ✅   | ✅    | 200             | Own cart only        |
| POST   | `/api/cart`         | 🚫     | ✅   | ✅    | 201             | Add item to own cart |
| PATCH  | `/api/cart/:itemId` | 🚫     | ✅   | ✅    | 200             | Update own cart item |
| DELETE | `/api/cart/:itemId` | 🚫     | ✅   | ✅    | 200             | Remove own cart item |
| DELETE | `/api/cart`         | 🚫     | ✅   | ✅    | 200             | Clear own cart       |

**Test Scenarios:**

- [ ] Public tries to access cart → 401
- [ ] User views own cart → 200
- [ ] User adds item to cart → 201
- [ ] User updates cart item quantity → 200
- [ ] User clears cart → 200

---

## 7️⃣ Wishlist APIs

| Method | Endpoint                         | Public | User | Admin | Expected Status | Notes                    |
| ------ | -------------------------------- | ------ | ---- | ----- | --------------- | ------------------------ |
| GET    | `/api/wishlist`                  | 🚫     | ✅   | ✅    | 200             | Own wishlist only        |
| POST   | `/api/wishlist`                  | 🚫     | ✅   | ✅    | 201             | Add to own wishlist      |
| DELETE | `/api/wishlist/:id`              | 🚫     | ✅   | ✅    | 200             | Remove from own wishlist |
| POST   | `/api/wishlist/:id/move-to-cart` | 🚫     | ✅   | ✅    | 201             | Move item to cart        |

**Test Scenarios:**

- [ ] Public tries to access wishlist → 401
- [ ] User views own wishlist → 200
- [ ] User adds product to wishlist → 201
- [ ] User removes from wishlist → 200

---

## 8️⃣ Review APIs

| Method | Endpoint                          | Public | User | Admin | Expected Status | Notes                       |
| ------ | --------------------------------- | ------ | ---- | ----- | --------------- | --------------------------- |
| GET    | `/api/reviews/product/:productId` | ✅     | ✅   | ✅    | 200             | Public product reviews      |
| POST   | `/api/reviews`                    | 🚫     | ✅   | ✅    | 201             | Create review               |
| PUT    | `/api/reviews/:id`                | 🚫     | ✅\* | ✅    | 200 / 403       | \*User: own review only     |
| DELETE | `/api/reviews/:id`                | 🚫     | ✅\* | ✅    | 200 / 403       | \*User: own review only     |
| GET    | `/api/reviews`                    | 🚫     | ⛔   | ✅    | 200 / 403       | Admin only - all reviews    |
| PUT    | `/api/reviews/:id/status`         | 🚫     | ⛔   | ✅    | 200 / 403       | Admin only - approve/reject |

**Test Scenarios:**

- [ ] Public views product reviews → 200
- [ ] User creates review → 201
- [ ] User updates own review → 200
- [ ] User tries to update another user's review → 403
- [ ] Admin moderates any review → 200

---

## 9️⃣ Brand APIs

| Method | Endpoint                     | Public | User | Admin | Expected Status | Notes               |
| ------ | ---------------------------- | ------ | ---- | ----- | --------------- | ------------------- |
| GET    | `/api/brands`                | ✅     | ✅   | ✅    | 200             | Public brand list   |
| GET    | `/api/brands/:slug`          | ✅     | ✅   | ✅    | 200             | Public brand detail |
| GET    | `/api/brands/:slug/products` | ✅     | ✅   | ✅    | 200             | Brand products      |
| POST   | `/api/brands`                | 🚫     | ⛔   | ✅    | 201 / 403       | Admin only          |
| PUT    | `/api/brands/:id`            | 🚫     | ⛔   | ✅    | 200 / 403       | Admin only          |
| DELETE | `/api/brands/:id`            | 🚫     | ⛔   | ✅    | 200 / 403       | Admin only          |

---

## 🔟 Coupon APIs

| Method | Endpoint                | Public | User | Admin | Expected Status | Notes                 |
| ------ | ----------------------- | ------ | ---- | ----- | --------------- | --------------------- |
| POST   | `/api/coupons/validate` | ✅     | ✅   | ✅    | 200             | Validate coupon code  |
| GET    | `/api/coupons`          | 🚫     | ⛔   | ✅    | 200 / 403       | Admin only - list all |
| GET    | `/api/coupons/:id`      | 🚫     | ⛔   | ✅    | 200 / 403       | Admin only            |
| POST   | `/api/coupons`          | 🚫     | ⛔   | ✅    | 201 / 403       | Admin only            |
| PUT    | `/api/coupons/:id`      | 🚫     | ⛔   | ✅    | 200 / 403       | Admin only            |
| DELETE | `/api/coupons/:id`      | 🚫     | ⛔   | ✅    | 200 / 403       | Admin only            |

---

## 1️⃣1️⃣ Discount APIs

| Method | Endpoint                      | Public | User | Admin | Expected Status | Notes                   |
| ------ | ----------------------------- | ------ | ---- | ----- | --------------- | ----------------------- |
| GET    | `/api/discounts`              | ✅     | ✅   | ✅    | 200             | Public active discounts |
| GET    | `/api/discounts/:id`          | ✅     | ✅   | ✅    | 200             | Public discount detail  |
| GET    | `/api/discounts/form-options` | 🚫     | ⛔   | ✅    | 200 / 403       | Admin only              |
| POST   | `/api/discounts`              | 🚫     | ⛔   | ✅    | 201 / 403       | Admin only              |
| PUT    | `/api/discounts/:id`          | 🚫     | ⛔   | ✅    | 200 / 403       | Admin only              |
| DELETE | `/api/discounts/:id`          | 🚫     | ⛔   | ✅    | 200 / 403       | Admin only              |

---

## 1️⃣2️⃣ Banner APIs

| Method | Endpoint                        | Public | User | Admin | Expected Status | Notes                   |
| ------ | ------------------------------- | ------ | ---- | ----- | --------------- | ----------------------- |
| GET    | `/api/banners`                  | ✅     | ✅   | ✅    | 200             | Public active banners   |
| GET    | `/api/banners/:id`              | ✅     | ✅   | ✅    | 200             | Single banner detail    |
| POST   | `/api/banners/:id/view`         | ✅     | ✅   | ✅    | 200             | Track banner impression |
| POST   | `/api/banners/:id/click`        | ✅     | ✅   | ✅    | 200             | Track banner click      |
| GET    | `/api/banners/discount-options` | 🚫     | ⛔   | ✅    | 200 / 403       | Admin only              |
| GET    | `/api/banners/analytics`        | 🚫     | ⛔   | ✅    | 200 / 403       | Admin only              |
| POST   | `/api/banners`                  | 🚫     | ⛔   | ✅    | 201 / 403       | Admin only              |
| PUT    | `/api/banners/:id`              | 🚫     | ⛔   | ✅    | 200 / 403       | Admin only              |
| DELETE | `/api/banners/:id`              | 🚫     | ⛔   | ✅    | 200 / 403       | Admin only              |

---

## 1️⃣3️⃣ Settings APIs

| Method | Endpoint                   | Public | User | Admin | Expected Status | Notes                     |
| ------ | -------------------------- | ------ | ---- | ----- | --------------- | ------------------------- |
| GET    | `/api/settings/public`     | ✅     | ✅   | ✅    | 200             | Public site settings      |
| GET    | `/api/settings`            | 🚫     | ⛔   | ✅    | 200 / 403       | Admin only - all settings |
| PUT    | `/api/settings`            | 🚫     | ⛔   | ✅    | 200 / 403       | Admin only                |
| POST   | `/api/settings/test-email` | 🚫     | ⛔   | ✅    | 200 / 403       | Admin only - test SMTP    |

---

## 1️⃣4️⃣ Variant Type & Option APIs

| Method | Endpoint                    | Public | User | Admin | Expected Status | Notes         |
| ------ | --------------------------- | ------ | ---- | ----- | --------------- | ------------- |
| GET    | `/api/variant-types`        | ✅     | ✅   | ✅    | 200             | Public list   |
| GET    | `/api/variant-types/active` | ✅     | ✅   | ✅    | 200             | Active only   |
| GET    | `/api/variant-types/:id`    | ✅     | ✅   | ✅    | 200             | Single type   |
| POST   | `/api/variant-types`        | 🚫     | ⛔   | ✅    | 201 / 403       | Admin only    |
| PUT    | `/api/variant-types/:id`    | 🚫     | ⛔   | ✅    | 200 / 403       | Admin only    |
| DELETE | `/api/variant-types/:id`    | 🚫     | ⛔   | ✅    | 200 / 403       | Admin only    |
| GET    | `/api/variant-options`      | ✅     | ✅   | ✅    | 200             | Public list   |
| GET    | `/api/variant-options/:id`  | ✅     | ✅   | ✅    | 200             | Single option |
| POST   | `/api/variant-options`      | 🚫     | ⛔   | ✅    | 201 / 403       | Admin only    |
| PUT    | `/api/variant-options/:id`  | 🚫     | ⛔   | ✅    | 200 / 403       | Admin only    |
| DELETE | `/api/variant-options/:id`  | 🚫     | ⛔   | ✅    | 200 / 403       | Admin only    |

---

## 🧪 Testing Checklist

### Phase 1: Authentication Flow

- [ ] Login as Admin → redirect to `/admin` → still logged in ✓
- [ ] Login as User → redirect to `/account` → still logged in ✓
- [ ] Page refresh after login → user still logged in ✓
- [ ] Open new tab after login → user still logged in ✓
- [ ] Logout → all cookies cleared → redirected to login ✓

### Phase 2: Admin Access Control

- [ ] Admin hits `/api/users` → 200 OK ✓
- [ ] Admin creates product → 201 Created ✓
- [ ] Admin updates any order → 200 OK ✓
- [ ] Admin views inactive products → 200 OK ✓
- [ ] Admin accesses all protected admin routes → 200 OK ✓

### Phase 3: User Access Control

- [ ] User hits `/api/users` → 403 Forbidden ✓
- [ ] User tries to create product → 403 Forbidden ✓
- [ ] User views own order → 200 OK ✓
- [ ] User tries to view another user's order → 403 Forbidden ✓
- [ ] User manages own cart → 200 OK ✓
- [ ] User manages own wishlist → 200 OK ✓
- [ ] User updates own review → 200 OK ✓
- [ ] User tries to update another user's review → 403 Forbidden ✓

### Phase 4: Public Access Control

- [ ] Public views products → 200 OK ✓
- [ ] Public views categories → 200 OK ✓
- [ ] Public tries to access cart → 401 Unauthorized ✓
- [ ] Public tries to place order → 401 Unauthorized ✓
- [ ] Public tries to create review → 401 Unauthorized ✓

### Phase 5: Token & Session Management

- [ ] Expired token hits protected route → 401 Unauthorized ✓
- [ ] Invalid token hits protected route → 401 Unauthorized ✓
- [ ] No token hits protected route → 401 Unauthorized ✓
- [ ] Token refresh works correctly → 200 OK ✓
- [ ] CSRF token validation on write operations → 403 if missing ✓

---

## 🛠️ Testing Tools

### **Manual Testing with Browser DevTools**

1. Open Network tab
2. Check request headers for `Cookie: accessToken=...`
3. Check response headers for `Set-Cookie`
4. Verify `X-CSRF-Token` header on POST/PUT/DELETE

### **Automated Testing with Postman**

```javascript
// Pre-request Script for Admin Login
pm.sendRequest(
  {
    url: "http://localhost:5001/api/auth/login",
    method: "POST",
    header: {
      "Content-Type": "application/json",
    },
    body: {
      mode: "raw",
      raw: JSON.stringify({
        email: "admin@admin.com",
        password: "password123",
      }),
    },
  },
  (err, res) => {
    if (!err) {
      pm.environment.set("accessToken", res.json().token);
    }
  },
);
```

### **cURL Testing Examples**

```bash
# Test as Admin
curl -X GET http://localhost:5001/api/users \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Cookie: accessToken=YOUR_ADMIN_TOKEN"

# Test as User (should fail)
curl -X GET http://localhost:5001/api/users \
  -H "Authorization: Bearer YOUR_USER_TOKEN" \
  -H "Cookie: accessToken=YOUR_USER_TOKEN"

# Expected: 403 Forbidden
```

---

## 📊 Expected Response Formats

### **Success Response**

```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... },
  "pagination": { ... }
}
```

### **401 Unauthorized (Not Logged In)**

```json
{
  "success": false,
  "message": "Not authorized to access this route"
}
```

### **403 Forbidden (Wrong Role)**

```json
{
  "success": false,
  "message": "User role user is not authorized to access this route"
}
```

### **404 Not Found**

```json
{
  "success": false,
  "message": "Resource not found"
}
```

---

## 🔧 Troubleshooting

### Issue: Auto-Logout After Redirect

**Root Cause:** JWT token expiring too quickly (15m default)  
**Fix:** Update `.env` → `JWT_EXPIRE=7d` for development

### Issue: 401 on Valid Token

**Root Cause:** Cookie not being sent with request  
**Fix:** Ensure `credentials: 'include'` in API client config

### Issue: CSRF Token Missing

**Root Cause:** CSRF token not fetched on app load  
**Fix:** Call `/api/auth/csrf-token` in `App.jsx` on mount

### Issue: Admin Still Gets 403

**Root Cause:** User role not properly set or token not refreshed  
**Fix:** Re-login and verify `user.role === 'admin'` in localStorage

---

## 📝 Summary

### **Admin Can:**

✅ Access all routes  
✅ Manage all resources  
✅ View any user data  
✅ Modify system settings

### **User Can:**

✅ Manage own profile, cart, wishlist, orders  
✅ Create reviews (own products)  
✅ View public data  
❌ Access admin routes  
❌ View/modify other users' data

### **Public Can:**

✅ Browse products and categories  
✅ View public content  
❌ Place orders  
❌ Access any protected routes

---

**Testing Status:** ✅ All scenarios documented  
**Last Verified:** February 26, 2026  
**Next Review:** After each major release
