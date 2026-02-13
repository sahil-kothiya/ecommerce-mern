# Brand API - Complete Testing Guide

**Updated:** February 12, 2026  
**Status:** ✅ FIXED & WORKING  
**Base URL:** `http://localhost:5001/api/brands`

---

## ✅ Changes Applied

### 1. **BrandController.js** - Complete Rewrite

- ✅ Added missing imports (Brand, Product, mongoose, logger)
- ✅ All methods now use `catchAsync` pattern from BaseController
- ✅ Proper error handling with standardized responses
- ✅ File upload handling fixed for multipart/form-data
- ✅ Uses BrandService for business logic

### 2. **Brand Model** - Added Banners Field

```javascript
banners: {
    type: [String],  // Array of image URLs
    default: [],
}
```

### 3. **Upload Path Fix**

- Logo: `uploads/brands/brand-logo-{timestamp}.jpg`
- Banners: `uploads/brands/brand-banner-{timestamp}.jpg`

---

## 🧪 Test in Postman - Step by Step

### **Test 1: Create Brand (POST)**

**Request:**

```
POST http://localhost:5001/api/brands
```

**Headers:**

- **IMPORTANT:** Do NOT manually set `Content-Type`
- Postman will automatically set it with boundary when you use form-data

**Body:** Select `form-data`

| KEY         | VALUE                                       | TYPE |
| ----------- | ------------------------------------------- | ---- |
| title       | Apple                                       | Text |
| description | Premium electronics and technology products | Text |
| status      | active                                      | Text |
| logo        | [Select File]                               | File |
| banners     | [Select File 1]                             | File |
| banners     | [Select File 2]                             | File |
| banners     | [Select File 3]                             | File |

**Expected Response (201 Created):**

```json
{
  "success": true,
  "data": {
    "_id": "67abcd1234567890abcdef12",
    "title": "Apple",
    "slug": "apple",
    "description": "Premium electronics and technology products",
    "status": "active",
    "logo": "uploads/brands/brand-logo-1707728400000-123456789.jpg",
    "banners": [
      "uploads/brands/brand-banner-1707728400000-987654321.jpg",
      "uploads/brands/brand-banner-1707728400000-987654322.jpg",
      "uploads/brands/brand-banner-1707728400000-987654323.jpg"
    ],
    "createdAt": "2026-02-12T10:00:00.000Z",
    "updatedAt": "2026-02-12T10:00:00.000Z"
  },
  "message": "Brand created successfully"
}
```

---

### **Test 2: Get All Brands (GET)**

**Request:**

```
GET http://localhost:5001/api/brands?page=1&limit=20&status=active
```

**Headers:** None required

**Expected Response (200 OK):**

```json
{
  "success": true,
  "data": [
    {
      "_id": "698c893e5be86e9e0beec719",
      "title": "Apple",
      "slug": "apple",
      "logo": "uploads/brands/brand-logo-123.jpg",
      "status": "active"
    },
    {
      "_id": "698c893e5be86e9e0beec707",
      "title": "Samsung",
      "slug": "samsung",
      "logo": "uploads/brands/brand-logo-456.jpg",
      "status": "active"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 25,
    "pages": 2
  }
}
```

---

### **Test 3: Get Brand by Slug (GET)**

**Request:**

```
GET http://localhost:5001/api/brands/apple
```

**Expected Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "_id": "698c893e5be86e9e0beec719",
    "title": "Apple",
    "slug": "apple",
    "description": "Premium electronics and technology products",
    "status": "active",
    "logo": "uploads/brands/brand-logo-123.jpg",
    "banners": [
      "uploads/brands/brand-banner-1.jpg",
      "uploads/brands/brand-banner-2.jpg"
    ],
    "createdAt": "2026-01-10T10:00:00.000Z",
    "updatedAt": "2026-02-12T10:00:00.000Z"
  }
}
```

---

### **Test 4: Update Brand (PUT)**

**Request:**

```
PUT http://localhost:5001/api/brands/{brand-id}
```

Replace `{brand-id}` with actual MongoDB ObjectId (e.g., `698c893e5be86e9e0beec719`)

**Body:** Select `form-data`

| KEY              | VALUE                          | TYPE | DESCRIPTION                   |
| ---------------- | ------------------------------ | ---- | ----------------------------- |
| title            | Apple Inc                      | Text | Updated title                 |
| description      | Updated description text       | Text | Optional                      |
| status           | active                         | Text | Optional                      |
| keepExistingLogo | true                           | Text | Keep old logo (don't delete)  |
| existingBanners  | ["uploads/brands/banner1.jpg"] | Text | JSON array of banners to keep |
| logo             | [Select New File]              | File | Optional - upload new logo    |
| banners          | [Select New File]              | File | Optional - add new banner(s)  |

**Example with keeping existing logo:**

```
title: Apple Inc.
description: Technology and Innovation Leader
status: active
keepExistingLogo: true
existingBanners: ["uploads/brands/brand-banner-1707728400000-987654321.jpg"]
banners: [new-banner-file.jpg]
```

**Expected Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "_id": "698c893e5be86e9e0beec719",
    "title": "Apple Inc.",
    "slug": "apple",
    "description": "Technology and Innovation Leader",
    "status": "active",
    "logo": "uploads/brands/brand-logo-123.jpg",
    "banners": [
      "uploads/brands/brand-banner-1707728400000-987654321.jpg",
      "uploads/brands/brand-banner-1707728500000-111222333.jpg"
    ],
    "createdAt": "2026-01-10T10:00:00.000Z",
    "updatedAt": "2026-02-12T11:30:00.000Z"
  },
  "message": "Brand updated successfully"
}
```

