---
description: Development workflow and project setup instructions
applyTo: "**"
---

# Development Workflow & Project Setup Instructions

## 🚀 Project Overview

**Enterprise E-Commerce Platform** is a production-ready MERN stack application optimized for handling 10M+ products. The project follows a monorepo structure with separate frontend and backend folders.

## 📁 Project Structure

```
New-Enterprice-Ecommerce/            # Root project directory
├── backend/                         # Node.js/Express API Server (Port 5001)
│   ├── src/
│   │   ├── core/                   # BaseController, BaseService classes
│   │   ├── controllers/            # HTTP request handlers (extend BaseController)
│   │   ├── services/               # Business logic layer (extend BaseService)
│   │   ├── models/                 # Mongoose schemas and models
│   │   ├── routes/                 # API route definitions
│   │   ├── middleware/             # Auth, validation, error handling
│   │   ├── validators/             # Express-validator rules
│   │   ├── utils/                  # Helper functions and utilities
│   │   ├── config/                 # Database and environment configuration
│   │   ├── seeders/                # Database seeding scripts
│   │   └── server.js               # Express server entry point
│   ├── package.json                # Backend dependencies and scripts
│   └── uploads/                    # File upload storage directory
├── frontend/                        # React/Vite Client App (Port 5173+)
│   ├── src/
│   │   ├── components/             # Reusable React components
│   │   ├── pages/                  # Page-level components and layouts
│   │   ├── services/               # API client services (apiClient.js)
│   │   ├── store/                  # Redux Toolkit stores and slices
│   │   ├── hooks/                  # Custom React hooks (13 available)
│   │   ├── utils/                  # Frontend utilities and helpers
│   │   ├── layouts/                # Layout wrapper components
│   │   └── main.jsx                # React application entry point
│   ├── package.json                # Frontend dependencies and scripts
│   └── public/                     # Static assets (images, icons)
├── .github/
│   ├── copilot-instructions.md     # Main AI coding guidelines
│   └── instructions/               # Specific coding instruction files
├── RestDoc/                        # Project documentation and guides
└── README.md                       # Main project documentation
```

## 🛠️ Technology Stack

| Layer          | Technology                                                 | Purpose                        |
| -------------- | ---------------------------------------------------------- | ------------------------------ |
| **Frontend**   | React 18.3 + Vite 5.4                                      | Modern client-side application |
| **Backend**    | Node.js + Express.js                                       | RESTful API server             |
| **Database**   | MongoDB + Mongoose                                         | Document database with ODM     |
| **State**      | Redux Toolkit                                              | Frontend state management      |
| **Styling**    | Tailwind CSS 3.4                                           | Utility-first CSS framework    |
| **Auth**       | JWT + HTTP-only cookies                                    | Secure authentication system   |
| **Validation** | React Hook Form + Yup (client), Express Validator (server) | Form validation                |

## 🚀 Development Commands

### **Quick Start (From Project Root)**

```bash
# Start both frontend and backend simultaneously
npm run dev

# This command starts:
# - Backend API server on http://localhost:5001
# - Frontend dev server on http://localhost:5173 (or next available port)
```

### **Individual Service Commands**

```bash
# Backend API Server
cd backend
npm run dev                 # Start with nodemon (auto-reload)
npm start                  # Start in production mode
npm run seed               # Seed database with sample data
npm run seed:minimal       # Quick seed (100 products, 50 users)
npm run queue:start        # Start background job worker

# Frontend Development Server
cd frontend
npm run dev                # Start Vite dev server
npm run build              # Build for production
npm run preview            # Preview production build
```

### **Database Operations**

```bash
cd backend

# Seeding options (choose one):
npm run seed               # Full seed (10K products, 1K users)
npm run seed:minimal       # Quick seed (100 products, 50 users)
npm run seed:development   # Dev seed (1K products, 100 users)
npm run seed:production    # Production seed (10M products, 10K users)
```

## 🔧 Environment Setup

### **Prerequisites**

- Node.js 18+
- MongoDB 6.0+
- npm 9+
- Redis (optional, for distributed caching)

### **Environment Variables**

**Backend (.env):**

```env
NODE_ENV=development
PORT=5001
MONGODB_URI=mongodb://localhost:27017/enterprise-ecommerce
JWT_SECRET=your-super-secret-key-min-32-characters
JWT_EXPIRE=7d
FRONTEND_URL=http://localhost:5173
```

**Frontend (.env):**

```env
VITE_API_URL=http://localhost:5001/api
```

## 🏗️ Architecture Principles

### **Backend Architecture**

- **3-Tier Pattern:** Routes → Controllers → Services → Models
- **Base Classes:** All controllers extend `BaseController`, services extend `BaseService`
- **Business Logic:** Always in services, never in controllers
- **Error Handling:** Centralized with `AppError` class and middleware

### **Frontend Architecture**

- **Component Structure:** Pages → Layouts → Components
- **State Management:** Redux Toolkit with slices
- **API Layer:** Centralized `apiClient.js` with automatic auth headers
- **Custom Hooks:** 13 reusable hooks for common patterns

## 🐛 Troubleshooting

### **Port Conflicts**

```powershell
# Windows - Find and kill process using port 5001
netstat -ano | findstr :5001
Stop-Process -Id <PID> -Force

# Kill all node processes if needed
taskkill /f /im node.exe
```

```bash
# Linux/Mac - Kill process on port 5001
lsof -ti:5001 | xargs kill -9
```

### **Common Development Issues**

| Issue                       | Cause                   | Solution                                        |
| --------------------------- | ----------------------- | ----------------------------------------------- |
| "Module not found"          | Missing dependencies    | `npm install` in affected directory             |
| "Cannot connect to MongoDB" | MongoDB not running     | `mongod` or start MongoDB service               |
| "CORS error"                | Wrong FRONTEND_URL      | Check `FRONTEND_URL` in backend `.env`          |
| "Validation failed"         | Server validation error | Check browser console for field-specific errors |
| "EADDRINUSE"                | Port already in use     | Kill process using port (see above)             |

### **Development Workflow**

1. **Start Development:** `npm run dev` from project root
2. **Check URLs:**
   - Frontend: http://localhost:5173 (auto-increment if busy)
   - Backend API: http://localhost:5001/api
3. **Seed Database:** `cd backend && npm run seed:minimal`
4. **Test Login:** Use quick login buttons with demo credentials
5. **Debug:** Check browser console and terminal logs

## 📚 Key Documentation

- **[Main README](../README.md):** Complete project overview
- **[API Documentation](../RestDoc/API_DOCUMENTATION.md):** API endpoints reference
- **[Quick Reference](../RestDoc/QUICK_REFERENCE.md):** Common development patterns
- **[Copilot Instructions](../copilot-instructions.md):** Detailed coding guidelines

## 🔑 Default Credentials (Development)

| Role      | Email           | Password    | Description                |
| --------- | --------------- | ----------- | -------------------------- |
| **Admin** | admin@admin.com | password123 | Full administrative access |
| **User**  | user@admin.com  | password123 | Regular customer account   |

Use the quick login buttons on the login page for instant authentication during development.

---

**Quick Command Reference:** `npm run dev` → Start everything → Visit http://localhost:5173
