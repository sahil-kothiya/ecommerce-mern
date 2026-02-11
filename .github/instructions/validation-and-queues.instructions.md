---
description: Validation and Queue System Guidelines
applyTo: "**/*.{js,jsx}"
---

## Input Validation Rules

**ALWAYS use validators** on routes accepting user input.

### Available Validators

- `authValidators` - registration, login, password operations
- `productValidators` - product CRUD, queries, filtering
- `orderValidators` - order creation, status updates

### Usage Pattern

```javascript
import { createProductValidator, validate } from "../validators/index.js";

router.post(
  "/endpoint",
  protect, // Auth middleware
  createProductValidator, // Validation rules
  validate, // Check results
  controller.method, // Handler
);
```

### Creating Custom Validators

```javascript
import { body, param } from "express-validator";

export const myValidator = [
  body("field").trim().notEmpty().withMessage("Field required"),

  body("email").isEmail().normalizeEmail().withMessage("Invalid email"),
];
```

---

## Queue System Guidelines

**Use queues for** time-consuming or resource-intensive tasks.

### When to Use Queues

✅ **USE queues for:**

- Rating calculations (10M+ products)
- Email sending
- Image processing
- Report generation
- Data imports/exports

❌ **DON'T queue:**

- Simple CRUD operations
- User authentication
- Data retrieval

### Queue Usage

```javascript
import { queueRatingUpdate } from "../queues/ratingsQueue.js";
import { queueEmail } from "../queues/emailQueue.js";

// Queue rating update
await queueRatingUpdate(productId);

// Queue email
await queueEmail({
  to: "user@example.com",
  subject: "Order Confirmation",
  template: "order-confirmation",
  data: { orderId, items },
});
```

### Available Queues

1. **ratingsQueue** - Product ratings
2. **emailQueue** - Email notifications
3. **imageProcessingQueue** - Image optimization

### Running Queue Worker

```bash
npm run queue:start
```

**Production:** Use PM2 or similar process manager

```bash
pm2 start "npm run queue:start" --name queue-worker
```

---

## Validation Best Practices

1. **Validate at route level**, not in controllers
2. **Sanitize inputs** (trim, normalize email)
3. **Custom validators** for business logic
4. **Consistent error format** via `validate` middleware
5. **Check ObjectId validity** before database queries

---

## Queue Best Practices

1. **Small job payloads** - pass IDs, not full objects
2. **Retry logic** - configure attempts and backoff
3. **Job cleanup** - remove completed jobs after 100
4. **Monitor queues** - check waiting/failed counts
5. **Error logging** - log all job failures

---

## Environment Setup

```env
# Required for queues
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
QUEUE_CONCURRENCY=5
```

**Install Redis:**

- Windows: `choco install redis-64`
- macOS: `brew install redis`
- Linux: `sudo apt-get install redis-server`

---

**Apply to:** All JavaScript/JSX files in backend and frontend  
**Priority:** High - Use validators on all new routes  
**Updated:** 11-02-2026
