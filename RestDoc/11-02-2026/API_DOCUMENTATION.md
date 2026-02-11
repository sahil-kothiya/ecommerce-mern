# 🚀 Enterprise E-commerce API Documentation

**Base URL:** `http://localhost:5001`  
**Version:** 1.0  
**Database:** MongoDB with 100 products, 50 users, 86 categories, 26 brands  

---

## 📋 **Quick Setup for Postman**

### **1. Import Collection**
Create a new collection in Postman and add these endpoints:

### **2. Environment Variables**
Set these variables in Postman environment:
```json
{
  "baseUrl": "http://localhost:5001",
  "token": "{{auth_token}}"
}
```

---

## 🔐 **Authentication Endpoints**

### **Register User**
```http
POST {{baseUrl}}/api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com", 
  "password": "password123"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "6734abc123def456",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "user"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### **Login User**
```http
POST {{baseUrl}}/api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123"
}
```

### **Admin Login (Pre-seeded)**
```http
POST {{baseUrl}}/api/auth/login
Content-Type: application/json

{
  "email": "admin@enterprise-ecommerce.com",
  "password": "admin123!"
}
```

### **Get Profile**
```http
GET {{baseUrl}}/api/auth/me
Authorization: Bearer {{token}}
```

### **Update Profile**
```http
PUT {{baseUrl}}/api/auth/update-profile
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "name": "John Updated",
  "photo": "https://example.com/avatar.jpg"
}
```

### **Change Password**
```http
PUT {{baseUrl}}/api/auth/change-password
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "currentPassword": "password123",
  "newPassword": "newpassword123"
}
```

---

## 🛍️ **Product Endpoints**

### **Get All Products**
```http
GET {{baseUrl}}/api/products
```

**Query Parameters:**
- `page=1` - Page number (default: 1)
- `limit=20` - Items per page (default: 20)
- `search=laptop` - Search in title/description
- `categoryId=6734abc123` - Filter by category
- `brandId=6734def456` - Filter by brand
- `minPrice=100` - Minimum price filter
- `maxPrice=500` - Maximum price filter
- `condition=new` - Filter by condition (new/hot/default)
- `isFeatured=true` - Featured products only
- `sort=-createdAt` - Sort (price, -price, createdAt, -createdAt)

**Example:**
```http
GET {{baseUrl}}/api/products?limit=5&search=electronics&sort=price
```

### **Get Featured Products**
```http
GET {{baseUrl}}/api/products/featured
```

### **Search Products**
```http
GET {{baseUrl}}/api/products/search?q=smartphone
```

### **Get Product by Slug**
```http
GET {{baseUrl}}/api/products/apple-premium-smartphone-1
```

### **Create Product (Admin Only)**
```http
POST {{baseUrl}}/api/products
Authorization: Bearer {{admin_token}}
Content-Type: application/json

{
  "title": "New Smartphone",
  "summary": "Latest smartphone with advanced features",
  "description": "Detailed product description...",
  "baseSku": "SM-2024-001",
  "categoryId": "6734abc123def456",
  "brandId": "6734def789abc123",
  "condition": "new",
  "isFeatured": true,
  "variants": [
    {
      "sku": "SM-2024-001-BLK-64",
      "displayName": "Black 64GB",
      "price": 599.99,
      "stock": 100,
      "options": [
        {
          "typeId": "6734type123",
          "typeName": "color",
          "typeDisplayName": "Color",
          "optionId": "6734opt456",
          "value": "black",
          "displayValue": "Black"
        }
      ],
      "images": [
        {
          "path": "/uploads/products/smartphone-black.jpg",
          "altText": "Black smartphone",
          "isPrimary": true
        }
      ]
    }
  ],
  "images": [
    {
      "path": "/uploads/products/smartphone-main.jpg",
      "altText": "Main product image",
      "isPrimary": true
    }
  ],
  "tags": ["smartphone", "electronics", "mobile"],
  "keywords": ["phone", "mobile", "android"]
}
```

---

## 📂 **Category Endpoints**

### **Get All Categories**
```http
GET {{baseUrl}}/api/categories
```

### **Get Category Tree**
```http
GET {{baseUrl}}/api/categories/tree
```

### **Get Category by Slug**
```http
GET {{baseUrl}}/api/categories/electronics
```

### **Get Products by Category**
```http
GET {{baseUrl}}/api/categories/electronics/products?limit=10
```

### **Create Category (Admin Only)**
```http
POST {{baseUrl}}/api/categories
Authorization: Bearer {{admin_token}}
Content-Type: application/json

