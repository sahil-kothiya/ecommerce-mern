# 📖 Developer Quick Reference

## Common Commands

### Root Level
```powershell
# Install all dependencies
npm run install:all

# Start both backend and frontend
npm run dev

# Build entire project
npm run build

# Run all tests
npm test

# Lint all code
npm run lint

# Clean all node_modules
npm run clean
```

### Backend Commands
```powershell
cd backend

# Development with hot reload
npm run dev

# Build TypeScript
npm run build

# Start production server
npm start

# Run tests
npm test

# Lint code
npm run lint

# Seed database
npm run seed
```

### Frontend Commands
```powershell
cd frontend

# Development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run tests
npm test

# Lint code
npm run lint
```

---

## API Endpoints Quick Reference

### Authentication
```
POST   /api/auth/register          - Register new user
POST   /api/auth/login             - Login user
POST   /api/auth/logout            - Logout user
GET    /api/auth/me                - Get current user (requires auth)
POST   /api/auth/refresh-token     - Refresh JWT token
POST   /api/auth/forgot-password   - Send password reset email
POST   /api/auth/reset-password    - Reset password with token
```

### Products
```
GET    /api/products               - List all products
GET    /api/products/:slug         - Get product by slug
POST   /api/products               - Create product (admin only)
PUT    /api/products/:id           - Update product (admin only)
DELETE /api/products/:id           - Delete product (admin only)
GET    /api/products/featured      - Get featured products
GET    /api/products/search        - Search products
```

### Categories
```
GET    /api/categories             - List all categories
GET    /api/categories/tree        - Get category tree
GET    /api/categories/:slug       - Get category by slug
POST   /api/categories             - Create category (admin only)
PUT    /api/categories/:id         - Update category (admin only)
DELETE /api/categories/:id         - Delete category (admin only)
```

### Brands
```
GET    /api/brands                 - List all brands
GET    /api/brands/:slug           - Get brand by slug
POST   /api/brands                 - Create brand (admin only)
PUT    /api/brands/:id             - Update brand (admin only)
DELETE /api/brands/:id             - Delete brand (admin only)
```

### Orders
```
GET    /api/orders                 - Get user's orders (requires auth)
GET    /api/orders/:id             - Get order details (requires auth)
POST   /api/orders                 - Create new order (requires auth)
GET    /api/orders/admin/all       - Get all orders (admin only)
PUT    /api/orders/:id/status      - Update order status (admin only)
```

### Cart
```
GET    /api/cart                   - Get cart items (requires auth)
POST   /api/cart                   - Add item to cart (requires auth)
PUT    /api/cart/:id               - Update cart item (requires auth)
DELETE /api/cart/:id               - Remove item from cart (requires auth)
DELETE /api/cart                   - Clear entire cart (requires auth)
```

### Wishlist
```
GET    /api/wishlist               - Get wishlist items (requires auth)
POST   /api/wishlist               - Add to wishlist (requires auth)
DELETE /api/wishlist/:id           - Remove from wishlist (requires auth)
```

### Coupons
```
POST   /api/coupons/validate       - Validate coupon code
GET    /api/coupons                - List coupons (admin only)
POST   /api/coupons                - Create coupon (admin only)
PUT    /api/coupons/:id            - Update coupon (admin only)
DELETE /api/coupons/:id            - Delete coupon (admin only)
```

### Reviews
```
GET    /api/reviews/product/:id    - Get product reviews
POST   /api/reviews                - Create review (requires auth)
PUT    /api/reviews/:id            - Update review (requires auth)
DELETE /api/reviews/:id            - Delete review (requires auth)
PUT    /api/reviews/:id/status     - Update review status (admin only)
```

---

## Environment Variables

### Backend (.env)
```env
# Server
NODE_ENV=development
PORT=5000

# Database
MONGODB_URI=mongodb://localhost:27017/enterprise-ecommerce

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=your-secret-key-min-32-characters
JWT_EXPIRE=7d

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-password

# Payment
STRIPE_SECRET_KEY=sk_test_xxxxx
PAYPAL_CLIENT_ID=xxxxx

# Frontend
FRONTEND_URL=http://localhost:5173
```

### Frontend (.env)
```env
VITE_API_BASE_URL=http://localhost:5000/api
VITE_APP_NAME=Enterprise Ecommerce
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx
```

---

## File Structure Quick Guide

