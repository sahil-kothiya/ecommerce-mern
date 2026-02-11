# Enterprise E-Commerce Platform - AI Coding Instructions

**Production-Ready MERN Stack optimized for 10M+ products**

## 🏗️ Project Structure Overview

**Root Directory Structure:**

```
New-Enterprice-Ecommerce/
├── backend/                   # Node.js/Express API Server
│   ├── src/
│   │   ├── core/             # BaseController, BaseService classes
│   │   ├── controllers/      # HTTP request handlers
│   │   ├── services/         # Business logic layer
│   │   ├── models/           # Mongoose schemas/models
│   │   ├── routes/           # API route definitions
│   │   ├── middleware/       # Auth, validation, error handling
│   │   ├── validators/       # Input validation rules
│   │   ├── utils/            # Helper functions
│   │   ├── config/           # Database, environment config
│   │   ├── seeders/          # Database seeding scripts
│   │   └── server.js         # Express server entry point
│   ├── package.json          # Backend dependencies
│   └── uploads/              # File upload storage
├── frontend/                  # React/Vite Client App
│   ├── src/
│   │   ├── components/       # Reusable React components
│   │   ├── pages/            # Page-level components
│   │   ├── services/         # API client services
│   │   ├── store/            # Redux Toolkit stores
│   │   ├── hooks/            # Custom React hooks
│   │   ├── utils/            # Frontend utilities
│   │   ├── layouts/          # Layout components
│   │   └── main.jsx          # React app entry point
│   ├── package.json          # Frontend dependencies
│   └── public/               # Static assets
├── .github/
│   ├── copilot-instructions.md  # This file
│   └── instructions/         # Additional coding guidelines
├── RestDoc/                  # Project documentation
└── README.md                 # Main project documentation
```

## 🚀 Development Setup & Workflow

### **Initial Setup (First Time)**

```bash
# 1. Navigate to project root
cd New-Enterprice-Ecommerce

# 2. Install backend dependencies
cd backend
npm install

# 3. Install frontend dependencies
cd ../frontend
npm install

# 4. Return to root for development
cd ..
```

### **Daily Development Workflow**

**Start Full Stack Development (Recommended):**

```bash
# From project root - starts both frontend and backend
npm run dev
```

**OR Start Services Individually:**

```bash
# Terminal 1: Backend API Server (http://localhost:5001)
cd backend
npm run dev

# Terminal 2: Frontend Development Server (http://localhost:5173+)
cd frontend
npm run dev

# Terminal 3: Queue Worker (for background jobs) - Optional
cd backend
npm run queue:start
```

### **Database Operations**

```bash
# Seed database with sample data
cd backend
npm run seed              # Full seed (10K products, 1K users)
npm run seed:minimal      # Quick seed (100 products, 50 users)
npm run seed:development  # Dev seed (1K products, 100 users)
npm run seed:production   # Production seed (10M products, 10K users)
```

### **Port Configuration**

| Service         | Default Port | URL                       |
| --------------- | ------------ | ------------------------- |
| **Backend API** | 5001         | http://localhost:5001     |
| **Frontend**    | 5173         | http://localhost:5173     |
| **MongoDB**     | 27017        | mongodb://localhost:27017 |
| **Redis**       | 6379         | redis://localhost:6379    |

**Note:** Vite automatically finds available ports (5173, 5174, 5175, etc.) if default is in use.

## Architecture Overview

**Monorepo Structure**: Separate `backend/` (Node.js/Express) and `frontend/` (React/Vite) folders at root level.

**Service Layer Pattern**: Backend follows a 3-tier architecture:

- **Routes** → **Controllers** (HTTP handling) → **Services** (business logic) → **Models** (data layer)
- Controllers extend [BaseController](backend/src/core/BaseController.js), Services extend [BaseService](backend/src/core/BaseService.js)
- Never put business logic in controllers; it belongs in services

**Data Denormalization**: Models like [Product.js](backend/src/models/Product.js) embed category and brand info to avoid joins. Update patterns cascade changes to embedded data.

## Critical Development Patterns

### Backend Controllers & Services

**Always extend base classes** when creating new features:

