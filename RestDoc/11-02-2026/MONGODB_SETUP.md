# MongoDB Setup Guide for Windows

## Current Issue

Your backend is trying to connect to MongoDB at `localhost:27017`, but MongoDB is not running.

## Quick Solutions

### Option 1: Use MongoDB Atlas (Cloud - Recommended for Development)

**Easiest option - No local installation needed!**

1. **Create Free Account:**
   - Go to https://www.mongodb.com/cloud/atlas/register
   - Sign up for free (no credit card required)
   - Choose "Shared" tier (FREE)

2. **Create Cluster:**
   - Click "Build a Cluster"
   - Select your region (choose closest to you)
   - Click "Create Cluster" (takes 3-5 minutes)

3. **Configure Access:**
   - Click "Database Access" → "Add New Database User"
   - Create username/password (save these!)
   - Set role to "Atlas admin"
   - Click "Network Access" → "Add IP Address"
   - Click "Allow Access from Anywhere" (for development)
   - Confirm

4. **Get Connection String:**
   - Click "Databases" → "Connect" → "Connect your application"
   - Copy the connection string (it will look similar to this example):

   ```
   mongodb+srv://<your-username>:<your-password>@<your-cluster>.mongodb.net/<database-name>?retryWrites=true&w=majority
   ```

   - Note: Replace the placeholders with your actual credentials from MongoDB Atlas

5. **Update `.env` file:**

   ```bash
   cd d:\wamp64\www\New-Enterprice-Ecommerce\backend
   notepad .env
   ```

   Replace:

   ```env
   MONGODB_URI=mongodb://localhost:27017/enterprise-ecommerce
   ```

   With your Atlas connection string (get this from MongoDB Atlas dashboard):

   ```env
   MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/enterprise-ecommerce?retryWrites=true&w=majority
   ```

6. **Restart the server** - It should connect now! ✅

---

### Option 2: Install MongoDB Locally

**If you want to run MongoDB on your machine:**

#### Using MongoDB Community Server:

1. **Download MongoDB:**
   - Go to https://www.mongodb.com/try/download/community
   - Download MongoDB Community Server for Windows
   - Run the installer (choose "Complete" installation)

2. **Install as Windows Service:**
   - During installation, check "Install MongoDB as a Service"
   - Accept default settings

3. **Start MongoDB:**

   ```powershell
   # Check if service is running
   Get-Service -Name MongoDB

   # If not running, start it:
   net start MongoDB
   ```

4. **Verify it's running:**

   ```powershell
   # Should show MongoDB listening on 27017
   netstat -an | findstr "27017"
   ```

5. **Your `.env` is already configured** for localhost! Just restart your server.

---

### Option 3: Use Docker (If you have Docker Desktop)

**Quick and clean, isolated from your system:**

1. **Make sure Docker Desktop is running**

2. **Start MongoDB with Docker Compose:**

   ```powershell
   cd d:\wamp64\www\New-Enterprice-Ecommerce
   docker-compose up -d mongodb
   ```

3. **Verify it's running:**

   ```powershell
   docker ps
   ```

4. **Your `.env` is already configured!** Just restart your server.

---

## Checking Connection

After choosing any option above, verify the connection:

1. **Backend should start successfully:**

   ```
   ✅ MongoDB connected successfully
   ✅ Redis connected successfully
   🚀 Server running on port 5000
   ```

2. **Test the health endpoint:**
   - Open browser: http://localhost:5000/health
   - Should return JSON with "success": true

---

## Redis Setup (You'll need this too!)

Your backend also needs Redis. Here are quick options:

### Option A: Use Upstash (Cloud Redis - Free tier)

1. Go to https://upstash.com/
2. Sign up free
3. Create Redis database
4. Copy connection details to `.env`:
   ```env
   REDIS_HOST=your-host.upstash.io
   REDIS_PORT=6379
   REDIS_PASSWORD=your-password
   ```

### Option B: Install Redis locally

Since Redis doesn't run natively on Windows:

**Use WSL2 (Windows Subsystem for Linux):**

```powershell
# Install WSL2 if not already installed
wsl --install

# After reboot, in WSL terminal:
sudo apt update
sudo apt install redis-server
redis-server --daemonize yes

# Verify
redis-cli ping
# Should return: PONG
```

### Option C: Use Docker

```powershell
cd d:\wamp64\www\New-Enterprice-Ecommerce
docker-compose up -d redis
```

---

## Recommended Setup for Quick Start

**Fastest way to get running:**

1. ✅ **MongoDB**: Use Atlas (cloud) - 2 minutes setup
2. ✅ **Redis**: Use Upstash (cloud) - 2 minutes setup
3. ✅ **Update** `backend/.env` with connection strings
4. ✅ **Restart** server with `npm run dev`

Total time: ~5 minutes and you're up and running! 🚀

---

## Current Status

✅ Backend code is ready
✅ `.env` file created
✅ Duplicate index warning fixed
❌ Need to connect to MongoDB (choose option above)
❌ Need to connect to Redis (optional for now, but recommended)

## Next Steps

1. Choose MongoDB option (I recommend Atlas for simplicity)
2. Update `backend/.env` with connection string
3. Restart the development server
4. You should see success messages! ✅

Need help? Let me know which option you want to use!
