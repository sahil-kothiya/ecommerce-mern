# Enterprise E-Commerce - Postman API Collection

**Date:** February 12, 2026  
**Base URL:** `http://localhost:5001`  
**Authentication:** JWT Token (Temporarily DISABLED for testing)

---

## 🔧 Setup Instructions

1. **Start Backend Server:**

   ```bash
   cd backend
   npm run dev
   ```

   Server runs on: `http://localhost:5001`

2. **Environment Variables in Postman:**
   - Create new environment: "E-Commerce Local"
   - Add variable: `endpoint` = `http://localhost:5001`
   - Add variable: `token` = (will be set after login)

3. **Authentication (Currently DISABLED):**
   - JWT authentication is temporarily disabled for testing
   - All protected routes work without tokens

---

## 📋 Complete API Endpoints

### 1. 🔐 Authentication (`/api/auth`)

#### POST - Register User

```
{{endpoint}}/api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "Password123!",
  "confirmPassword": "Password123!"
}
```

#### POST - Login

```
{{endpoint}}/api/auth/login
Content-Type: application/json

{
  "email": "admin@admin.com",
  "password": "password123",
  "rememberMe": true
}
```

#### POST - Logout

```
{{endpoint}}/api/auth/logout
Authorization: Bearer {{token}}
```

#### POST - Refresh Token

```
{{endpoint}}/api/auth/refresh-token
Content-Type: application/json

{
  "refreshToken": "your-refresh-token"
}
```

#### PUT - Update Profile

```
{{endpoint}}/api/auth/update-profile
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "name": "Updated Name",
  "phone": "+1234567890"
}
```

#### PUT - Change Password

```
{{endpoint}}/api/auth/change-password
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "oldPassword": "password123",
  "newPassword": "NewPassword123!",
  "confirmPassword": "NewPassword123!"
}
```

---

### 2. 🛍️ Products (`/api/products`)

#### GET - List All Products (with pagination & filters)

```
{{endpoint}}/api/products?page=1&limit=20&status=active&sortBy=createdAt&sortOrder=desc
```

#### GET - Featured Products

```
{{endpoint}}/api/products/featured
```

#### GET - Search Products

```
{{endpoint}}/api/products/search?q=laptop&category=electronics&minPrice=100&maxPrice=2000
```

#### GET - Get Single Product by Slug

```
{{endpoint}}/api/products/macbook-pro-14-inch
```

#### POST - Create Product (Admin) 🔴

```
{{endpoint}}/api/products
Authorization: Bearer {{token}}
Content-Type: multipart/form-data

Form Data:
- title: "New Product Title"
- description: "Product description"
- shortDescription: "Short desc"
- price: 999.99
- comparePrice: 1299.99
- costPrice: 700
- sku: "PROD-001"
- stock: 100
- category: "category-id"
- brand: "brand-id"
- status: "active"
- images: [file1.jpg, file2.jpg] (multiple files)
- tags: ["new", "featured"]
```

#### PUT - Update Product (Admin) 🔴

```
{{endpoint}}/api/products/product-id
Authorization: Bearer {{token}}
Content-Type: multipart/form-data

(Same form data as create)
```

#### DELETE - Delete Product (Admin) 🔴

```
{{endpoint}}/api/products/product-id
Authorization: Bearer {{token}}
```

---

### 3. 📁 Categories (`/api/categories`)

#### GET - List All Categories

```
{{endpoint}}/api/categories?page=1&limit=50
```

#### GET - Category Tree (Hierarchical)

```
{{endpoint}}/api/categories/tree
```

#### GET - Get Single Category by Slug

```
{{endpoint}}/api/categories/electronics
```

#### GET - Get Category Products

```
{{endpoint}}/api/categories/electronics/products?page=1&limit=20
```

#### POST - Create Category (Admin) 🔴

```
{{endpoint}}/api/categories
Authorization: Bearer {{token}}
Content-Type: multipart/form-data

Form Data:
- name: "Electronics"
- description: "Electronic devices and accessories"
- parentCategory: "parent-category-id" (optional)
- status: "active"
- sortOrder: 1
- image: category-image.jpg
```

#### PUT - Update Category (Admin) 🔴

```
{{endpoint}}/api/categories/category-id
Authorization: Bearer {{token}}
Content-Type: multipart/form-data
```

