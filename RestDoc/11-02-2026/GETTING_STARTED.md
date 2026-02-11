# 🎯 Getting Started Guide

## Quick Start

Follow these steps to get the Enterprise Ecommerce platform up and running on your local machine.

### Prerequisites

Make sure you have the following installed:
- Node.js >= 18.0.0
- npm >= 9.0.0
- MongoDB >= 6.0
- Redis >= 7.0

### Step 1: Clone and Install

```powershell
# Navigate to the project directory
cd d:\wamp64\www\New-Enterprice-Ecommerce

# Install all dependencies
npm run install:all
```

### Step 2: Set up Environment Variables

#### Backend Environment

```powershell
# Copy the example env file
cd backend
copy .env.example .env
```

Edit `backend/.env` and update the following important variables:
- `MONGODB_URI` - Your MongoDB connection string
- `REDIS_HOST` and `REDIS_PORT` - Your Redis connection details
- `JWT_SECRET` - A strong secret key (at least 32 characters)
- `SMTP_*` - Email service credentials for notifications

#### Frontend Environment

```powershell
# Go to frontend directory
cd ..\frontend
copy .env.example .env
```

Edit `frontend/.env` and update:
- `VITE_API_BASE_URL` - Backend API URL (default: http://localhost:5000/api)

### Step 3: Start MongoDB and Redis

```powershell
# Option 1: Using Docker (recommended)
docker-compose up -d mongodb redis

# Option 2: Start services manually
# Start MongoDB
mongod --dbpath=C:\data\db

# Start Redis (in a new terminal)
redis-server
```

### Step 4: Run the Application

#### Development Mode (Recommended for development)

```powershell
# From the root directory, run both frontend and backend
npm run dev
```

This will start:
- Backend API at http://localhost:5000
- Frontend at http://localhost:5173

#### Separate Terminals (Alternative)

```powershell
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

### Step 5: Access the Application

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5000
- **Health Check**: http://localhost:5000/health

### Step 6: Seed Initial Data (Optional)

```powershell
cd backend
npm run seed
```

This will create:
- Admin user (admin@example.com / Admin@123456)
- Sample categories
- Sample products
- Sample brands

## Common Issues & Solutions

### Issue: MongoDB Connection Failed

**Solution:**
- Make sure MongoDB is running
- Check the `MONGODB_URI` in your `.env` file
- Verify MongoDB is accessible at the specified host/port

### Issue: Redis Connection Failed

**Solution:**
- Ensure Redis server is running
- Check `REDIS_HOST` and `REDIS_PORT` in `.env`
- Try: `redis-cli ping` (should return PONG)

### Issue: Port Already in Use

**Solution:**
```powershell
# Find process using port 5000 (backend)
netstat -ano | findstr :5000

# Kill the process (replace PID with actual process ID)
taskkill /PID <PID> /F

# For frontend (port 5173)
netstat -ano | findstr :5173
taskkill /PID <PID> /F
```

### Issue: Module Not Found Errors

**Solution:**
```powershell
# Clean install
npm run clean
npm run install:all
```

## Next Steps

Once your application is running:

1. **Explore the API** - Check `backend/src/routes/` for available endpoints
2. **Customize Models** - Modify schemas in `backend/src/models/`
3. **Build UI Components** - Add components in `frontend/src/components/`
4. **Implement Features** - Follow the project structure and coding patterns

## Development Workflow

### Making Changes

1. Create a new branch for your feature
2. Make your changes
3. Test locally
4. Commit and push
5. Create a pull request

### Code Quality

```powershell
# Run linters
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format
```

### Testing

```powershell
# Run tests
npm test

# Run tests in watch mode
npm run test:watch
```

## Deployment

See `DEPLOYMENT_GUIDE.md` for production deployment instructions.

## Support

If you encounter any issues:
1. Check this guide first
2. Review the main README.md
3. Check existing issues on GitHub
4. Create a new issue with details

Happy coding! 🚀
