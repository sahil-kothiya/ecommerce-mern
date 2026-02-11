# 🎯 Implementation Guide - Refactored E-Commerce Platform

## Quick Start Guide for Developers

**Version:** 2.0.0  
**Last Updated:** January 30, 2026

---

## 📚 Table of Contents

1. [New File Structure](#new-file-structure)
2. [How to Use New Features](#how-to-use-new-features)
3. [Code Examples](#code-examples)
4. [Migration Checklist](#migration-checklist)
5. [FAQ](#faq)

---

## New File Structure

### Backend Changes

```
backend/src/
├── core/                          # ✨ NEW - Base classes
│   ├── BaseController.js         # Base controller with common methods
│   └── BaseService.js            # Base service for business logic
│
├── services/                      # ✨ NEW - Business logic layer
│   └── AuthService.js            # Authentication business logic
│
├── constants/                     # ✨ NEW - Application constants
│   └── index.js                  # All constants in one place
│
├── utils/                         # Enhanced utilities
│   ├── logger.js                 # Existing logger
│   ├── responseFormatter.js      # ✨ NEW - Response helpers
│   └── validators.js             # ✨ NEW - Validation utilities
│
├── controllers/                   # Refactored controllers
│   ├── AuthController.js         # ✅ REFACTORED
│   └── ...other controllers
│
├── config/
│   └── database.js               # ✅ ENHANCED with better error handling
│
└── ...existing structure
```

### Frontend Changes

```
frontend/src/
├── services/
│   ├── authService.js            # ✅ REFACTORED
│   └── apiClient.js              # ✨ NEW - Centralized API client
│
├── components/
│   └── common/
│       └── ErrorBoundary.jsx     # ✨ NEW - Error boundary component
│
├── hooks/
│   └── index.js                  # ✨ NEW - Custom React hooks collection
│
├── main.jsx                       # ✅ UPDATED with ErrorBoundary
│
└── ...existing structure
```

---

## How to Use New Features

### 1. Creating a New Controller (Backend)

**Step 1:** Create a service class

```javascript
// src/services/ProductService.js
import { BaseService } from "../core/BaseService.js";
import { Product } from "../models/Product.js";

export class ProductService extends BaseService {
  constructor() {
    super(Product);
  }

  // Add custom business logic methods
  async findFeaturedProducts(limit = 10) {
    return await this.findAll({
      filter: { isFeatured: true, status: "active" },
      limit,
      sort: { createdAt: -1 },
    });
  }
}
```

**Step 2:** Create a controller using BaseController

```javascript
// src/controllers/ProductController.js
import { BaseController } from "../core/BaseController.js";
import { ProductService } from "../services/ProductService.js";

export class ProductController extends BaseController {
  constructor() {
    super(new ProductService());
  }

  // List all products
  index = this.catchAsync(async (req, res) => {
    const { page, limit, skip } = this.parsePaginationParams(req.query);

    const result = await this.service.findAll({
      page,
      limit,
      sort: this.parseSortParams(req.query.sort),
    });

    this.sendPaginatedResponse(res, result.items, result.pagination);
  });

  // Get featured products
  featured = this.catchAsync(async (req, res) => {
    const products = await this.service.findFeaturedProducts();
    this.sendSuccess(res, products);
  });
}
```

**Step 3:** Use in routes

```javascript
// src/routes/product.routes.js
import express from "express";
import { ProductController } from "../controllers/ProductController.js";

const router = express.Router();
const productController = new ProductController();

router.get("/products", productController.index);
router.get("/products/featured", productController.featured);

export default router;
```

### 2. Using API Client (Frontend)

**Basic Usage:**

```javascript
import apiClient from "../services/apiClient";

// GET request
const products = await apiClient.get("/api/products");

// POST request
const newProduct = await apiClient.post("/api/products", {
  title: "New Product",
  price: 99.99,
});

// PUT request
const updated = await apiClient.put("/api/products/123", {
  title: "Updated Product",
});

// DELETE request
await apiClient.delete("/api/products/123");
```

**With Error Handling:**

```javascript
try {
  const data = await apiClient.get("/api/products");
  console.log("Success:", data);
} catch (error) {
  console.error("Error type:", error.type);
  console.error("Error message:", error.message);

  if (error.status === 404) {
    // Handle not found
  } else if (error.type === "TIMEOUT") {
    // Handle timeout
  }
}
```

**File Upload with Progress:**

```javascript
const formData = new FormData();
formData.append("file", fileInput.files[0]);

await apiClient.upload("/api/upload", formData, (progress) => {
  console.log(`Upload progress: ${progress}%`);
});
```

### 3. Using Custom Hooks (Frontend)

**useAsync Hook:**

```javascript
import { useAsync } from "../hooks";
import apiClient from "../services/apiClient";

function ProductList() {
  const { data, loading, error, execute } = useAsync(
    () => apiClient.get("/api/products"),
    true, // Execute immediately
  );

  if (loading) return <Spinner />;
  if (error) return <Error message={error.message} />;

  return (
    <div>
      {data?.map((product) => (
        <ProductCard key={product._id} {...product} />
      ))}
      <button onClick={execute}>Refresh</button>
    </div>
  );
}
```

**useDebounce Hook:**

```javascript
import { useDebounce } from "../hooks";

function SearchBar() {
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 500);

  useEffect(() => {
    if (debouncedSearch) {
      // API call only after user stops typing for 500ms
      searchProducts(debouncedSearch);
    }
  }, [debouncedSearch]);

  return (
    <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
  );
}
```

**useForm Hook:**

```javascript
import { useForm } from "../hooks";

function LoginForm() {
  const { values, handleChange, reset } = useForm({
    email: "",
    password: "",
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    await authService.login(values.email, values.password);
    reset();
  };

  return (
    <form onSubmit={handleSubmit}>
      <input name="email" value={values.email} onChange={handleChange} />
      <input
        name="password"
        value={values.password}
        onChange={handleChange}
        type="password"
      />
      <button type="submit">Login</button>
    </form>
  );
}
```

**usePagination Hook:**

```javascript
import { usePagination } from "../hooks";

function ProductGrid({ products }) {
  const {
    currentItems,
    currentPage,
    totalPages,
    nextPage,
    previousPage,
    hasNextPage,
    hasPreviousPage,
  } = usePagination(products, 12);

  return (
    <div>
      <div className="grid">
        {currentItems.map((product) => (
          <ProductCard key={product._id} {...product} />
        ))}
      </div>
      <div className="pagination">
        <button onClick={previousPage} disabled={!hasPreviousPage}>
          Previous
        </button>
        <span>
          Page {currentPage} of {totalPages}
        </span>
        <button onClick={nextPage} disabled={!hasNextPage}>
          Next
        </button>
      </div>
    </div>
  );
}
```

### 4. Using Validation Utilities (Backend)

```javascript
import {
  isValidEmail,
  isValidObjectId,
  validatePasswordStrength,
} from "../utils/validators.js";

// Validate email
if (!isValidEmail(email)) {
  throw new AppError("Invalid email format", 400);
}

// Validate MongoDB ObjectId
if (!isValidObjectId(productId)) {
  throw new AppError("Invalid product ID", 400);
}

// Validate password
const passwordCheck = validatePasswordStrength(password, {
  minLength: 8,
  requireNumber: true,
  requireLetter: true,
  requireSpecialChar: true,
});

if (!passwordCheck.isValid) {
  throw new AppError(passwordCheck.message, 400);
}
```

### 5. Using Response Formatters (Backend)

```javascript
import {
  successResponse,
  paginatedResponse,
  errorResponse,
} from "../utils/responseFormatter.js";

// Success response
return res.json(successResponse(data, "Operation successful"));

// Paginated response
return res.json(paginatedResponse(items, { page, limit, total }));

// Error response
return res.status(400).json(errorResponse("Validation failed", 400, errors));
```

### 6. Using Constants (Backend)

```javascript
import { HTTP_STATUS, ERROR_MESSAGES, USER_ROLES } from '../constants/index.js';

// Instead of hardcoding
return res.status(200).json({ ... });

// Use constants
return res.status(HTTP_STATUS.OK).json({ ... });

// Instead of hardcoding error messages
throw new AppError('Invalid email or password', 401);

// Use constants
throw new AppError(ERROR_MESSAGES.INVALID_CREDENTIALS, HTTP_STATUS.UNAUTHORIZED);

// Role checking
if (user.role !== 'admin') { ... }

// Use constants
if (user.role !== USER_ROLES.ADMIN) { ... }
```

---

## Code Examples

### Example 1: Complete CRUD Controller

```javascript
import { BaseController } from "../core/BaseController.js";
import { CategoryService } from "../services/CategoryService.js";

export class CategoryController extends BaseController {
  constructor() {
    super(new CategoryService());
  }

  // List categories
  index = this.catchAsync(async (req, res) => {
    const { page, limit } = this.parsePaginationParams(req.query);
    const sort = this.parseSortParams(req.query.sort);

    const result = await this.service.findAll({ page, limit, sort });
    this.sendPaginatedResponse(res, result.items, result.pagination);
  });

  // Get single category
  show = this.catchAsync(async (req, res) => {
    const category = await this.service.findByIdOrFail(req.params.id);
    this.sendSuccess(res, category);
  });

  // Create category
  create = this.catchAsync(async (req, res) => {
    this.validateRequiredFields(req.body, ["name", "slug"]);

    const category = await this.service.create(req.body);
    this.sendSuccess(res, category, 201, "Category created successfully");
  });

  // Update category
  update = this.catchAsync(async (req, res) => {
    const category = await this.service.updateOrFail(req.params.id, req.body);
    this.sendSuccess(res, category, 200, "Category updated successfully");
  });

  // Delete category
  delete = this.catchAsync(async (req, res) => {
    await this.service.deleteOrFail(req.params.id);
    this.sendSuccess(res, null, 200, "Category deleted successfully");
  });
}
```

### Example 2: Service with Custom Business Logic

```javascript
import { BaseService } from "../core/BaseService.js";
import { Order } from "../models/Order.js";
import { AppError } from "../middleware/errorHandler.js";

export class OrderService extends BaseService {
  constructor() {
    super(Order);
  }

  async createOrder(userId, orderData) {
    // Validate stock availability
    await this.validateStock(orderData.items);

    // Calculate totals
    const totals = this.calculateTotals(orderData.items);

    // Create order
    const order = await this.create({
      userId,
      ...orderData,
      ...totals,
      status: "pending",
    });

    // Reduce stock
    await this.reduceStock(orderData.items);

    return order;
  }

  async validateStock(items) {
    for (const item of items) {
      const product = await Product.findById(item.productId);

      if (!product) {
        throw new AppError(`Product not found: ${item.productId}`, 404);
      }

      if (product.stock < item.quantity) {
        throw new AppError(`Insufficient stock for ${product.title}`, 400);
      }
    }
  }

  calculateTotals(items) {
    const subtotal = items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );
    const tax = subtotal * 0.1; // 10% tax
    const shipping = subtotal > 100 ? 0 : 10; // Free shipping over $100
    const total = subtotal + tax + shipping;

    return { subtotal, tax, shipping, total };
  }

  async reduceStock(items) {
    for (const item of items) {
      await Product.findByIdAndUpdate(item.productId, {
        $inc: { stock: -item.quantity },
      });
    }
  }
}
```

---

## Migration Checklist

### For Existing Backend Code

- [ ] Move business logic from controllers to services
- [ ] Extend BaseController for new controllers
- [ ] Use BaseService for new services
- [ ] Replace hardcoded values with constants
- [ ] Update response formatting to use utility functions
- [ ] Add JSDoc comments to all public methods
- [ ] Use validation utilities instead of custom validators
- [ ] Test all refactored endpoints

### For Existing Frontend Code

- [ ] Replace fetch calls with apiClient
- [ ] Add ErrorBoundary to component tree (✅ Already done in main.jsx)
- [ ] Use custom hooks where applicable
- [ ] Update authService usage
- [ ] Add proper error handling
- [ ] Implement loading states
- [ ] Test all API integrations

---

## FAQ

### Q: Do I need to refactor all existing code immediately?

**A:** No! The new patterns are backward compatible. Refactor incrementally:

1. New features use the new patterns
2. Existing code gets refactored during bug fixes or feature additions
3. Critical paths get priority for refactoring

### Q: How do I test the refactored code?

**A:**

1. Backend: Use existing API tests, update assertions for new response format
2. Frontend: Test with React Testing Library, mock apiClient
3. Integration: Test full flows end-to-end

### Q: What about performance?

**A:** The new architecture improves performance:

- Service layer enables better caching
- BaseService uses lean queries by default
- apiClient includes request deduplication
- Custom hooks prevent unnecessary re-renders

### Q: Can I customize BaseController and BaseService?

**A:** Yes! Extend them with your own base classes:

```javascript
// src/core/MyBaseController.js
import { BaseController } from "./BaseController.js";

export class MyBaseController extends BaseController {
  // Add custom methods here
  myCustomMethod() {
    // Your logic
  }
}
```

### Q: How do I add custom interceptors to apiClient?

**A:**

```javascript
import apiClient from "./services/apiClient";

// Add request interceptor
apiClient.addRequestInterceptor(async (config) => {
  config.headers["X-Custom-Header"] = "value";
  return config;
});

// Add response interceptor
apiClient.addResponseInterceptor(async (response) => {
  // Transform response
  return response;
});

// Add error interceptor
apiClient.addErrorInterceptor(async (error) => {
  // Handle specific errors
  if (error.response?.status === 403) {
    // Custom handling
  }
  return Promise.reject(error);
});
```

---

## Support

For questions or issues:

1. Check this guide and REFACTORING_SUMMARY.md
2. Review code examples in the refactored files
3. Consult JSDoc comments in the codebase

---

**Happy Coding! 🚀**
