# Quick Start Guide - Brand API Testing

**Date:** February 12, 2026  
**Purpose:** Quick guide to test the brand creation API fix

---

## 🚀 Quick Start (3 Steps)

### **Step 1: Start Development Servers**

**Option A: Automated (Recommended)**

```powershell
# From project root directory
.\start-dev.ps1
```

**Option B: Manual**

```powershell
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Frontend
cd frontend
npm run dev
```

### **Step 2: Verify Servers Running**

**Check Backend:**

- Open browser: http://localhost:5001/health
- Expected: `{"success": true, "message": "Server is running"}`

**Check Frontend:**

- Open browser: http://localhost:5173
- Expected: Home page loads

### **Step 3: Test Brand Creation**

1. **Login as Admin:**
   - Navigate to: http://localhost:5173/login
   - Email: `admin@admin.com`
   - Password: `password123`
   - Click **Login** or use quick login button

2. **Go to Brands Page:**
   - Click **Admin** in navigation
   - Click **Brands** in sidebar
   - URL: http://localhost:5173/admin/brands

3. **Create New Brand:**
   - Click **"Create Brand"** button
   - Fill in:
     - **Title:** "Nike" (or any brand name)
     - **Description:** "Athletic apparel and footwear"
     - **Status:** Active
     - **Logo:** Upload a logo image (JPG/PNG, max 5MB)
     - **Banners:** Upload 1-3 banner images (optional)
   - Click **"Create Brand"** button

4. **Verify Success:**
   - ✅ See success toast: "Brand created successfully!"
   - ✅ Redirected to brands list
   - ✅ New brand appears in the table

---

## 🐛 Common Issues & Solutions

### Issue 1: "ERR_CONNECTION_REFUSED"

**Cause:** Backend server not running

**Solution:**

```powershell
# Check if backend is running
netstat -ano | findstr :5001

# If nothing appears, start backend:
cd backend
npm run dev
```

---

### Issue 2: "401 Unauthorized"

**Cause:** Not logged in or token expired

**Solution:**

1. Login as admin: http://localhost:5173/login
2. Use credentials:
   - Email: `admin@admin.com`
   - Password: `password123`

---

### Issue 3: "Cannot connect to MongoDB"

**Cause:** MongoDB not running

**Solution:**

```powershell
# Start MongoDB service
net start MongoDB

# OR run manually
mongod

# OR use the startup script
.\RestDoc\start-mongodb.ps1
```

---

### Issue 4: Port Already in Use

**Error:** `EADDRINUSE :::5001` or `:::5173`

**Solution:**

```powershell
# Kill processes on port 5001
netstat -ano | findstr :5001
Stop-Process -Id <PID> -Force

# Kill all node processes
taskkill /f /im node.exe

# Then restart servers
```

---

### Issue 5: File Upload Fails

**Symptoms:**

- Upload button doesn't work
- "File too large" error
- Request fails silently

**Solution:**

1. **Check file size:** Max 5MB per image
2. **Check file format:** Only JPG, PNG, WEBP allowed
3. **Check network tab:** Look for 413 (Payload Too Large)
4. **Check backend logs:** See specific error message

**Fix if needed:**

```javascript
// backend/src/server.js - Already configured
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
```

---

## 🧪 Test Using Postman/Thunder Client

If frontend doesn't work, test backend directly:

### **1. Login to Get Token**

**POST** `http://localhost:5001/api/auth/login`

**Body (JSON):**

```json
{
  "email": "admin@admin.com",
  "password": "password123"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "user": {...},
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Copy the token** from response.

### **2. Create Brand**

**POST** `http://localhost:5001/api/brands`

**Headers:**

```
Authorization: Bearer YOUR_TOKEN_HERE
Content-Type: multipart/form-data
```

**Body (form-data):**

```
title: Nike
description: Athletic apparel and footwear
status: active
logo: [select file]
banners: [select file] (can select multiple)
```

**Expected Response:**

```json
{
  "success": true,
  "message": "Brand created successfully",
  "data": {
    "_id": "65f...",
    "title": "Nike",
    "slug": "nike",
    "description": "Athletic apparel and footwear",
    "status": "active",
    "logo": "uploads/brands/logo-1234567890.jpg",
    "banners": ["uploads/brands/banner-1234567890.jpg"],
    "productCount": 0,
    "createdAt": "2026-02-12T10:30:00.000Z"
  }
}
```

---

## 📝 Request/Response Debugging

### **Frontend Console**

Open browser DevTools (F12) and check:

1. **Console Tab:**

   ```javascript
   [API] POST /api/brands - 234ms
   Brand created successfully!
   ```

2. **Network Tab:**
   - Filter by "brands"
   - Check request:
     - Method: POST
     - Status: 201 Created
     - Headers: Authorization present
     - Payload: FormData with files
   - Check response:
     - success: true
     - data: {...}

### **Backend Logs**

Check terminal running backend:

```
POST /api/brands
✅ Brand created: Nike
POST /api/brands - 165ms
```

---

## 🎯 Expected Behavior

### **Successful Brand Creation:**

1. ✅ Form validation passes
2. ✅ Files upload successfully
3. ✅ Success toast appears
4. ✅ Redirect to brands list
5. ✅ New brand visible in table
6. ✅ Logo and banners accessible via URL

### **Brand Appears in List:**

- **Title:** Nike
- **Slug:** nike
- **Status:** Active
- **Products:** 0
- **Logo:** Displayed as thumbnail
- **Actions:** Edit, Delete buttons visible

### **Image URLs Work:**

- Logo: http://localhost:5001/uploads/brands/logo-xxx.jpg
- Banner: http://localhost:5001/uploads/brands/banner-xxx.jpg

---

## 📊 Verify Database

### **Using MongoDB Compass:**

1. Connect to: `mongodb://localhost:27017`
2. Database: `enterprise-ecommerce`
3. Collection: `brands`
4. Find document with title "Nike"
5. Verify fields:
   - `title`, `slug`, `description`
   - `logo`, `banners` (file paths)
   - `status`, `productCount`
   - `createdAt`, `updatedAt`

### **Using Mongo Shell:**

```bash
mongosh
use enterprise-ecommerce
db.brands.find({ title: "Nike" })
```

---

## 🔍 Debug Checklist

Before reporting issues, verify:

- [ ] Backend server running (http://localhost:5001/health returns success)
- [ ] Frontend server running (http://localhost:5173 loads)
- [ ] MongoDB service running
- [ ] Logged in as admin user
- [ ] Auth token present in localStorage (`auth_token`)
- [ ] Network tab shows POST request sent
- [ ] Console shows no JavaScript errors
- [ ] Backend logs show request received
- [ ] File size under 5MB
- [ ] File format is JPG/PNG/WEBP

---

## 📞 Need Help?

Check these resources:

1. **Full Fix Guide:** [RestDoc/12-02-2026/BRAND_API_FIX_GUIDE.md](./BRAND_API_FIX_GUIDE.md)
2. **API Documentation:** [RestDoc/11-02-2026/API_DOCUMENTATION.md](../11-02-2026/API_DOCUMENTATION.md)
3. **Quick Reference:** [RestDoc/11-02-2026/QUICK_REFERENCE.md](../11-02-2026/QUICK_REFERENCE.md)
4. **Setup Guide:** [RestDoc/11-02-2026/GETTING_STARTED.md](../11-02-2026/GETTING_STARTED.md)

---

**Happy Testing! 🎉**
