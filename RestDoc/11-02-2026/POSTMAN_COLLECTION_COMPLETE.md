# ✅ Postman Collection Successfully Created

**Date:** February 12, 2026  
**Workspace:** ReactEcApis  
**Collection:** Enterprise E-Commerce API  
**Total Endpoints:** 25

---

## 📦 Workspace & Collection Details

| Property              | Value                                   |
| --------------------- | --------------------------------------- |
| **Workspace Name**    | ReactEcApis                             |
| **Workspace ID**      | cde38846-f053-4fd8-88ee-0ac3fbe6f011    |
| **Collection Name**   | Enterprise E-Commerce API               |
| **Collection ID**     | 2c8aa45c-49c7-48e5-bdf3-8b57930db8a1    |
| **Base URL Variable** | {{base_url}} = `http://localhost:5001`  |
| **Owner**             | Sahil Kothiya (sahilk.itpath@gmail.com) |

---

## 🔗 Access Your Collection

**Open in Postman:**

1. Open Postman Desktop App
2. Navigate to **Workspaces** → **ReactEcApis**
3. You'll see **"Enterprise E-Commerce API"** collection

**Or access via web:**

- Postman Web: https://web.postman.co/workspace/cde38846-f053-4fd8-88ee-0ac3fbe6f011

---

## 📋 Complete API List (25 Endpoints)

### **Authentication (8 Endpoints)**

| #   | Endpoint                    | Method | Description                             |
| --- | --------------------------- | ------ | --------------------------------------- |
| 1   | `/api/auth/register`        | POST   | Register new user account               |
| 2   | `/api/auth/login`           | POST   | Login with email & password             |
| 3   | `/api/auth/logout`          | POST   | Logout and clear tokens                 |
| 4   | `/api/auth/me`              | GET    | Get current authenticated user          |
| 5   | `/api/auth/update-profile`  | PUT    | Update user profile (name, phone)       |
| 6   | `/api/auth/change-password` | PUT    | Change password (requires old password) |

**Request Bodies Included:**

- ✅ Register: name, email, password, confirmPassword
- ✅ Login: email, password, rememberMe (with default admin credentials)
- ✅ Change Password: oldPassword, newPassword, confirmPassword
- ✅ Update Profile: name, phone

---

### **Brands (7 Endpoints)**

| #   | Endpoint                     | Method | Description                           |
| --- | ---------------------------- | ------ | ------------------------------------- |
| 7   | `/api/brands`                | GET    | Get all brands (paginated)            |
| 8   | `/api/brands/:slug`          | GET    | Get brand by slug (example: apple)    |
| 9   | `/api/brands/:slug/products` | GET    | Get all products for brand            |
| 10  | `/api/brands`                | POST   | **Create brand with file uploads** ⭐ |
| 11  | `/api/brands/:id`            | PUT    | Update brand (with file uploads)      |
| 12  | `/api/brands/:id`            | DELETE | Soft delete brand                     |

**🎯 Create Brand Request Details:**

- **Method:** POST
- **Body Type:** form-data
- **Fields:**
  - `title` (text) - Brand name
  - `description` (text) - Brand description
  - `status` (text) - active/inactive
  - `logo` (file) - Brand logo image (max 5MB)
  - `banners` (file) - Banner images (max 3 files, 5MB each)
- **⚠️ Important:** DO NOT set Content-Type header - Postman sets it automatically
- **Variables:** `{{brand_id}}` for update/delete operations

---

### **Products (7 Endpoints)**

| #   | Endpoint                 | Method | Description                            |
| --- | ------------------------ | ------ | -------------------------------------- |
| 13  | `/api/products`          | GET    | Get all products (paginated, filtered) |
| 14  | `/api/products/featured` | GET    | Get featured products                  |
| 15  | `/api/products/search`   | GET    | Full-text search with price filters    |
| 16  | `/api/products/:slug`    | GET    | Get product by slug                    |
| 17  | `/api/products`          | POST   | Create product with multiple images    |
| 18  | `/api/products/:id`      | PUT    | Update product                         |
| 19  | `/api/products/:id`      | DELETE | Delete product                         |

