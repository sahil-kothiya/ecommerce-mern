# 🚀 Production Guide - Enterprise E-Commerce Platform

**Optimized for 10 Million+ Products**  
**Version:** 2.0.0  
**Last Updated:** January 30, 2026

---

## 📋 Table of Contents

1. [Performance Optimizations](#performance-optimizations)
2. [Database Configuration](#database-configuration)
3. [Caching Strategy](#caching-strategy)
4. [API Best Practices](#api-best-practices)
5. [Deployment Checklist](#deployment-checklist)
6. [Monitoring & Scaling](#monitoring--scaling)

---

## Performance Optimizations

### Database Indexes

The Product model includes optimized compound indexes for 10M+ products:

```javascript
// Covered queries for common lookups
productSchema.index({ slug: 1 }, { unique: true });
productSchema.index({
  status: 1,
  "category.id": 1,
  basePrice: 1,
  createdAt: -1,
});

// Text search with weights
productSchema.index(
  { title: "text", tags: "text", "brand.title": "text" },
  { weights: { title: 10, tags: 5, "brand.title": 3 } },
);

// Partial indexes for hot paths
productSchema.index(
  { isFeatured: 1, "ratings.average": -1 },
  { partialFilterExpression: { status: "active", isFeatured: true } },
);
```

### Query Optimization

**Use Lean Queries** (10x faster):

```javascript
// ❌ Bad: Returns full Mongoose documents
const products = await Product.find({ status: "active" });

// ✅ Good: Returns plain JavaScript objects
const products = await Product.find({ status: "active" }).lean();
```

**Cursor-Based Pagination** (recommended for 10M+ products):

```javascript
// ❌ Bad: Offset pagination (slow for large offsets)
const skip = (page - 1) * limit;
const products = await Product.find().skip(skip).limit(limit);

// ✅ Good: Cursor-based pagination
const products = await Product.find({ _id: { $gt: cursor } }).limit(20);
```

**Project Only Needed Fields**:

```javascript
// ❌ Bad: Fetches all fields
const products = await Product.find().lean();

// ✅ Good: Fetches only needed fields
const products = await Product.find(
  {},
  {
    title: 1,
    basePrice: 1,
    images: { $slice: 1 },
  },
).lean();
```

---

## Database Configuration

### Connection Pool Settings (for 10M+ products)

```javascript
const connectionOptions = {
  maxPoolSize: 100, // High concurrency support
  minPoolSize: 10, // Keep connections warm
  maxIdleTimeMS: 300000, // 5 minutes

  // Compression
  compressors: ["zlib"],
  zlibCompressionLevel: 6,

  // Read replicas
  readPreference: "secondaryPreferred",

  // Write concern
  w: "majority",
  wtimeoutMS: 5000,
};
```

### MongoDB Replica Set (Required for Production)

```bash
# Minimum 3-node replica set
- Primary: Handles writes
- Secondary 1: Read replica
- Secondary 2: Read replica + Backups
```

### Index Management

```bash
# Check index usage
db.products.aggregate([{ $indexStats: {} }])

# Build indexes in background
db.products.createIndex({ field: 1 }, { background: true })

# Drop unused indexes
db.products.dropIndex("index_name")
```

---

## Caching Strategy

### In-Memory Caching (Default)

The application uses in-memory caching suitable for single-server deployments:

```javascript
// Built-in caching in ProductService
const CACHE_TTL = 300; // 5 minutes
const memCache = new Map();

// Automatic caching for:
// - Featured products (10 min)
// - Product details (3 min)
// - Related products (15 min)
```

### Distributed Caching (Optional - For Multi-Server)

For multi-server deployments, you can optionally implement Redis:

**Install Redis:**

```bash
npm install ioredis
```

**Setup Redis Client:**

```javascript
import Redis from "ioredis";

const redis = new Redis({
  host: process.env.REDIS_HOST || "localhost",
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD,
  db: 0,
  maxRetriesPerRequest: 3,
});
```

### Caching Layers

**Level 1: Featured Products**

```javascript
// Cached automatically by ProductService
const products = await productService.getFeaturedProducts(10);
// TTL: 10 minutes
```

**Level 2: Category Products**

```javascript
// Use cursor pagination with built-in caching
const result = await productService.getProducts({ categoryId, limit: 20 });
```

**Level 3: Product Details**

```javascript
// Cached automatically by ProductService
const product = await productService.getProductBySlugOrId(slug);
// TTL: 3 minutes
```

### Cache Invalidation Strategy

```javascript
// Built-in cache clearing on updates
productService._clearCache(); // Clears all product cache
productService._clearCache(productId); // Clears specific product

// On category update
await redis.del("categories:tree");
await redis.del(`products:category:${categoryId}:*`);
```

---

## API Best Practices

### Response Compression

```javascript
import compression from "compression";

app.use(
  compression({
    filter: (req, res) => {
      if (req.headers["x-no-compression"]) return false;
      return compression.filter(req, res);
    },
    level: 6,
  }),
);
```

### Rate Limiting

```javascript
import rateLimit from "express-rate-limit";

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  standardHeaders: true,
  legacyHeaders: false,
});

app.use("/api/", limiter);
```

### Request Validation

```javascript
// Use Joi or Zod for request validation
import Joi from "joi";

const productSchema = Joi.object({
  title: Joi.string().min(3).max(200).required(),
  basePrice: Joi.number().positive().required(),
  // ...
});
```

---

## Deployment Checklist

### Environment Variables

```env
# Database
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/db
MONGODB_REPLICA_SET=rs0

# Redis (Optional - for multi-server deployments)
# REDIS_URL=redis://localhost:6379
# REDIS_PASSWORD=your-password

# Server
NODE_ENV=production
PORT=5000

# Security
JWT_SECRET=your-super-secret-key-min-32-chars
JWT_EXPIRE=7d

# Upload limits
MAX_FILE_SIZE=5242880
```

### Pre-Deployment Steps

- [ ] Set `NODE_ENV=production`
- [ ] Disable `autoIndex` in database config
- [ ] Build frontend: `cd frontend && npm run build`
- [ ] Run database migrations/seeders
- [ ] Create MongoDB indexes in background
- [ ] Setup MongoDB replica set
- [ ] Setup Redis cluster (optional, for multi-server)
- [ ] Configure CDN for static assets
- [ ] Setup SSL/TLS certificates
- [ ] Configure reverse proxy (Nginx)
- [ ] Setup monitoring (PM2, New Relic, etc.)
- [ ] Configure logging (Winston → CloudWatch/Elasticsearch)
- [ ] Setup backup strategy
- [ ] Configure alerts

### Production Start Command

```bash
# Using PM2 (recommended)
pm2 start src/server.js -i max --name "ecommerce-api"

# With cluster mode
pm2 start ecosystem.config.js
```

**ecosystem.config.js:**

```javascript
module.exports = {
  apps: [
    {
      name: "ecommerce-api",
      script: "./src/server.js",
      instances: "max",
      exec_mode: "cluster",
      env: {
        NODE_ENV: "production",
      },
      error_file: "./logs/pm2-error.log",
      out_file: "./logs/pm2-out.log",
      merge_logs: true,
    },
  ],
};
```

---

## Monitoring & Scaling

### Performance Metrics to Monitor

1. **Database Performance:**
   - Query execution time (target: < 100ms)
   - Index hit ratio (target: > 95%)
   - Connection pool usage
   - Slow query log (> 100ms)

2. **API Performance:**
   - Response time (p50, p95, p99)
   - Requests per second
   - Error rate (target: < 0.1%)
   - Cache hit ratio (target: > 80%)

3. **System Resources:**
   - CPU usage (target: < 70%)
   - Memory usage
   - Disk I/O
   - Network throughput

### Scaling Strategy

**Horizontal Scaling:**

```
Load Balancer (Nginx)
    ↓
App Server 1, 2, 3... (PM2 Cluster)
    ↓
MongoDB Replica Set (Sharded if needed)
    ↓
Redis Cluster
```

**Database Sharding (for 50M+ products):**

```javascript
// Shard key: category or geographical region
sh.shardCollection("ecommerce.products", { "category.id": 1, _id: 1 });
```

### Monitoring Tools

- **APM:** New Relic, DataDog, or AppDynamics
- **Logging:** ELK Stack (Elasticsearch, Logstash, Kibana)
- **Uptime:** UptimeRobot, Pingdom
- **Error Tracking:** Sentry
- **Database:** MongoDB Atlas Monitoring or Ops Manager

---

## Performance Benchmarks

Target metrics for 10M+ products:

| Metric               | Target     | Acceptable |
| -------------------- | ---------- | ---------- |
| Product List API     | < 100ms    | < 200ms    |
| Product Detail API   | < 50ms     | < 100ms    |
| Search API           | < 200ms    | < 500ms    |
| Cart Operations      | < 50ms     | < 100ms    |
| Checkout             | < 300ms    | < 500ms    |
| Cache Hit Rate       | > 80%      | > 60%      |
| Database Connections | < 80% pool | < 90% pool |

---

## Quick Commands

```bash
# Check MongoDB indexes
node scripts/check-indexes.js

# Rebuild indexes
node scripts/rebuild-indexes.js

# Clear Redis cache
redis-cli FLUSHDB

# Check API health
curl http://localhost:5000/health

# View PM2 logs
pm2 logs

# Restart app
pm2 restart all

# Monitor performance
pm2 monit
```

---

## Support & Resources

- **Documentation:** `/docs`
- **API Reference:** `/docs/api`
- **Architecture Diagram:** `/docs/architecture.md`
- **Troubleshooting:** `/docs/troubleshooting.md`

---

**For additional help, contact the development team.**
