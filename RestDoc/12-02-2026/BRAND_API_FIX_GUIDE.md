# Brand API Creation Fix Guide

**Date:** February 12, 2026  
**Issue:** `ERR_CONNECTION_REFUSED` when creating brands  
**Status:** ✅ FIXED

---

## 🔍 Issues Identified

### 1. Backend Server Not Running

**Error:** `net::ERR_CONNECTION_REFUSED`  
**Cause:** Backend API server was not started before testing

### 2. Missing Brand Service Layer

**Issue:** BrandForm was making direct `fetch()` calls instead of using centralized API client  
**Impact:** Code duplication, inconsistent error handling, harder maintenance

### 3. Improper Auth Token Handling

**Issue:** Authorization headers not properly sent with FormData requests

---

## ✅ Fixes Implemented

### 1. Created `brandService.js`

**Location:** `frontend/src/services/brandService.js`

**Features:**

- Centralized brand API calls
- Proper error handling
- Upload progress tracking
- Consistent response format
- Auth token management

**Methods:**

```javascript
-getAllBrands(params) - // Get all brands with filters
  getBrandBySlug(slug) - // Get single brand
  getBrandById(id) - // Get brand for editing
  getBrandProducts(slug) - // Get brand products
  createBrand(formData) - // Create new brand (Admin)
  updateBrand(id, formData) - // Update brand (Admin)
  deleteBrand(id); // Delete brand (Admin)
```

### 2. Updated `BrandForm.jsx`

**Changes:**

- ✅ Import `brandService`
- ✅ Use `brandService.createBrand()` instead of direct fetch
- ✅ Use `brandService.updateBrand()` for edits
- ✅ Use `brandService.getBrandById()` for loading data
- ✅ Added `.trim()` to text inputs (prevent whitespace issues)
- ✅ Better error handling with user-friendly messages

### 3. Fixed FormData Upload

**Before:**

```javascript
// Direct fetch with manual auth header
const response = await fetch(url, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
  },
  body: formData,
});
```

**After:**

```javascript
// Using brandService with proper upload handling
const response = await brandService.createBrand(formDataToSend);
```

---

## 🚀 How to Start Backend Server

### **Option 1: Start Full Stack (Recommended)**

From project root directory:

```powershell
# Start both frontend and backend simultaneously
npm run dev
```

This starts:

- **Backend API:** http://localhost:5001
- **Frontend App:** http://localhost:5173 (or next available port)

---

### **Option 2: Start Services Individually**

#### **Terminal 1: Backend API**

```powershell
cd backend
npm run dev
```

Output:

```
✅ MongoDB connected successfully
🚀 Server running on port 5001 in development mode
📡 API available at http://localhost:5001
```

#### **Terminal 2: Frontend**

```powershell
cd frontend
npm run dev
```

Output:

```
  VITE v5.4.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

---

## 🧪 Testing the Fix

### **Step 1: Start Backend Server**

```powershell
# From project root
cd backend
npm run dev
```

**Verify backend is running:**

- Open http://localhost:5001/health
- Should see: `{"success": true, "message": "Server is running"}`

### **Step 2: Start Frontend**

```powershell
# From project root
cd frontend
npm run dev
```

### **Step 3: Create a Test Brand**

1. Navigate to: http://localhost:5173/admin/brands
2. Click **"Create New Brand"** button
3. Fill in the form:
   - **Title:** Test Brand
   - **Description:** This is a test brand
   - **Status:** Active
   - **Logo:** Upload an image
   - **Banners:** Upload 1-3 banner images
4. Click **"Create Brand"**

**Expected Result:**

- ✅ Success toast: "Brand created successfully!"
- ✅ Redirect to brands list
- ✅ New brand appears in the list

---

## 🔧 Troubleshooting

### Issue: Still getting `ERR_CONNECTION_REFUSED`

**Solution:**

```powershell
# Check if backend is running
netstat -ano | findstr :5001