**Query Parameters Included:**

- ✅ Pagination: `?page=1&limit=20`
- ✅ Filters: `?status=active&minPrice=100&maxPrice=2000`
- ✅ Search: `?q=laptop`
- ✅ Sort: `?sortBy=createdAt&sortOrder=desc`

**Create Product Request Details:**

- **Body Type:** form-data
- **Fields:** title, description, price, sku, stock, status, images (file)

---

### **Categories (6 Endpoints)**

| #   | Endpoint                         | Method | Description                    |
| --- | -------------------------------- | ------ | ------------------------------ |
| 20  | `/api/categories`                | GET    | Get all categories (paginated) |
| 21  | `/api/categories/tree`           | GET    | Get hierarchical category tree |
| 22  | `/api/categories/:slug`          | GET    | Get category by slug           |
| 23  | `/api/categories/:slug/products` | GET    | Get all products in category   |
| 24  | `/api/categories`                | POST   | Create category with image     |
| 25  | `/api/categories/:id`            | PUT    | Update category                |
| 26  | `/api/categories/:id`            | DELETE | Delete category                |

**Create Category Request Details:**

- **Body Type:** form-data
- **Fields:** name, description, status, image (file)

---

## 🎨 Collection Variables

Pre-configured variables for easy testing:

| Variable          | Default Value           | Usage                       |
| ----------------- | ----------------------- | --------------------------- |
| `{{base_url}}`    | `http://localhost:5001` | API base URL                |
| `{{token}}`       | _(empty)_               | JWT token (set after login) |
| `{{brand_id}}`    | _(empty)_               | For brand update/delete     |
| `{{product_id}}`  | _(empty)_               | For product update/delete   |
| `{{category_id}}` | _(empty)_               | For category update/delete  |

---

## 🚀 Quick Start Testing Guide

### **Step 1: Test Authentication**

1. Open "Login" request
2. Click **Send** (uses default admin credentials)
3. Expected: `200 OK` with user data

### **Step 2: Test Brand Listing**

1. Open "Get All Brands" request
2. Click **Send**
3. Expected: `200 OK` with 26 brands (paginated)

### **Step 3: Test Brand Creation (File Upload)**

1. Open "Create Brand (Admin)" request
2. In **Body** tab → **form-data**:
   - `title`: Enter "My Test Brand"
   - `description`: Enter "Testing file uploads"
   - `status`: Enter "active"
   - `logo`: Click "Select Files" and choose an image
   - `banners`: Click "Select Files" and choose 1-3 images
3. ⚠️ **Important:** Ensure **NO** Content-Type header is set
4. Click **Send**
5. Expected: `201 Created` with brand data including file paths

**Success Response Example:**

```json
{
  "success": true,
  "data": {
    "_id": "65c8f9a2b3d1e4f5a6b7c8d9",
    "title": "My Test Brand",
    "slug": "my-test-brand",
    "description": "Testing file uploads",
    "logo": "uploads/brands/brand-logo-1707842982456.jpg",
    "banners": [
      "uploads/brands/brand-banner-1707842982457.jpg",
      "uploads/brands/brand-banner-1707842982458.jpg"
    ],
    "status": "active",
    "createdAt": "2026-02-12T08:12:00.000Z"
  }
}
```

### **Step 4: Test Product Search**

1. Open "Search Products" request
2. Modify query parameters if needed:
   - `q=laptop`
   - `minPrice=100`
   - `maxPrice=2000`
3. Click **Send**
4. Expected: `200 OK` with filtered products

### **Step 5: Test Category Tree**

1. Open "Get Category Tree" request
2. Click **Send**
3. Expected: `200 OK` with hierarchical category structure

---

## 🔍 Testing File Uploads (Critical)

### **Brand Creation/Update (Multipart Form-Data)**

**✅ CORRECT Setup:**

```
Method: POST
URL: http://localhost:5001/api/brands
Body Type: form-data
Headers: (none - Postman auto-sets Content-Type)

Form Fields:
- title: "Test Brand" (text)
- description: "Testing" (text)
- status: "active" (text)
- logo: [select file] (file)
- banners: [select files] (file - can add multiple)
```

