# 🚀 Quick Reference Card - Refactored Codebase

## Backend Quick Reference

### Creating a Controller

```javascript
import { BaseController } from "../core/BaseController.js";
import { MyService } from "../services/MyService.js";

export class MyController extends BaseController {
  constructor() {
    super(new MyService());
  }

  // List with pagination
  index = this.catchAsync(async (req, res) => {
    const { page, limit } = this.parsePaginationParams(req.query);
    const result = await this.service.findAll({ page, limit });
    this.sendPaginatedResponse(res, result.items, result.pagination);
  });

  // Get single item
  show = this.catchAsync(async (req, res) => {
    const item = await this.service.findByIdOrFail(req.params.id);
    this.sendSuccess(res, item);
  });

  // Create item
  create = this.catchAsync(async (req, res) => {
    this.validateRequiredFields(req.body, ["name", "email"]);
    const item = await this.service.create(req.body);
    this.sendSuccess(res, item, 201);
  });
}
```

### Creating a Service

```javascript
import { BaseService } from "../core/BaseService.js";
import { MyModel } from "../models/MyModel.js";

export class MyService extends BaseService {
  constructor() {
    super(MyModel);
  }

  // Custom business logic
  async myCustomMethod(data) {
    // Your logic here
    return result;
  }
}
```

### BaseController Methods

- `catchAsync(fn)` - Wrap async functions
- `sendSuccess(res, data, status, message)` - Send success response
- `sendPaginatedResponse(res, items, pagination)` - Send paginated data
- `validateRequiredFields(body, fields)` - Validate required fields
- `parsePaginationParams(query)` - Parse pagination
- `parseSortParams(sortQuery)` - Parse sorting
- `getUserId(req)` - Get current user ID
- `isAdmin(req)` - Check if user is admin

### BaseService Methods

- `findAll(options)` - Find with pagination
- `findById(id, options)` - Find by ID
- `findByIdOrFail(id, options)` - Find or throw 404
- `findOne(filter, options)` - Find one document
- `create(data)` - Create document
- `update(id, data, options)` - Update document
- `updateOrFail(id, data)` - Update or throw 404
- `delete(id)` - Delete document
- `deleteOrFail(id)` - Delete or throw 404
- `exists(id)` - Check if exists
- `count(filter)` - Count documents
- `softDelete(id)` - Set status to inactive
- `bulkCreate(dataArray)` - Create multiple

### Validation Utilities

```javascript
import {
  isValidEmail,
  isValidObjectId,
  validatePasswordStrength,
} from "../utils/validators.js";

if (!isValidEmail(email)) throw new AppError("Invalid email", 400);
if (!isValidObjectId(id)) throw new AppError("Invalid ID", 400);

const pwCheck = validatePasswordStrength(password);
if (!pwCheck.isValid) throw new AppError(pwCheck.message, 400);
```

### Response Formatters

```javascript
import {
  successResponse,
  errorResponse,
  paginatedResponse,
} from "../utils/responseFormatter.js";

res.json(successResponse(data, "Success message"));
res.json(paginatedResponse(items, { page, limit, total }));
res.status(400).json(errorResponse("Error message", 400));
```

### Constants

```javascript
import {
    HTTP_STATUS,
    ERROR_MESSAGES,
    USER_ROLES,
    PRODUCT_STATUS
} from '../constants/index.js';

res.status(HTTP_STATUS.OK).json({ ... });
throw new AppError(ERROR_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED);
```

---

## Frontend Quick Reference

### API Client

```javascript
import apiClient from "../services/apiClient";

// GET
const data = await apiClient.get("/api/endpoint");

// POST
const result = await apiClient.post("/api/endpoint", { data });

// PUT
const updated = await apiClient.put("/api/endpoint/123", { data });

// DELETE
await apiClient.delete("/api/endpoint/123");

// Upload with progress
await apiClient.upload("/api/upload", formData, (progress) => {
  console.log(`${progress}%`);
});
```

### Custom Hooks

#### useAsync

```javascript
import { useAsync } from "../hooks";

const { data, loading, error, execute } = useAsync(
  () => apiClient.get("/api/products"),
  true, // execute immediately
);
```

#### useDebounce