#### POST - Bulk Reorder Categories (Admin) 🔴

```
{{endpoint}}/api/categories/reorder
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "categories": [
    { "id": "cat1-id", "sortOrder": 1 },
    { "id": "cat2-id", "sortOrder": 2 }
  ]
}
```

#### DELETE - Delete Category (Admin) 🔴

```
{{endpoint}}/api/categories/category-id
Authorization: Bearer {{token}}
```

---

### 4. 🏷️ Brands (`/api/brands`)

#### GET - List All Brands

```
{{endpoint}}/api/brands?page=1&limit=20&status=active
```

#### GET - Get Single Brand by Slug

```
{{endpoint}}/api/brands/apple
```

#### GET - Get Brand Products

```
{{endpoint}}/api/brands/apple/products?page=1&limit=20
```

#### POST - Create Brand (Admin) 🔴 ⚠️ TEST THIS IN POSTMAN

```
{{endpoint}}/api/brands
Authorization: Bearer {{token}}
Content-Type: multipart/form-data

Form Data:
- title: "Brand Name"
- description: "Brand description"
- status: "active"
- logo: brand-logo.jpg (single file)
- banners: [banner1.jpg, banner2.jpg] (multiple files)
```

**✅ TEST IN POSTMAN NOW:**

1. Open the request I created for you
2. Set method to POST
3. Set URL: `http://localhost:5001/api/brands`
4. Go to "Body" tab → Select "form-data"
5. Add fields:
   - title: `Test Brand`
   - description: `Test Description`
   - status: `active`
   - logo: Upload a file (click "Select Files")
   - banners: Upload multiple files (click "Select Files")
6. Click "Send"

#### PUT - Update Brand (Admin) 🔴

```
{{endpoint}}/api/brands/brand-id
Authorization: Bearer {{token}}
Content-Type: multipart/form-data
```

#### DELETE - Delete Brand (Admin) 🔴

```
{{endpoint}}/api/brands/brand-id
Authorization: Bearer {{token}}
```

---

### 5. 🛒 Cart (`/api/cart`) - NOT IMPLEMENTED YET

#### GET - Get Cart Items

```
{{endpoint}}/api/cart
Authorization: Bearer {{token}}
Returns: { "message": "Get cart items endpoint - to be implemented" }
```

#### POST - Add to Cart

```
{{endpoint}}/api/cart
Authorization: Bearer {{token}}
Status: 501 - Not Implemented
```

#### PUT - Update Cart Item

```
{{endpoint}}/api/cart/cart-item-id
Authorization: Bearer {{token}}
Status: 501 - Not Implemented
```

#### DELETE - Remove from Cart

```
{{endpoint}}/api/cart/cart-item-id
Authorization: Bearer {{token}}
Status: 501 - Not Implemented
```

#### DELETE - Clear Cart

```
{{endpoint}}/api/cart
Authorization: Bearer {{token}}
Status: 501 - Not Implemented
```

---

### 6. 📦 Orders (`/api/orders`) - NOT IMPLEMENTED YET

#### GET - Get User Orders

```
{{endpoint}}/api/orders
Authorization: Bearer {{token}}
Status: 501 - Not Implemented
```

#### GET - Get Order by ID

```
{{endpoint}}/api/orders/order-id
Authorization: Bearer {{token}}
Status: 501 - Not Implemented
```

#### POST - Create Order

```
{{endpoint}}/api/orders
Authorization: Bearer {{token}}
Status: 501 - Not Implemented
```

#### GET - Get All Orders (Admin)

```
{{endpoint}}/api/orders/admin/all
Authorization: Bearer {{token}}
Status: 501 - Not Implemented
```

#### PUT - Update Order Status (Admin)

```
{{endpoint}}/api/orders/order-id/status
Authorization: Bearer {{token}}
Status: 501 - Not Implemented
```

---

### 7. ⭐ Reviews (`/api/reviews`) - NOT IMPLEMENTED YET

#### GET - Get Product Reviews

```
{{endpoint}}/api/reviews/product/product-id
Status: 501 - Not Implemented
```

#### POST - Create Review

```
{{endpoint}}/api/reviews
Authorization: Bearer {{token}}
Status: 501 - Not Implemented
```

---

