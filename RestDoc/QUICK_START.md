# 🚀 Quick Start Guide

Get your Enterprise E-commerce MERN stack up and running in minutes!

## Prerequisites

Before you begin, ensure you have:

- ✅ **Node.js 18+** installed ([Download](https://nodejs.org/))
- ✅ **MongoDB** running locally or Atlas URI ([MongoDB](https://www.mongodb.com/))
- ✅ **Redis** running locally or cloud instance ([Redis](https://redis.io/))
- ✅ **npm** or **yarn** package manager
- ✅ **Git** for version control

## Installation (3 Steps)

### Step 1: Install Dependencies

```bash
# Clone or navigate to project
cd d:\wamp64\www\New-Enterprice-Ecommerce

# Install all dependencies (root, backend, frontend)
npm run install:all
```

This installs:
- 📦 Backend: Express, Mongoose, Redis, JWT, etc.
- 📦 Frontend: React 18.3, Vite, Redux, Tailwind
- 📦 Dev tools: ESLint, Prettier, Nodemon

### Step 2: Configure Environment

Create `.env` files from templates:

**Backend** (`backend/.env`):
```bash
# Copy template
cd backend
copy .env.example .env
```

Edit `backend/.env`:
```env
# Server
NODE_ENV=development
PORT=5000
API_URL=http://localhost:5000
FRONTEND_URL=http://localhost:3000

# Database - UPDATE THESE!
MONGODB_URI=mongodb://localhost:27017/enterprise-ecommerce
# Or use MongoDB Atlas (replace with your actual credentials):
# MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/ecommerce

# Redis - UPDATE THESE!
REDIS_HOST=localhost
REDIS_PORT=6379
# REDIS_PASSWORD=your_password_if_needed

# JWT Secret - CHANGE THIS!
JWT_SECRET=your-super-secret-jwt-key-change-this
JWT_EXPIRE=7d
JWT_REFRESH_SECRET=your-refresh-secret-key
JWT_REFRESH_EXPIRE=30d

# Email (Optional - for password reset, etc.)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
EMAIL_FROM=noreply@yourstore.com

# Payment (Optional - configure later)
STRIPE_SECRET_KEY=
STRIPE_PUBLISHABLE_KEY=
```

**Frontend** (`frontend/.env`):
```bash
cd ../frontend
copy .env.example .env
```

Edit `frontend/.env`:
```env
VITE_API_URL=http://localhost:5000/api
VITE_APP_NAME=Enterprise Ecommerce
```

### Step 3: Start Development Servers

**Option A: Start Everything**
```bash
# From project root
npm run dev
```

This runs:
- ✅ Backend API on `http://localhost:5000`
- ✅ Frontend on `http://localhost:3000`

**Option B: Start Individually**
```bash
# Terminal 1 - Backend
npm run dev:backend

# Terminal 2 - Frontend
npm run dev:frontend
```

## Verify Installation

### 1. Check Backend
Open browser: `http://localhost:5000/health`

Should see:
```json
{
  "success": true,
  "message": "Server is running",
  "timestamp": "2025-11-28T...",
  "environment": "development"
}
```

### 2. Check Frontend
Open browser: `http://localhost:3000`

Should see the Enterprise E-commerce homepage!

### 3. Check Database Connection
Look for these logs in backend terminal:
```
✅ MongoDB connected successfully
✅ Redis connected successfully  
🚀 Server running on port 5000 in development mode
```

## Using Docker (Alternative)

If you prefer Docker:

```bash
# Start all services (MongoDB, Redis, Backend, Frontend)
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

Services will be available at:
- Frontend: `http://localhost:3000`
- Backend: `http://localhost:5000`
- MongoDB: `localhost:27017`
- Redis: `localhost:6379`

## Common Issues & Solutions

### ❌ MongoDB Connection Error

**Problem:** `Error connecting to MongoDB`

**Solution:**
```bash
# Check if MongoDB is running
# On Windows:
net start MongoDB

# Or install MongoDB Compass and start from there
# Or use MongoDB Atlas (cloud) - get free tier at mongodb.com/atlas
```

Update `MONGODB_URI` in `backend/.env` with your connection string.

### ❌ Redis Connection Error

**Problem:** `Error connecting to Redis`

**Solution:**
```bash
# On Windows, install Redis via:
# 1. WSL2 + Ubuntu, then: sudo apt install redis-server
# 2. Or download from: https://github.com/microsoftarchive/redis/releases

# Start Redis:
redis-server

# Or use cloud Redis (Upstash, Redis Labs free tier)
```

### ❌ Port Already in Use

**Problem:** `Port 5000 already in use`

**Solution:**
```bash
# Change port in backend/.env
PORT=5001

# Or kill process using port:
# Windows:
netstat -ano | findstr :5000
taskkill /PID <PID> /F
```

### ❌ Module Not Found

**Problem:** `Cannot find module 'express'`

**Solution:**
```bash
# Delete node_modules and reinstall
rimraf node_modules backend/node_modules frontend/node_modules
npm run install:all
```

### ❌ Frontend Won't Start

**Problem:** Vite errors or blank page

**Solution:**
```bash
# Clear cache and reinstall
cd frontend
rm -rf node_modules dist .vite
npm install
npm run dev
```

## Next Steps

Now that your app is running:

1. **Explore the API**
   - Check `backend/src/routes/` for available endpoints
   - Use Postman or Thunder Client to test APIs
   - Health endpoint: `GET http://localhost:5000/health`

2. **Build Features**
   - Implement controller logic in `backend/src/controllers/` (to be created)
   - Create API service layer in `frontend/src/services/`
   - Build authentication forms (Login/Register)

3. **Customize UI**
   - Edit `frontend/src/pages/` components
   - Modify `frontend/tailwind.config.js` for theme
   - Add your brand colors and logo

4. **Add Products**
   - Create products via API or admin dashboard
   - Implement product management UI
   - Add category and brand management

5. **Set Up Payment**
   - Get Stripe API keys: https://dashboard.stripe.com
   - Add keys to `backend/.env`
   - Implement checkout flow

## Useful Commands

```bash
# Development
npm run dev              # Start both servers
npm run dev:backend      # Backend only
npm run dev:frontend     # Frontend only

# Building
npm run build            # Build frontend for production
npm run preview          # Preview production build

# Code Quality
npm run lint             # Check code quality
npm run lint:fix         # Auto-fix issues
npm run format           # Format code with Prettier

# Testing
npm run test             # Run all tests
npm run test:backend     # Backend tests only
npm run test:frontend    # Frontend tests only

# Cleanup
npm run clean            # Remove node_modules and dist
```

## Project Structure Overview

```
📁 backend/src/
  ├── 🔧 config/          # DB, Redis, env config
  ├── 🛡️ middleware/      # Auth, error handling
  ├── 📊 models/          # Mongoose schemas (9 models)
  ├── 🛣️ routes/          # API endpoints (10 files)
  ├── 🔧 utils/           # Helper functions
  └── 🚀 server.js        # Express app

📁 frontend/src/
  ├── 🧩 components/      # Reusable UI components
  ├── 📄 pages/           # Route pages (8 pages)
  ├── 🏪 store/           # Redux store + slices
  ├── 🎨 layouts/         # Page layouts
  └── 🚀 main.jsx         # React entry
```

## Environment Variables Reference

### Backend `.env`
| Variable | Description | Required |
|----------|-------------|----------|
| `NODE_ENV` | Environment (development/production) | ✅ Yes |
| `PORT` | API server port | ✅ Yes |
| `MONGODB_URI` | MongoDB connection string | ✅ Yes |
| `REDIS_HOST` | Redis server host | ✅ Yes |
| `REDIS_PORT` | Redis server port | ✅ Yes |
| `JWT_SECRET` | JWT signing secret | ✅ Yes |
| `SMTP_HOST` | Email server host | ❌ Optional |
| `STRIPE_SECRET_KEY` | Stripe API key | ❌ Optional |

### Frontend `.env`
| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_API_URL` | Backend API URL | ✅ Yes |
| `VITE_APP_NAME` | Application name | ❌ Optional |

## Support

- 📖 **Full Documentation:** See [README.md](./README.md)
- 🚀 **Setup Guide:** See [GETTING_STARTED.md](./GETTING_STARTED.md)
- 🔄 **Migration Details:** See [JAVASCRIPT_MIGRATION.md](./JAVASCRIPT_MIGRATION.md)
- 📝 **Project Summary:** See [PROJECT_SUMMARY.md](./PROJECT_SUMMARY.md)

## Tech Stack Summary

- **Frontend:** React 18.3.1, Vite 5.4, Redux Toolkit 2.3, Tailwind 3.4
- **Backend:** Node.js 18+, Express 4.21, Mongoose 8.8, Redis 4.7
- **Language:** JavaScript (ES6+ Modules)
- **Database:** MongoDB (NoSQL)
- **Cache:** Redis (In-memory)

---

**Happy Coding! 🎉**

Need help? Check the documentation or open an issue.