```javascript
import { useDebounce } from "../hooks";

const [value, setValue] = useState("");
const debouncedValue = useDebounce(value, 500);
```

#### useForm

```javascript
import { useForm } from "../hooks";

const { values, handleChange, reset } = useForm({
  email: "",
  password: "",
});
```

#### usePagination

```javascript
import { usePagination } from "../hooks";

const {
  currentItems,
  currentPage,
  totalPages,
  nextPage,
  previousPage,
  hasNextPage,
  hasPreviousPage,
} = usePagination(items, 10);
```

#### useLocalStorage

```javascript
import { useLocalStorage } from "../hooks";

const [value, setValue, removeValue] = useLocalStorage("key", initialValue);
```

#### useToggle

```javascript
import { useToggle } from "../hooks";

const [isOpen, toggle, open, close] = useToggle(false);
```

### Auth Service

```javascript
import authService from '../services/authService';

// Login
await authService.login(email, password);

// Register
await authService.register({ name, email, password });

// Logout
await authService.logout();

// Get current user
const user = await authService.getCurrentUser();

// Update profile
await authService.updateProfile(data);

// Change password
await authService.changePassword(currentPassword, newPassword);

// Check authentication
if (authService.isAuthenticated()) { ... }
if (authService.isAdmin()) { ... }
```

### Error Boundary

```javascript
import ErrorBoundary from '../components/common/ErrorBoundary';

<ErrorBoundary>
    <YourComponent />
</ErrorBoundary>

// Custom fallback
<ErrorBoundary fallback={(error, reset) => (
    <CustomError error={error} onReset={reset} />
)}>
    <YourComponent />
</ErrorBoundary>
```

---

## Common Patterns

### Backend: List Endpoint with Filters

```javascript
index = this.catchAsync(async (req, res) => {
  const { page, limit } = this.parsePaginationParams(req.query);
  const sort = this.parseSortParams(req.query.sort);

  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.category) filter.categoryId = req.query.category;

  const result = await this.service.findAll({ filter, sort, page, limit });
  this.sendPaginatedResponse(res, result.items, result.pagination);
});
```

### Frontend: Data Fetching with Loading

```javascript
function ProductList() {
  const { data, loading, error } = useAsync(() =>
    apiClient.get("/api/products"),
  );

  if (loading) return <Spinner />;
  if (error) return <Error message={error.message} />;

  return (
    <div>
      {data?.map((item) => (
        <Item key={item._id} {...item} />
      ))}
    </div>
  );
}
```

### Frontend: Form with Validation

```javascript
function MyForm() {
  const { values, handleChange, reset } = useForm({
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await authService.login(values.email, values.password);
      // Success handling
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input name="email" value={values.email} onChange={handleChange} />
      <input
        name="password"
        type="password"
        value={values.password}
        onChange={handleChange}
      />
      {error && <div>{error}</div>}
      <button type="submit" disabled={loading}>
        {loading ? "Loading..." : "Submit"}
      </button>
    </form>
  );
}
```

---

## File Locations

### Backend

- **Base Classes:** `src/core/`
- **Services:** `src/services/`
- **Controllers:** `src/controllers/`
- **Utils:** `src/utils/`
- **Constants:** `src/constants/`

### Frontend

- **API Client:** `src/services/apiClient.js`
- **Auth Service:** `src/services/authService.js`
- **Hooks:** `src/hooks/index.js`
- **Error Boundary:** `src/components/common/ErrorBoundary.jsx`

### Documentation

- **Summary:** `REFACTORING_SUMMARY.md`
- **Guide:** `IMPLEMENTATION_GUIDE.md`
- **Highlights:** `REFACTORING_HIGHLIGHTS.md`
- **Quick Ref:** `QUICK_REFERENCE.md` (this file)

---

## Tips

1. **Always use catchAsync** for controller methods
2. **Validate inputs** before processing
3. **Use constants** instead of magic strings
4. **Leverage BaseService** methods instead of writing custom queries
5. **Add JSDoc comments** for public methods
6. **Handle errors properly** with try-catch or .catch()
7. **Use apiClient** for all API calls (frontend)
8. **Implement ErrorBoundary** for all major component trees
9. **Debounce search inputs** to reduce API calls
10. **Use custom hooks** to reduce code duplication

---

**Keep this card handy for quick reference! 📌**