### 8. 💝 Wishlist (`/api/wishlist`) - NOT IMPLEMENTED YET

#### GET - Get Wishlist

```
{{endpoint}}/api/wishlist
Authorization: Bearer {{token}}
Status: 501 - Not Implemented
```

#### POST - Add to Wishlist

```
{{endpoint}}/api/wishlist
Authorization: Bearer {{token}}
Status: 501 - Not Implemented
```

---

### 9. 🎟️ Coupons (`/api/coupons`) - NOT IMPLEMENTED YET

#### POST - Validate Coupon

```
{{endpoint}}/api/coupons/validate
Content-Type: application/json
Status: 501 - Not Implemented

{
  "code": "SAVE20"
}
```

#### GET - Get All Coupons (Admin)

```
{{endpoint}}/api/coupons
Authorization: Bearer {{token}}
Status: 501 - Not Implemented
```

---

## 🎯 Priority API Testing Checklist

### ✅ Fully Implemented & Ready to Test:

1. ✅ **Authentication**
   - Register, Login, Logout, Change Password
2. ✅ **Products**
   - List, Search, Featured, Get by Slug, Create, Update, Delete
3. ✅ **Categories**
   - List, Tree, Get by Slug, Create, Update, Delete, Reorder
4. ✅ **Brands**
   - List, Get by Slug, Create, Update, Delete

### ⚠️ Not Yet Implemented (Returns 501):

- Cart APIs
- Order APIs
- Review APIs
- Wishlist APIs
- Coupon APIs

---

## 🧪 Testing Instructions

### Step 1: Test Health Endpoint

```
GET http://localhost:5001/health
Expected: 200 OK with server status
```

### Step 2: Test Authentication

```
POST http://localhost:5001/api/auth/login
Body: { "email": "admin@admin.com", "password": "password123" }
Expected: 200 OK with user data and token
```

### Step 3: Test Brand Creation (Your Issue) 🔴

```
POST http://localhost:5001/api/brands
Content-Type: multipart/form-data

Form Fields:
- title: "Test Brand"
- description: "Test Description"
- status: "active"
- logo: [upload file]
- banners: [upload multiple files]

Expected: 201 Created with brand data
```

### Step 4: Test Product Listing

```
GET http://localhost:5001/api/products
Expected: 200 OK with products array
```

---

## 🐛 Troubleshooting

### Issue: ERR_CONNECTION_REFUSED

**Solution:** Backend server not running

```bash
cd backend
npm run dev
```

### Issue: 401 Unauthorized

**Solution:** JWT authentication is temporarily disabled, so this should NOT occur.
If it does, check `backend/src/middleware/auth.js` line 6-30

### Issue: 500 Internal Server Error

**Solution:** Check backend terminal for error logs

### Issue: Validation Errors

**Solution:** Check request body matches expected schema

---

## 📥 Import to Postman

To import this collection:

1. Copy the JSON below
2. Open Postman → Import → Raw Text
3. Paste and import

```json
{
  "info": {
    "name": "Enterprise E-Commerce API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Authentication",
      "item": [
        {
          "name": "Login",
          "request": {
            "method": "POST",
            "header": [{ "key": "Content-Type", "value": "application/json" }],
            "url": "{{endpoint}}/api/auth/login",
            "body": {
              "mode": "raw",
              "raw": "{\n  \"email\": \"admin@admin.com\",\n  \"password\": \"password123\",\n  \"rememberMe\": true\n}"
            }
          }
        }
      ]
    },
    {
      "name": "Brands",
      "item": [
        {
          "name": "Create Brand",
          "request": {
            "method": "POST",
            "url": "{{endpoint}}/api/brands",
            "body": {
              "mode": "formdata",
              "formdata": [
                { "key": "title", "value": "Test Brand", "type": "text" },
                {
                  "key": "description",
                  "value": "Test Description",
                  "type": "text"
                },
                { "key": "status", "value": "active", "type": "text" },
                { "key": "logo", "type": "file" },
                { "key": "banners", "type": "file" }
              ]
            }
          }
        },
        {
          "name": "Get All Brands",
          "request": {
            "method": "GET",
            "url": "{{endpoint}}/api/brands"
          }
        }
      ]
    }
  ]
}
```

---

**Next Step:** Open the Postman request I created and test the brand creation endpoint with the form data above!