### Backend Structure
```
backend/src/
├── config/           # Configuration files
│   ├── index.ts     # Main config
│   ├── database.ts  # MongoDB setup
│   └── redis.ts     # Redis setup
├── models/          # Mongoose schemas
│   ├── User.ts
│   ├── Product.ts
│   ├── Order.ts
│   └── ...
├── routes/          # API routes
│   ├── auth.routes.ts
│   ├── product.routes.ts
│   └── ...
├── middleware/      # Custom middleware
│   ├── auth.ts
│   ├── errorHandler.ts
│   └── rateLimiter.ts
├── controllers/     # Route controllers (to be added)
├── services/        # Business logic (to be added)
├── utils/           # Utility functions
│   └── logger.ts
└── server.ts        # Express app entry
```

### Frontend Structure
```
frontend/src/
├── components/      # Reusable components
│   └── layout/
│       ├── Header.tsx
│       └── Footer.tsx
├── pages/           # Page components
│   ├── HomePage.tsx
│   ├── ProductsPage.tsx
│   └── auth/
│       ├── LoginPage.tsx
│       └── RegisterPage.tsx
├── layouts/         # Layout components
│   └── MainLayout.tsx
├── store/           # Redux store
│   ├── index.ts
│   └── slices/
│       ├── authSlice.ts
│       ├── cartSlice.ts
│       └── productSlice.ts
├── services/        # API services (to be added)
├── hooks/           # Custom hooks (to be added)
├── utils/           # Utility functions (to be added)
├── types/           # TypeScript types (to be added)
├── App.tsx          # Main app component
└── main.tsx         # React entry point
```

---

## Database Indexes

### User Collection
- `email` (unique)
- `role`
- `status`

### Product Collection
- `slug` (unique)
- `status`
- `categoryId`
- `brandId`
- `isFeatured`
- `rating.average`
- Text index on `title`, `description`, `tags`

### Order Collection
- `orderNumber` (unique)
- `userId`
- `status`
- `paymentStatus`
- `createdAt`

### Category Collection
- `slug` (unique)
- `parentId`
- `status`

---

## Redux Store Structure

```typescript
{
  auth: {
    user: User | null,
    token: string | null,
    isAuthenticated: boolean,
    loading: boolean
  },
  cart: {
    items: CartItem[],
    totalItems: number,
    totalAmount: number,
    loading: boolean
  },
  product: {
    products: Product[],
    product: Product | null,
    loading: boolean,
    error: string | null,
    filters: {...},
    pagination: {...}
  }
}
```

---

## Useful Code Snippets

### Making API Calls (Frontend)
```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
```

### Protected Route (Frontend)
```typescript
import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useSelector((state) => state.auth);
  return isAuthenticated ? children : <Navigate to="/login" />;
};
```

### MongoDB Query with Pagination
```typescript
const products = await Product.find({ status: 'active' })
  .populate('categoryId')
  .populate('brandId')
  .skip((page - 1) * limit)
  .limit(limit)
  .sort('-createdAt');
```

### Redis Caching
```typescript
// Get from cache
const cached = await redisCache.get(`products:${page}`);
if (cached) return JSON.parse(cached);

// Set cache
await redisCache.set(
  `products:${page}`,
  JSON.stringify(products),
  3600 // TTL in seconds
);
```

---

## Testing

### Test a Backend Endpoint (PowerShell)
```powershell
# Health check
Invoke-RestMethod -Uri "http://localhost:5000/health"

# Register user
$body = @{
    name = "Test User"
    email = "test@example.com"
    password = "password123"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:5000/api/auth/register" `
  -Method Post `
  -Body $body `
  -ContentType "application/json"
```

---

## Docker Commands

```powershell
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# View logs
docker-compose logs -f

# Rebuild and start
docker-compose up -d --build

# Stop and remove volumes
docker-compose down -v
```

---

## Common Troubleshooting

### Port Already in Use
```powershell
# Find process
netstat -ano | findstr :5000

# Kill process
taskkill /PID <PID> /F
```

### MongoDB Connection Issues
- Ensure MongoDB is running
- Check connection string in .env
- Verify MongoDB is accessible

### Redis Connection Issues
```powershell
# Test Redis
redis-cli ping
# Should return: PONG
```

### Clear Node Modules
```powershell
npm run clean
npm run install:all
```

---

## Git Workflow

```powershell
# Create feature branch
git checkout -b feature/your-feature

# Stage changes
git add .

# Commit
git commit -m "feat: add your feature"

# Push
git push origin feature/your-feature
```

---

## Resources

- [Express.js Docs](https://expressjs.com/)
- [Mongoose Docs](https://mongoosejs.com/)
- [React Docs](https://react.dev/)
- [Redux Toolkit Docs](https://redux-toolkit.js.org/)
- [Tailwind CSS Docs](https://tailwindcss.com/)
- [TypeScript Docs](https://www.typescriptlang.org/)

---

**Last Updated**: November 27, 2025
