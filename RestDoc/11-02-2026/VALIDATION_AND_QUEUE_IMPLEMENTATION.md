# Validation Middleware and Queue System Setup

## What Was Added

### ✅ Input Validation Middleware

Created comprehensive validation for all major routes using `express-validator`.

**Files Created:**

- `backend/src/validators/authValidators.js` - User authentication
- `backend/src/validators/productValidators.js` - Product CRUD
- `backend/src/validators/orderValidators.js` - Order management
- `backend/src/validators/index.js` - Exports and validation runner

**Usage Example:**

```javascript
import { createProductValidator, validate } from "../validators/index.js";

router.post(
  "/products",
  protect,
  authorize("admin"),
  createProductValidator,
  validate,
  productController.create,
);
```

### ✅ Queue System (Bull)

Implemented background job processing for resource-intensive tasks.

**Files Created:**

- `backend/src/queues/index.js` - Queue initialization
- `backend/src/queues/ratingsQueue.js` - Product rating calculations
- `backend/src/queues/emailQueue.js` - Email sending
- `backend/src/queues/worker.js` - Queue worker process

**Start Queue Worker:**

```bash
cd backend
npm run queue:start
```

**Usage Example:**

```javascript
import { queueRatingUpdate } from "../queues/ratingsQueue.js";

// Queue a rating update instead of calculating synchronously
await queueRatingUpdate(productId);
```

## Installation Steps

### 1. Install Dependencies

```bash
cd backend
npm install bull
```

### 2. Install Redis

**Windows (using Chocolatey):**

```powershell
choco install redis-64
redis-server
```

**macOS:**

```bash
brew install redis
brew services start redis
```

**Linux:**

```bash
sudo apt-get install redis-server
sudo systemctl start redis
```

### 3. Update .env

```env
# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
QUEUE_CONCURRENCY=5

# Cache Settings
CACHE_TTL_DEFAULT=300
CACHE_TTL_CATEGORIES=600
CACHE_TTL_PRODUCTS=180
```

### 4. Run Queue Worker

```bash
# In a separate terminal
cd backend
npm run queue:start
```

## Integration with Existing Code

### Update ReviewService

```javascript
import { queueRatingUpdate } from "../queues/ratingsQueue.js";

export class ReviewService extends BaseService {
  async createReview(userId, reviewData) {
    const review = await this.create({ userId, ...reviewData });

    // Queue rating update instead of calculating synchronously
    await queueRatingUpdate(review.productId);

    return review;
  }
}
```

### Add Validators to Routes

**Before:**

```javascript
router.post("/products", protect, authorize("admin"), productController.create);
```

**After:**

```javascript
import { createProductValidator, validate } from "../validators/index.js";

router.post(
  "/products",
  protect,
  authorize("admin"),
  createProductValidator,
  validate,
  productController.create,
);
```

## Benefits

### Validation Middleware

- ✅ Centralized validation logic
- ✅ Consistent error messages
- ✅ Type checking and sanitization
- ✅ Reduced controller code
- ✅ Better security (prevents injection attacks)

### Queue System

- ✅ Non-blocking background jobs
- ✅ Retry failed jobs automatically
- ✅ Job prioritization
- ✅ Better scalability for 10M+ products
- ✅ Email sending doesn't block requests

## Monitoring

**Check queue status:**

```javascript
import { ratingsQueue } from "./queues/index.js";

const waiting = await ratingsQueue.getWaitingCount();
const active = await ratingsQueue.getActiveCount();
const completed = await ratingsQueue.getCompletedCount();
const failed = await ratingsQueue.getFailedCount();

console.log({ waiting, active, completed, failed });
```

**View failed jobs:**

```javascript
const failedJobs = await ratingsQueue.getFailed();
failedJobs.forEach((job) => {
  console.log(job.id, job.failedReason);
});
```

---

**Date:** 11-02-2026  
**Status:** ✅ IMPLEMENTED  
**Next Steps:** Monitor queue performance and add more validators as needed