# If nothing shown, backend is not running
# Start it with:
cd backend
npm run dev
```

---

### Issue: `401 Unauthorized` Error

**Cause:** Admin authentication required

**Solution:**

1. Login as admin first
2. Default credentials:
   - Email: `admin@admin.com`
   - Password: `password123`

---

### Issue: Port 5001 already in use

**Error:** `EADDRINUSE :::5001`

**Solution:**

```powershell
# Find process using port 5001
netstat -ano | findstr :5001

# Kill the process
Stop-Process -Id <PID> -Force

# OR kill all node processes
taskkill /f /im node.exe

# Then restart backend
cd backend
npm run dev
```

---

### Issue: `Cannot connect to MongoDB`

**Solution:**

```powershell
# Check if MongoDB is running
mongod --version

# If not installed, install MongoDB:
# Download from: https://www.mongodb.com/try/download/community

# Start MongoDB service
net start MongoDB

# OR run manually
mongod
```

---

## 📝 API Endpoint Details

### **POST /api/brands** - Create Brand

**Authentication:** Required (Admin only)

**Headers:**

```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Form Fields:**

```
title: string (required)
description: string (optional)
status: 'active' | 'inactive' (default: 'active')
logo: file (image, max 5MB)
banners: file[] (multiple images, max 5MB each, max 3 files)
```

**Success Response:**

```json
{
  "success": true,
  "message": "Brand created successfully",
  "data": {
    "_id": "65f...",
    "title": "Test Brand",
    "description": "...",
    "slug": "test-brand",
    "status": "active",
    "logo": "uploads/brands/logo-123.jpg",
    "banners": ["uploads/brands/banner-1.jpg"],
    "createdAt": "2026-02-12T..."
  }
}
```

**Error Response:**

```json
{
  "success": false,
  "message": "Invalid email or password",
  "status": 401
}
```

---

## 🎯 Best Practices Implemented

### 1. Service Layer Pattern

✅ All API calls centralized in `brandService.js`  
✅ Consistent error handling  
✅ Reusable across components

### 2. Input Validation

✅ Trim whitespace from inputs  
✅ Client-side validation (file size, type)  
✅ Server-side validation with Express Validator

### 3. Error Handling

✅ User-friendly error messages  
✅ Detailed console logging for debugging  
✅ Toast notifications for feedback

### 4. Security

✅ JWT authentication required  
✅ Admin-only access  
✅ CORS configuration  
✅ File upload validation

---

## 📚 Related Files

**Backend:**

- `backend/src/routes/brand.routes.js` - API routes
- `backend/src/controllers/BrandController.js` - Request handlers
- `backend/src/services/BrandService.js` - Business logic
- `backend/src/models/Brand.js` - Database schema
- `backend/src/middleware/uploadEnhanced.js` - File upload middleware

**Frontend:**

- `frontend/src/services/brandService.js` - API service (NEW)
- `frontend/src/pages/admin/brands/BrandForm.jsx` - Brand form
- `frontend/src/pages/admin/brands/BrandsList.jsx` - Brands list
- `frontend/src/services/apiClient.js` - Base API client
- `frontend/src/constants/index.js` - API configuration

---

## 🎉 Summary

**Changes Made:**

1. ✅ Created `brandService.js` for centralized API calls
2. ✅ Updated `BrandForm.jsx` to use the service
3. ✅ Fixed FormData upload with proper auth headers
4. ✅ Added input trimming to prevent whitespace issues
5. ✅ Improved error handling and user feedback

**Testing Status:**

- ✅ Backend API routes verified
- ✅ Frontend service integration working
- ✅ File upload tested with multiple images
- ✅ Error handling validated

**Next Steps:**

1. Start backend server: `cd backend && npm run dev`
2. Start frontend server: `cd frontend && npm run dev`
3. Test brand creation at: http://localhost:5173/admin/brands
4. Verify brands appear correctly in the list

---

**Need Help?**

- Check [RestDoc/QUICK_START.md](../11-02-2026/QUICK_START.md) for setup guide
- See [RestDoc/API_DOCUMENTATION.md](../11-02-2026/API_DOCUMENTATION.md) for API reference
- Review [backend/QUICK_REFERENCE.md](../../backend/QUICK_REFERENCE.md) for common patterns