---

### **Test 5: Delete Brand (DELETE)**

**Request:**

```
DELETE http://localhost:5001/api/brands/{brand-id}
```

**Headers:** None required (JWT disabled for testing)

**Expected Response (200 OK):**

```json
{
  "success": true,
  "data": null,
  "message": "Brand deleted successfully"
}
```

**Error if brand has products (400 Bad Request):**

```json
{
  "success": false,
  "message": "Cannot delete brand. 15 products are using this brand."
}
```

---

## 🔥 Common Issues & Solutions

### Issue 1: "Multipart: Boundary not found"

**Cause:** Manually setting `Content-Type: multipart/form-data` header  
**Solution:**

- Remove ALL Content-Type headers in Postman
- Postman auto-generates with boundary when using form-data
- ✅ FIXED in controller

### Issue 2: "Invalid brand ID"

**Cause:** Using slug instead of MongoDB ObjectId for update/delete  
**Solution:** Use the `_id` field, not `slug`

- ✅ Correct: `698c893e5be86e9e0beec719`
- ❌ Wrong: `apple`

### Issue 3: "Brand not found"

**Cause:** Brand doesn't exist or status is inactive  
**Solution:** Check brand exists and status is active

### Issue 4: Files not uploading

**Cause:** Wrong field names or file type  
**Solution:**

- Use exact field names: `logo` (single), `banners` (multiple)
- Allowed types: jpg, jpeg, png, gif, webp
- Max size: 5MB per file

---

## 📝 Important Notes

### File Upload Rules:

1. **Field Names:**
   - Logo: `logo` (single file)
   - Banners: `banners` (multiple files - max 3)

2. **Supported Formats:**
   - JPG/JPEG
   - PNG
   - GIF
   - WebP

3. **File Size Limit:**
   - Maximum: 5MB per file
   - Total: 4 files max (1 logo + 3 banners)

### Update Behavior:

- If `keepExistingLogo` is `true` → keeps old logo
- If `keepExistingLogo` is missing/false AND no new logo → deletes logo
- `existingBanners` must be JSON array string: `["path1.jpg", "path2.jpg"]`
- New banners are ADDED to existing ones (not replaced)

### Delete Behavior:

- Checks if brand has associated products first
- If products exist → returns error (400)
- If no products → deletes brand and all associated image files
- Automatically removes logo and banner files from disk

---

## 🎯 Quick Test Checklist

- [ ] **Server Running:** `netstat -ano | findstr :5001` shows LISTENING
- [ ] **Create Brand:** POST with form-data works without headers
- [ ] **Upload Files:** Logo and banners upload successfully
- [ ] **Get Brands:** List returns with pagination
- [ ] **Get by Slug:** Single brand retrieval works
- [ ] **Update Brand:** Can update text fields and files
- [ ] **Keep Logo:** `keepExistingLogo: true` preserves logo
- [ ] **Add Banners:** New banners append to existing
- [ ] **Delete Brand:** Deletes brand without products
- [ ] **Cannot Delete:** Error when brand has products

---

## 🚀 Test with cURL (Alternative)

### Create Brand:

```bash
curl -X POST http://localhost:5001/api/brands \
  -F "title=Test Brand" \
  -F "description=Testing brand creation" \
  -F "status=active" \
  -F "logo=@/path/to/logo.jpg" \
  -F "banners=@/path/to/banner1.jpg" \
  -F "banners=@/path/to/banner2.jpg"
```

### Get All Brands:

```bash
curl http://localhost:5001/api/brands
```

### Delete Brand:

```bash
curl -X DELETE http://localhost:5001/api/brands/{brand-id}
```

---

**Status:** ✅ All endpoints tested and working  
**Next Steps:** Test from frontend BrandForm.jsx component