```javascript
// Controller pattern - see ProductController.js
export class MyController extends BaseController {
  constructor() {
    super(new MyService());
  }

  index = this.catchAsync(async (req, res) => {
    const { page, limit } = this.parsePaginationParams(req.query);
    const result = await this.service.findAll({ page, limit });
    this.sendPaginatedResponse(res, result.items, result.pagination);
  });
}

// Service pattern - see ProductService.js
export class MyService extends BaseService {
  constructor() {
    super(MyModel); // Pass Mongoose model
  }

  async customMethod(data) {
    // Business logic here, not in controllers
  }
}
```

**Available base methods**: Check [BaseController.js](backend/src/core/BaseController.js#L28-L43) for `sendSuccess`, `sendPaginatedResponse`, `catchAsync`, `validateRequiredFields`. See [BaseService.js](backend/src/core/BaseService.js#L25-L90) for `findAll`, `findByIdOrFail`, `create`, `update`, `delete`, `softDelete`.

### Input Validation

**ALWAYS validate on BOTH client and server sides** - see [validation-best-practices.instructions.md](.github/instructions/validation-best-practices.instructions.md) for complete guide.

**Client-side validation** (React Hook Form + Yup):

```javascript
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";

const schema = yup.object().shape({
  email: yup.string().required("Email required").email("Invalid email").trim(),
  password: yup
    .string()
    .required("Password required")
    .min(8, "Min 8 characters"),
});

const {
  register,
  handleSubmit,
  formState: { errors },
} = useForm({
  resolver: yupResolver(schema),
  mode: "onBlur", // Validate on blur for better UX
});
```

**Server-side validation** (Express Validator):

```javascript
import { loginValidator, validate } from "../validators/index.js";

router.post(
  "/login",
  authRateLimiter, // Rate limiting
  loginValidator, // Validation rules
  validate, // Check validation results
  authController.login,
);
```

**Available validators**:

- `authValidators.js` - registration, login, password updates
- `productValidators.js` - product CRUD, queries
- `orderValidators.js` - order creation, status updates

**Creating custom validators**:

```javascript
import { body } from "express-validator";

export const myValidator = [
  body("field").trim().notEmpty().withMessage("Field required"),
  body("email").isEmail().normalizeEmail().withMessage("Invalid email"),
];
```

### Inline Comments Standards

**ALWAYS add comprehensive inline comments** - see [inline-comments-standard.instructions.md](.github/instructions/inline-comments-standard.instructions.md) for complete guide.

**Required section headers**:

```javascript
// ============================================================================
// SECTION TITLE (e.g., STATE & HOOKS, VALIDATION, API CALLS)
// ============================================================================
```

**Comment functions and complex logic**:

```javascript
/**
 * Authenticate user and generate JWT tokens
 *
 * @param {string} email - User's email (validated)
 * @param {string} password - Plain text password
 * @param {boolean} rememberMe - Extends token expiration to 30 days
 * @returns {Promise<{accessToken: string}>}
 */
async function login(email, password, rememberMe) {
  // Clear previous authentication errors
  setError("");

  // Call authentication service with validated credentials
  const response = await authService.login(email, password, rememberMe);

  // Store token in HTTP-only cookie for security
  return response;
}
```

### Queue System for Background Jobs

**Use Bull queues** for time-consuming operations:

```javascript
import { queueRatingUpdate } from "../queues/ratingsQueue.js";

// In service or controller
await queueRatingUpdate(productId);
```

**Available queues**:

- `ratingsQueue` - Product rating calculations
- `emailQueue` - Email notifications
- `imageProcessingQueue` - Image optimization

**Start queue worker**: `npm run queue:start` (separate process)

### Authentication & Authorization

**JWT with HTTP-only cookies**: Auth uses dual-token approach (see [auth.js](backend/src/middleware/auth.js)):

- Tokens checked in order: `Authorization: Bearer <token>` header → `accessToken` cookie → `token` cookie
- Verify with `protect` middleware: `router.get('/profile', protect, handler)`
- Role check with `authorize`: `router.delete('/admin', protect, authorize('admin'), handler)`

**User roles**: Defined in [User.js](backend/src/models/User.js) - `customer`, `admin`, `vendor`

### File Uploads & Images

**Multiple image handling**: Use [uploadEnhanced.js](backend/src/middleware/uploadEnhanced.js) middleware for array uploads:

- Products support multiple images stored as array in `images` field
- Upload destination: `backend/uploads/{categories,products,banners}/`
- Frontend image service: [imageService.js](frontend/src/services/imageService.js) handles CDN URLs

## Performance Optimization Rules

**Database queries MUST use `.lean()`** for 10x speed boost (converts Mongoose docs to plain objects):

```javascript
// ❌ NEVER: await Product.find().populate('category')
// ✅ ALWAYS: await Product.find().populate('category').lean()
```

**Cursor pagination** preferred over offset for large datasets (see [ProductService.js](backend/src/services/ProductService.js)):

```javascript
// Use { _id: { $gt: cursor } } instead of .skip(offset)
```

**Compound indexes**: Check [Product.js](backend/src/models/Product.js) model for index patterns - always index on `status`, common filter fields, and sort fields together.

**Connection pools**: Database config at [database.js](backend/src/config/database.js) uses 100 max connections for high concurrency.

## Frontend Conventions

**Custom hooks**: 13 reusable hooks in [hooks/index.js](frontend/src/hooks/index.js) - use `useAsync`, `useDebounce`, `useLocalStorage`, `usePagination` instead of reimplementing.

**API services**: Centralized in [apiClient.js](frontend/src/services/apiClient.js) - all backend calls go through this with automatic auth header injection.

**Styling**: Tailwind CSS 3.4 only - no custom CSS files. Config at [tailwind.config.js](frontend/tailwind.config.js).

### Redux State Management

**Redux Toolkit**: Configured at [store/index.js](frontend/src/store/index.js) with slices for `auth`, `cart`, and `product`.

**Creating new slices**:

```javascript
import { createSlice } from "@reduxjs/toolkit";

const initialState = { items: [], loading: false };

const mySlice = createSlice({
  name: "myFeature",
  initialState,
  reducers: {
    setItems: (state, action) => {
      state.items = action.payload;
    },
  },
});

export const { setItems } = mySlice.actions;
export default mySlice.reducer;
```

**localStorage integration**: Slices sync with localStorage directly in reducers (see [authSlice.js](frontend/src/store/slices/authSlice.js) for token storage, [cartSlice.js](frontend/src/store/slices/cartSlice.js) for cart persistence).

**Register slices**: Add to store config in [store/index.js](frontend/src/store/index.js) reducer object.

## Development Workflow

### **Quick Start Commands**

```bash
# Start everything (from project root)
npm run dev                  # Starts both frontend and backend

# Individual services
cd backend && npm run dev    # API server (port 5001)
cd frontend && npm run dev   # React app (port 5173+)
cd backend && npm run seed   # Populate database
```

### **Development URLs**

- **Frontend:** http://localhost:5173 (or next available port)
- **Backend API:** http://localhost:5001/api
- **API Docs:** See [RestDoc/API_DOCUMENTATION.md](RestDoc/API_DOCUMENTATION.md)

### **Troubleshooting Development Issues**

**Port Conflicts (EADDRINUSE):**

```powershell
# Windows - Find and kill process using port
netstat -ano | findstr :5001
Stop-Process -Id <PID> -Force

# Or kill all node processes
taskkill /f /im node.exe
```

```bash
# Linux/Mac - Find and kill process
lsof -ti:5001 | xargs kill -9
```

**Common Issues:**

| Issue                       | Solution                                |
| --------------------------- | --------------------------------------- |
| "Module not found"          | `npm install` in affected directory     |
| "Cannot connect to MongoDB" | Start MongoDB service: `mongod`         |
| "Redis connection failed"   | Start Redis: `redis-server` (optional)  |
| "Validation failed"         | Check error message in browser console  |
| "CORS error"                | Verify `FRONTEND_URL` in backend `.env` |

**Database seeding** (see [SEEDER_INSTRUCTIONS.md](backend/SEEDER_INSTRUCTIONS.md)):

```bash
cd backend
npm run seed              # Seed all data
npm run seed:products     # Just products (configurable: 1k-100k)
```

**Fix port conflicts**: If "EADDRINUSE :::5001", run:

```powershell
netstat -ano | findstr :5001    # Find PID
Stop-Process -Id <PID> -Force   # Kill process
```

## Configuration

\*\*EREDIS_HOST`, `REDIS_PORT` - for queue system and caching

- `QUEUE_CONCURRENCY` - number of queue workers (default 5)
- `nvironment vars**: [config/index.js](backend/src/config/index.js) loads from `.env`. Key vars:

- `PORT` (default 5001), `MONGODB_URI`, `JWT_SECRET`, `JWT_EXPIRE`
- `FRONTEND_URL` (CORS) - must match Vite dev server (5173) or production URL

**MongoDB deprecated options**: Don't use `useNewUrlParser` or `useUnifiedTopology` (removed in driver v4+).

## Code Style & Comments

**Minimal comments**: Per [.github/instructions/remove unwanted comments.instructions.md](.github/instructions/remove%20unwanted%20comments.instructions.md):

- Add only short, essential comments explaining "why", not "what"
- No verbose JSDoc blocks in new code
- Generate separate `.md` files in `RestDoc/DD-MM-YYYY/` for major changes/documentation

**ES modules only**: This project uses `"type": "module"` - always use `import`/`export`, never `require()`.

## Testing & Documentation

**API documentation**: See [RestDoc/API_DOCUMENTATION.md](RestDoc/API_DOCUMENTATION.md) for endpoint reference.

**Quick reference**: [QUICK_REFERENCE.md](QUICK_REFERENCE.md) and [backend/QUICK_REFERENCE.md](backend/QUICK_REFERENCE.md) for common patterns.

**Production checklist**: [PRODUCTION_GUIDE.md](PRODUCTION_GUIDE.md) covers optimization strategies for 10M+ products (indexes, caching, query patterns).

## Testing & Debugging Best Practices

**Always test from both frontend AND backend**:

- When implementing features with request payloads, test with Postman/API client first
- Verify the backend receives correct data before debugging frontend
- Add console.log() in both frontend and backend to trace data flow

**Input sanitization rules**:

- **Always trim whitespace** from text inputs (email, password, names)
- Use `.trim()` on onChange handlers: `onChange={(e) => setState(e.target.value.trim())}`
- Validate data types on both frontend and backend (never trust client data)

**Boolean handling for checkboxes**:

- Use `checked={state}` and `onChange={(e) => setState(e.target.checked)}`
- Backend should handle multiple boolean formats: `true`, `"true"`, `1`, `false`, `"false"`, `0`
- Log incoming values with type: `logger.info({ value, type: typeof value })`

**Request/response logging pattern**:

```javascript
// Frontend
console.log("Request:", { email, rememberMe, type: typeof rememberMe });

// Backend
logger.info("Request received:", {
  field: value,
  fieldType: typeof value,
  body: req.body,
});
```

**Cross-origin cookie debugging**:

- Cookies are stored on backend domain (localhost:5001), not frontend (localhost:5173)
- Check cookies in DevTools > Application > Cookies > `http://localhost:5001`
- Ensure `credentials: 'include'` in fetch options for cross-origin requests
- Use `sameSite: 'lax'` in development, `'strict'` in production

## Common Gotchas

1. **Never mutate denormalized data** without cascading updates (e.g., changing category name requires updating all products with that category).
2. **Always validate ObjectId strings** before querying: `mongoose.Types.ObjectId.isValid(id)`
3. **Image paths**: Backend stores relative paths (`uploads/products/*`), frontend resolves to `http://localhost:5001/uploads/products/*`
4. **Error handling**: Use `AppError` class from [errorHandler.js](backend/src/middleware/errorHandler.js), not generic `Error`
5. **Async routes**: Always wrap in `catchAsync()` or errors won't reach error handler

## When Adding New Features

1. **Model first**: Define schema in `backend/src/models/` with proper indexes
2. **Service layer**: Create service extending `BaseService` in `backend/src/services/`
3. **Controller**: Create controller extending `BaseController` in `backend/src/controllers/`
4. **Routes**: Wire up in `backend/src/routes/` with auth middleware if needed
5. **Import in server.js**: Add route import and `app.use()` in [server.js](backend/src/server.js)
6. **Frontend service**: Add API methods to appropriate service in `frontend/src/services/`
7. **No documentation files**: Don't create summary .md files unless explicitly requested

---

**Key architectural files to reference**: [BaseController.js](backend/src/core/BaseController.js), [BaseService.js](backend/src/core/BaseService.js), [auth.js](backend/src/middleware/auth.js), [database.js](backend/src/config/database.js), [Product.js](backend/src/models/Product.js)