**❌ COMMON MISTAKES TO AVOID:**

1. ❌ Setting `Content-Type: multipart/form-data` header manually
2. ❌ Setting `Content-Type: application/json` for file uploads
3. ❌ Using "raw" body type instead of "form-data"
4. ❌ Not selecting actual files for file fields

**🎯 File Upload Requirements:**

- **Supported formats:** JPG, JPEG, PNG, GIF, WEBP
- **Max file size:** 5MB per file
- **Logo:** 1 file maximum
- **Banners:** 3 files maximum
- **Destination:** `backend/uploads/brands/` directory
- **Filename pattern:** `brand-logo-TIMESTAMP.ext`, `brand-banner-TIMESTAMP.ext`

---

## 🐛 Troubleshooting

### **Issue: "Multipart: Boundary not found"**

**Solution:**

- Remove ALL Content-Type headers
- Ensure Body type is set to "form-data" (not "raw")
- Postman will automatically add correct Content-Type with boundary

### **Issue: "Validation failed"**

**Solution:**

- Check that all required fields are filled
- Verify file formats are supported (JPG, PNG, WEBP, GIF)
- Ensure file sizes are under 5MB

### **Issue: "401 Unauthorized" (when JWT re-enabled)**

**Solution:**

- Run "Login" request first
- Copy `accessToken` from response
- Set `{{token}}` variable: Collection → Variables → `token` = paste token
- Or add to request headers: `Authorization: Bearer {{token}}`

### **Issue: "Cannot connect to server"**

**Solution:**

- Ensure backend server is running: `cd backend && npm run dev`
- Verify server is on port 5001: check terminal output
- Test with: `curl http://localhost:5001/api/health`

---

## 📝 Default Test Credentials

**Admin Account:**

- Email: `admin@admin.com`
- Password: `password123`
- Role: admin (full access)

**Regular User:**

- Email: `user@admin.com`
- Password: `password123`
- Role: customer

**Note:** JWT authentication is currently **disabled** for testing. All requests will auto-authenticate as admin.

---

## 🔄 Next Steps

### **1. Test Brand Creation**

1. Open "Create Brand (Admin)" request
2. Add test files (logo + banners)
3. Send request and verify 201 response
4. Check `backend/uploads/brands/` for uploaded files

### **2. Test Brand Update**

1. Copy brand `_id` from creation response
2. Set `{{brand_id}}` variable with the ID
3. Open "Update Brand (Admin)" request
4. Modify fields as needed
5. Send request and verify 200 response

### **3. Test All GET Endpoints**

Run through all GET requests to verify:

- Pagination works
- Filters apply correctly
- Data structure matches expectations

### **4. Export Collection (Optional)**

To share collection with team:

1. Right-click collection → Export
2. Choose Collection v2.1
3. Share JSON file with team members

---

## 📊 API Statistics

| Category              | Count            | Completion  |
| --------------------- | ---------------- | ----------- |
| **Authentication**    | 6 endpoints      | ✅ 100%     |
| **Brands (CRUD)**     | 6 endpoints      | ✅ 100%     |
| **Products (CRUD)**   | 7 endpoints      | ✅ 100%     |
| **Categories (CRUD)** | 6 endpoints      | ✅ 100%     |
| **Total**             | **25 endpoints** | ✅ **100%** |

---

## 🎉 Summary

✅ **Postman workspace created:** ReactEcApis  
✅ **Collection created:** Enterprise E-Commerce API  
✅ **25 API endpoints added** with complete request examples  
✅ **File upload requests configured** (brands, products, categories)  
✅ **Collection variables set** (base_url, token, IDs)  
✅ **Default credentials included** for quick testing  
✅ **Query parameters pre-configured** for GET requests

**You can now test all APIs directly from Postman!**

---

## 📚 Related Documentation

- **API Testing Guide:** [BRAND_API_TESTING_GUIDE.md](./BRAND_API_TESTING_GUIDE.md)
- **API Documentation:** [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)
- **Backend Routes:** [backend/src/routes/](../../backend/src/routes/)
- **Development Guide:** [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md)

---

**Happy Testing! 🚀**