{
  "title": "New Category",
  "summary": "Category description",
  "parentId": null,
  "photo": "/uploads/categories/new-category.jpg",
  "isFeatured": false
}
```

---

## 🏷️ **Brand Endpoints**

### **Get All Brands**
```http
GET {{baseUrl}}/api/brands
```

### **Get Brand by Slug**
```http
GET {{baseUrl}}/api/brands/apple
```

### **Get Products by Brand**
```http
GET {{baseUrl}}/api/brands/apple/products
```

---

## 🛒 **Cart Endpoints**

### **Get Cart**
```http
GET {{baseUrl}}/api/cart
Authorization: Bearer {{token}}
```

### **Add to Cart**
```http
POST {{baseUrl}}/api/cart/add
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "productId": "6734abc123def456",
  "variantId": "6734var789abc123",
  "quantity": 2
}
```

### **Update Cart Item**
```http
PUT {{baseUrl}}/api/cart/update
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "productId": "6734abc123def456",
  "variantId": "6734var789abc123", 
  "quantity": 3
}
```

### **Remove from Cart**
```http
DELETE {{baseUrl}}/api/cart/remove
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "productId": "6734abc123def456",
  "variantId": "6734var789abc123"
}
```

### **Clear Cart**
```http
DELETE {{baseUrl}}/api/cart/clear
Authorization: Bearer {{token}}
```

---

## 📦 **Order Endpoints**

### **Get User Orders**
```http
GET {{baseUrl}}/api/orders
Authorization: Bearer {{token}}
```

### **Get Order by ID**
```http
GET {{baseUrl}}/api/orders/6734order123abc
Authorization: Bearer {{token}}
```

### **Create Order**
```http
POST {{baseUrl}}/api/orders
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "shippingAddress": {
    "name": "John Doe",
    "address": "123 Main St",
    "city": "New York",
    "state": "NY",
    "zipCode": "10001",
    "country": "USA",
    "phone": "+1234567890"
  },
  "paymentMethod": "stripe",
  "couponCode": "SAVE10"
}
```

---

## 🎫 **Coupon Endpoints**

### **Validate Coupon**
```http
POST {{baseUrl}}/api/coupons/validate
Content-Type: application/json

{
  "code": "SAVE10",
  "cartTotal": 100.00
}
```

---

## ❤️ **Wishlist Endpoints**

### **Get Wishlist**
```http
GET {{baseUrl}}/api/wishlist
Authorization: Bearer {{token}}
```

### **Add to Wishlist**
```http
POST {{baseUrl}}/api/wishlist/add
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "productId": "6734abc123def456"
}
```

### **Remove from Wishlist**
```http
DELETE {{baseUrl}}/api/wishlist/remove/6734abc123def456
Authorization: Bearer {{token}}
```

---

## ⭐ **Review Endpoints**

### **Get Product Reviews**
```http
GET {{baseUrl}}/api/reviews/product/6734abc123def456
```

### **Add Review**
```http
POST {{baseUrl}}/api/reviews
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "productId": "6734abc123def456",
  "rating": 5,
  "comment": "Excellent product!"
}
```

---

## 🔧 **System Endpoints**

### **Health Check**
```http
GET {{baseUrl}}/health
```

**Response:**
```json
{
  "success": true,
  "message": "Server is running",
  "timestamp": "2025-11-28T13:20:00.000Z",
  "environment": "development"
}
```

### **API Info**
```http
GET {{baseUrl}}/
```

---

## 📊 **Sample Data Available**

After seeding, you have access to:
- **50 users** (including admin)
- **100 products** with variants
- **86 categories** in tree structure
- **26 brands**
- **4 variant types** (Color, Size, Material, Style)
- **32 variant options**

### **Test User Credentials:**
- **Admin:** `admin@enterprise-ecommerce.com` / `admin123!`
- **Regular users:** Check generated users with password `password123`

---

## 🚀 **Quick Test Workflow**

1. **Health Check:** `GET /health`
2. **Register:** `POST /api/auth/register`
3. **Login:** `POST /api/auth/login` 
4. **Get Products:** `GET /api/products?limit=5`
5. **Get Categories:** `GET /api/categories/tree`
6. **Add to Cart:** `POST /api/cart/add`
7. **Create Order:** `POST /api/orders`

---

## 🔑 **Authentication Notes**

- Most endpoints require `Authorization: Bearer {{token}}`
- Admin endpoints need admin user token
- Tokens expire in 7 days (configurable)
- Public endpoints: products, categories, brands, health

---

## ⚡ **Response Format**

All API responses follow this structure:
```json
{
  "success": true/false,
  "message": "Description",
  "data": {}, // Response data
  "pagination": {}, // For paginated results
  "error": {} // Error details if any
}
```

---

**🎉 Your MERN E-commerce API is fully functional and ready for development!**