# MongoDB Schema Design for Enterprise E-commerce (10M+ Products)

## Executive Summary

This document maps the existing Laravel/PostgreSQL relational schema to a production-grade MongoDB data model optimized for 10M+ products. The design emphasizes:

- **Query Performance**: Embedding frequently accessed data to minimize joins
- **Scalability**: Sharding strategy for horizontal scaling
- **Write Performance**: Balanced denormalization to avoid update bottlenecks
- **Search Efficiency**: Atlas Search/Elasticsearch integration patterns
- **Data Integrity**: Schema validation and proper indexing

---

## 1. Schema Mapping Overview

### 1.1 Core Entity Relationships

```
Laravel Relational Schema:
├── products (main)
│   ├── product_variants (1:N)
│   │   ├── product_variant_option_assignments (N:M)
│   │   └── variant_images (1:N)
│   ├── product_images (1:N)
│   └── product_reviews (1:N)
├── categories (self-referential tree)
├── brands
├── orders (1:N with order_items)
├── carts (N:M products/variants)
└── users

MongoDB Collection Design:
├── products (embedded variants, images)
├── categories (materialized path tree)
├── brands (simple reference collection)
├── orders (embedded order items)
├── reviews (separate for aggregation)
├── carts (embedded cart items)
└── users (separate for auth)
```

---

## 2. Detailed Collection Designs

### 2.1 Products Collection

**Design Decision**: Embed variants, images, and basic category/brand info

**Rationale**:
- Products with variants are accessed together 99% of the time
- Variants rarely updated independently
- Embedding eliminates 5+ joins for product detail page
- Denormalize category/brand names to avoid lookups on list pages

```javascript
{
  _id: ObjectId,
  title: String,
  slug: String (unique indexed),
  summary: String,
  description: String,
  condition: String, // 'default', 'new', 'hot'
  status: String, // 'active', 'inactive'
  isFeatured: Boolean,
  hasVariants: Boolean,
  
  // Base product info (for non-variant products)
  basePrice: Number,
  baseDiscount: Number,
  baseStock: Number,
  baseSku: String,
  size: [String], // Optional size list for non-variant fashion
  
  // Embedded variants (for variant products)
  variants: [{
    _id: ObjectId,
    sku: String (unique),
    displayName: String, // "Red / Large / 8GB RAM"
    price: Number,
    discount: Number,
    stock: Number,
    status: String,
    
    // Variant options (denormalized for speed)
    options: [{
      typeId: ObjectId, // Reference to variantType
      typeName: String, // "color"
      typeDisplayName: String, // "Color"
      optionId: ObjectId,
      value: String, // "red"
      displayValue: String, // "Red"
      hexColor: String // For color swatches
    }],
    
    // Variant images
    images: [{
      _id: ObjectId,
      path: String, // S3/CDN URL
      isPrimary: Boolean,
      sortOrder: Number,
      altText: String,
      createdAt: Date
    }],
    
    variantValues: String, // Searchable concat: "red-large-8gb"
    createdAt: Date,
    updatedAt: Date
  }],
  
  // Product images (for base product or shared images)
  images: [{
    _id: ObjectId,
    path: String,
    isPrimary: Boolean,
    sortOrder: Number,
    altText: String,
    createdAt: Date
  }],
  
  // Denormalized category info (for display without lookup)
  category: {
    id: ObjectId,
    title: String,
    slug: String,
    path: String // "Electronics/Phones/Smartphones"
  },
  
  childCategory: {
    id: ObjectId,
    title: String,
    slug: String
  },
  
  // Denormalized brand info
  brand: {
    id: ObjectId,
    title: String,
    slug: String
  },
  
  // Cached rating data (updated via aggregation)
  ratings: {
    average: Number,
    count: Number,
    distribution: {
      1: Number,
      2: Number,
      3: Number,
      4: Number,
      5: Number
    }
  },
  
  // Denormalized discount info (for filtering)
  activeDiscount: {
    id: ObjectId,
    type: String, // 'percentage', 'amount'
    value: Number,
    endsAt: Date
  },
  
  // Search optimization fields
  searchTerms: String, // Concatenated searchable text
  tags: [String], // For tagging/filtering
  
  // Metadata
  viewCount: Number,
  salesCount: Number,
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes for Products**:

```javascript
// Compound indexes for common queries
db.products.createIndex({ status: 1, isFeatured: -1, createdAt: -1 });
db.products.createIndex({ status: 1, "category.id": 1, createdAt: -1 });
db.products.createIndex({ status: 1, "brand.id": 1, createdAt: -1 });
db.products.createIndex({ slug: 1 }, { unique: true });
db.products.createIndex({ "variants.sku": 1 }, { unique: true, sparse: true });

// Text index for search
db.products.createIndex({ 
  title: "text", 
  summary: "text", 
  description: "text",
  "brand.title": "text",
  "category.title": "text"
});

// Filtering indexes
db.products.createIndex({ "basePrice": 1, status: 1 });
db.products.createIndex({ "ratings.average": -1, status: 1 });
db.products.createIndex({ condition: 1, status: 1 });

// Partial indexes for performance
db.products.createIndex(
  { createdAt: -1 },
  { partialFilterExpression: { status: "active", isFeatured: true } }
);

// Sharding key (see section 5)
db.products.createIndex({ _id: "hashed" }); // For hash-based sharding
```

**Estimated Size per Document**:
- Base product: ~2-3 KB
- With 5 variants + images: ~8-12 KB
- **Total for 10M products**: ~80-120 GB (manageable with proper sharding)

---

### 2.2 Categories Collection

**Design Decision**: Materialized path pattern with denormalized counts

**Rationale**:
- Fast tree queries (get all descendants, ancestors)
- No recursive queries needed
- Product counts cached for performance

```javascript
{
  _id: ObjectId,
  title: String,
  slug: String (unique indexed),
  summary: String,
  photo: String, // CDN URL
  
  // Tree structure fields
  parentId: ObjectId,
  level: Number, // 0 for root
  path: String, // "1/2/3/4" (ObjectId chain)
  pathNames: String, // "Electronics/Phones/Smartphones" (for display)
  sortOrder: Number,
  
  // Cached counts (updated periodically)
  hasChildren: Boolean,
  childrenCount: Number,
  productsCount: Number, // Direct products
  totalProductsCount: Number, // Including descendants
  
  // Status and features
  status: String, // 'active', 'inactive'
  isFeatured: Boolean,
  
  // SEO fields
  seoTitle: String,
  seoDescription: String,
  
  // Metadata
  addedBy: ObjectId, // User ID
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes for Categories**:

```javascript
db.categories.createIndex({ slug: 1 }, { unique: true });
db.categories.createIndex({ parentId: 1, status: 1, sortOrder: 1 });
db.categories.createIndex({ path: 1 }); // For tree queries
db.categories.createIndex({ level: 1, status: 1 });
db.categories.createIndex({ status: 1, isFeatured: -1 });
```

**Why Not Nested Sets?** Materialized path is simpler to maintain and performs well for read-heavy e-commerce workloads.

---

### 2.3 Brands Collection

**Design Decision**: Simple reference collection with minimal data

```javascript
{
  _id: ObjectId,
  title: String,
  slug: String (unique indexed),
  code: String, // Optional brand code
  logo: String, // CDN URL
  description: String,
  
  // Cached data
  productsCount: Number,
  
  // Category associations (for brand-category filters)
  categories: [ObjectId], // Categories where brand appears
  
  status: String, // 'active', 'inactive'
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes**:
```javascript
db.brands.createIndex({ slug: 1 }, { unique: true });
db.brands.createIndex({ status: 1 });
db.brands.createIndex({ title: 1 });
```

---

### 2.4 Product Variant Types & Options Collections

**Design Decision**: Keep as separate reference collections (rarely accessed directly)

**variantTypes Collection**:
```javascript
{
  _id: ObjectId,
  name: String, // "color", "size", "ram"
  displayName: String, // "Color", "Size", "RAM"
  sortOrder: Number,
  status: String,
  createdAt: Date,
  updatedAt: Date
}
```

**variantOptions Collection**:
```javascript
{
  _id: ObjectId,
  variantTypeId: ObjectId,
  value: String, // "red"
  displayValue: String, // "Red"
  hexColor: String, // For color swatches
  sortOrder: Number,
  status: String,
  createdAt: Date,
  updatedAt: Date
}
```

**Note**: These are referenced from products.variants.options but kept separate because:
- Variant types/options are managed globally
- Reused across many products
- Denormalized copies in products for performance

**Indexes**:
```javascript
db.variantTypes.createIndex({ name: 1 }, { unique: true });
db.variantOptions.createIndex({ variantTypeId: 1, value: 1 }, { unique: true });
```

---

### 2.5 Reviews Collection

**Design Decision**: Separate collection to enable efficient aggregation

**Rationale**:
- Reviews grow unbounded (not suitable for embedding)
- Aggregation pipeline queries for ratings calculation
- Can be sharded independently if needed

```javascript
{
  _id: ObjectId,
  productId: ObjectId (indexed),
  userId: ObjectId,
  
  // Denormalized user info (to avoid lookups)
  user: {
    name: String,
    photo: String
  },
  
  // Review data
  rating: Number, // 1-5
  review: String,
  
  // Moderation
  status: String, // 'active', 'inactive', 'pending'
  
  // Helpful votes (for sorting)
  helpfulCount: Number,
  
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes**:
```javascript
db.reviews.createIndex({ productId: 1, status: 1, createdAt: -1 });
db.reviews.createIndex({ userId: 1, createdAt: -1 });
db.reviews.createIndex({ rating: 1, productId: 1 });
db.reviews.createIndex({ status: 1 });
```

**Rating Aggregation Pipeline** (to update products.ratings):
```javascript
db.reviews.aggregate([
  { $match: { productId: productId, status: "active" } },
  { $group: {
      _id: "$productId",
      average: { $avg: "$rating" },
      count: { $sum: 1 },
      distribution: {
        $push: { $switch: {
          branches: [
            { case: { $eq: ["$rating", 1] }, then: "1" },
            { case: { $eq: ["$rating", 2] }, then: "2" },
            // ... etc
          ]
        }}
      }
  }}
]);
```

---

### 2.6 Orders Collection

**Design Decision**: Embed order items for atomicity

**Rationale**:
- Orders and items created together (transaction)
- Never queried independently
- Snapshot of product/variant at purchase time
- Average order: 3-5 items (~5-10 KB per order)

```javascript
{
  _id: ObjectId,
  orderNumber: String (unique indexed),
  userId: ObjectId,
  
  // Denormalized user info (snapshot)
  user: {
    name: String,
    email: String
  },
  
  // Order items (embedded)
  items: [{
    _id: ObjectId,
    productId: ObjectId,
    variantId: ObjectId, // If applicable
    
    // Snapshot data (prices at time of purchase)
    title: String,
    sku: String,
    image: String,
    price: Number,
    discount: Number,
    quantity: Number,
    amount: Number, // Total for this item
    
    // Variant details snapshot
    variantOptions: [{
      typeName: String,
      value: String
    }]
  }],
  
  // Pricing
  subTotal: Number,
  shippingCost: Number,
  couponDiscount: Number,
  totalAmount: Number,
  totalQuantity: Number,
  
  // Shipping info (embedded)
  shipping: {
    id: ObjectId, // Reference to shipping method
    type: String,
    price: Number
  },
  
  // Coupon used
  coupon: {
    code: String,
    discount: Number
  },
  
  // Payment details
  paymentMethod: String, // 'cod', 'stripe', 'paypal', etc.
  paymentStatus: String, // 'paid', 'unpaid', 'refunded'
  transactionId: String,
  
  // Order status
  status: String, // 'new', 'processing', 'shipped', 'delivered', 'cancelled'
  statusHistory: [{
    status: String,
    timestamp: Date,
    note: String
  }],
  
  // Delivery address (embedded)
  address: {
    firstName: String,
    lastName: String,
    email: String,
    phone: String,
    address1: String,
    address2: String,
    city: String,
    state: String,
    country: String,
    postCode: String
  },
  
  // Metadata
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes**:
```javascript
db.orders.createIndex({ orderNumber: 1 }, { unique: true });
db.orders.createIndex({ userId: 1, createdAt: -1 });
db.orders.createIndex({ status: 1, createdAt: -1 });
db.orders.createIndex({ paymentStatus: 1 });
db.orders.createIndex({ "items.productId": 1 }); // For product sales tracking
db.orders.createIndex({ createdAt: -1 }); // For admin pagination
```

---

### 2.7 Carts Collection

**Design Decision**: Embed cart items, separate cart per user

**Rationale**:
- Carts are user-specific, small (<20 items typically)
- Frequent updates (add/remove items)
- Session-based for guests, user-based for logged-in

```javascript
{
  _id: ObjectId,
  userId: ObjectId, // Null for guest carts
  sessionId: String, // For guest users
  
  items: [{
    _id: ObjectId,
    productId: ObjectId,
    variantId: ObjectId, // If applicable
    
    // Denormalized product data (for display)
    title: String,
    slug: String,
    image: String,
    price: Number,
    discount: Number,
    
    // Cart item data
    quantity: Number,
    amount: Number, // price * quantity
    
    // Variant display info
    variantDisplay: String, // "Red / Large"
    
    addedAt: Date
  }],
  
  // Totals (calculated on update)
  subTotal: Number,
  totalItems: Number,
  
  // Status
  status: String, // 'active', 'abandoned', 'converted'
  
  // Metadata
  lastActivityAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes**:
```javascript
db.carts.createIndex({ userId: 1 }, { unique: true, sparse: true });
db.carts.createIndex({ sessionId: 1 }, { sparse: true });
db.carts.createIndex({ status: 1, lastActivityAt: 1 }); // For abandoned cart recovery
db.carts.createIndex({ "items.productId": 1 });
```

**Guest Cart Strategy**:
- Use sessionId for guests
- On login, merge guest cart into user cart
- TTL index to auto-delete abandoned carts after 30 days:
  ```javascript
  db.carts.createIndex(
    { lastActivityAt: 1 },
    { expireAfterSeconds: 2592000, partialFilterExpression: { userId: null } }
  );
  ```

---

### 2.8 Wishlists Collection

**Design Decision**: Similar to carts, embed items

```javascript
{
  _id: ObjectId,
  userId: ObjectId (indexed),
  
  items: [{
    _id: ObjectId,
    productId: ObjectId,
    variantId: ObjectId,
    
    // Denormalized display data
    title: String,
    slug: String,
    image: String,
    price: Number,
    
    addedAt: Date
  }],
  
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes**:
```javascript
db.wishlists.createIndex({ userId: 1 }, { unique: true });
db.wishlists.createIndex({ "items.productId": 1 });
```

---

### 2.9 Users Collection

**Design Decision**: Keep separate for authentication and security

```javascript
{
  _id: ObjectId,
  name: String,
  email: String (unique indexed),
  emailVerifiedAt: Date,
  password: String, // Hashed with bcrypt
  photo: String,
  role: String, // 'admin', 'user'
  status: String, // 'active', 'inactive', 'suspended'
  
  // OAuth fields
  provider: String, // 'google', 'facebook', null
  providerId: String,
  
  // Metadata
  lastLoginAt: Date,
  loginCount: Number,
  
  // Settings
  preferences: {
    newsletter: Boolean,
    notifications: Boolean
  },
  
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes**:
```javascript
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ providerId: 1 }, { sparse: true });
db.users.createIndex({ status: 1 });
```

---

### 2.10 Coupons Collection

```javascript
{
  _id: ObjectId,
  code: String (unique indexed),
  type: String, // 'fixed', 'percent'
  value: Number,
  
  // Restrictions
  minOrderAmount: Number,
  maxDiscount: Number, // For percent coupons
  usageLimit: Number, // Total uses allowed
  usageCount: Number, // Current usage count
  perUserLimit: Number,
  
  // Validity
  validFrom: Date,
  validUntil: Date,
  status: String, // 'active', 'inactive', 'expired'
  
  // Applicable to
  applicableProducts: [ObjectId],
  applicableCategories: [ObjectId],
  
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes**:
```javascript
db.coupons.createIndex({ code: 1 }, { unique: true });
db.coupons.createIndex({ status: 1, validFrom: 1, validUntil: 1 });
```

---

### 2.11 Discounts Collection

**Design Decision**: Keep separate, reference from products via denormalization

```javascript
{
  _id: ObjectId,
  title: String,
  type: String, // 'percentage', 'amount'
  value: Number,
  
  // Time-based
  startsAt: Date,
  endsAt: Date,
  isActive: Boolean,
  
  // Applicable entities (many-to-many via arrays)
  categories: [ObjectId],
  products: [ObjectId],
  
  createdAt: Date,
  updatedAt: Date
}
```

**Note**: Active discounts are denormalized into `products.activeDiscount` via scheduled job for fast filtering.

**Indexes**:
```javascript
db.discounts.createIndex({ isActive: 1, startsAt: 1, endsAt: 1 });
db.discounts.createIndex({ categories: 1 });
db.discounts.createIndex({ products: 1 });
```

---

### 2.12 Shippings Collection

```javascript
{
  _id: ObjectId,
  type: String, // 'standard', 'express', 'overnight'
  price: Number,
  estimatedDays: Number,
  status: String, // 'active', 'inactive'
  createdAt: Date,
  updatedAt: Date
}
```

---

## 3. Denormalization Strategy

### 3.1 When to Denormalize

✅ **Denormalize When**:
- Data is read much more than written (category/brand names in products)
- Frequently accessed together (product + variants + images)
- Small data size (<1 KB per embedded doc)
- Snapshot required (order items, historical data)

❌ **Don't Denormalize When**:
- Data changes frequently and affects many documents
- Unbounded arrays (reviews, comments)
- Complex many-to-many relationships
- Data exceeds 16 MB document limit

### 3.2 Update Patterns

**Category/Brand Name Changes**:
```javascript
// When category name changes, update all products
db.products.updateMany(
  { "category.id": categoryId },
  { $set: { "category.title": newTitle, "category.slug": newSlug } }
);
```

**Product Rating Updates** (scheduled job every 5 minutes):
```javascript
// Aggregate reviews and update product.ratings
const ratings = await db.reviews.aggregate([
  { $match: { productId: productId, status: "active" } },
  { $group: { _id: null, avg: { $avg: "$rating" }, count: { $sum: 1 } } }
]);

await db.products.updateOne(
  { _id: productId },
  { $set: { "ratings.average": ratings.avg, "ratings.count": ratings.count } }
);
```

**Stock Updates**:
```javascript
// Atomic stock decrement for variant
db.products.updateOne(
  { _id: productId, "variants._id": variantId, "variants.stock": { $gte: quantity } },
  { $inc: { "variants.$.stock": -quantity } }
);
```

---

## 4. Migration from PostgreSQL Tables

### 4.1 Tables → Collections Mapping

| PostgreSQL Table | MongoDB Collection | Strategy |
|-----------------|-------------------|----------|
| `products` | `products` | Merge with variants, images |
| `product_variants` | Embedded in `products.variants` | Embed (1:N bounded) |
| `product_variant_types` | `variantTypes` | Keep separate (global reference) |
| `product_variant_options` | `variantOptions` | Keep separate (global reference) |
| `product_variant_option_assignments` | Embedded in `products.variants.options` | Embed (denormalized) |
| `variant_images` | Embedded in `products.variants.images` | Embed |
| `product_images` | Embedded in `products.images` | Embed |
| `product_variant_type_selections` | Embedded in `products.variantTypes` | Embed array of IDs |
| `categories` | `categories` | Direct map with path materialization |
| `brands` | `brands` | Direct map |
| `orders` | `orders` | Merge with cart items (snapshot) |
| `carts` | `carts` | Embed items |
| `wishlists` | `wishlists` | Embed items |
| `product_reviews` | `reviews` | Direct map |
| `users` | `users` | Direct map |
| `coupons` | `coupons` | Direct map |
| `discounts` | `discounts` | Direct map + denormalize to products |
| `shippings` | `shippings` | Direct map |
| `product_discount` (pivot) | Array in `discounts.products` | Convert to array field |
| `category_discount` (pivot) | Array in `discounts.categories` | Convert to array field |
| `filters` | `filters` | Direct map (if dynamic filters needed) |

### 4.2 Complex Transformations

**Product Variants Merging**:
```sql
-- SQL query to fetch product with all related data
SELECT 
  p.*,
  pv.*,
  pvo.*,
  vi.*,
  pi.*
FROM products p
LEFT JOIN product_variants pv ON p.id = pv.product_id
LEFT JOIN product_variant_option_assignments pvoa ON pv.id = pvoa.product_variant_id
LEFT JOIN product_variant_options pvo ON pvoa.product_variant_option_id = pvo.id
LEFT JOIN variant_images vi ON pv.id = vi.product_variant_id
LEFT JOIN product_images pi ON p.id = pi.product_id
WHERE p.id = ?;
```

Then transform to MongoDB document structure:
```javascript
const productDoc = {
  _id: new ObjectId(),
  title: row.title,
  slug: row.slug,
  // ... base fields
  variants: variantsGroupedByVariantId.map(v => ({
    _id: new ObjectId(),
    sku: v.sku,
    price: v.price,
    options: v.options.map(opt => ({
      typeId: opt.variant_type_id,
      typeName: opt.type_name,
      value: opt.value,
      // ...
    })),
    images: v.images.map(img => ({ path: img.image_path, ... }))
  })),
  images: baseImagesGroupedByProductId.map(img => ({ path: img.image_path, ... }))
};
```

---

## 5. Sharding Strategy

### 5.1 Recommended Shard Key: Hashed `_id`

**Products Collection**:
```javascript
sh.shardCollection("ecommerce.products", { _id: "hashed" });
```

**Rationale**:
- Even distribution of 10M+ products
- No hot shards (uniform write distribution)
- Supports shard key in all queries via `_id` or can use other indexes

**Alternative**: If products are heavily associated with categories, consider:
```javascript
sh.shardCollection("ecommerce.products", { "category.id": 1, _id: 1 });
```
- Pros: Category-based queries are faster (query router targets specific shard)
- Cons: Uneven distribution if some categories have way more products

### 5.2 Other Collections

**Orders**:
```javascript
sh.shardCollection("ecommerce.orders", { userId: "hashed" });
```
- Users' orders stay together (good for "My Orders" queries)

**Reviews**:
```javascript
sh.shardCollection("ecommerce.reviews", { productId: "hashed" });
```
- Reviews for a product stay together (good for aggregation)

### 5.3 Cluster Sizing (10M Products)

**Estimated Storage**:
- Products: ~100 GB (with variants and images)
- Reviews: ~50 GB (assuming 5M reviews)
- Orders: ~200 GB (assuming 10M orders)
- Other collections: ~20 GB
- **Total**: ~370 GB

**Recommended Configuration**:
- **3 Shards** × 3 replicas (9 servers total)
- Each shard holds ~125 GB
- **Server specs**: 16 GB RAM, 256 GB SSD, 4 CPU cores
- **Total**: ~450 GB storage, 144 GB RAM

**Scaling Path**:
- Start with 2 shards for <5M products
- Add shards as data grows
- MongoDB balancer auto-distributes chunks

---

## 6. Search Architecture

### 6.1 MongoDB Atlas Search (Recommended)

**Pros**:
- Native integration with MongoDB
- No separate infrastructure
- Real-time sync with data changes
- Good for text + faceted search

**Search Index Definition**:
```javascript
{
  "mappings": {
    "dynamic": false,
    "fields": {
      "title": {
        "type": "string",
        "analyzer": "lucene.standard"
      },
      "description": {
        "type": "string",
        "analyzer": "lucene.english"
      },
      "category.title": { "type": "string" },
      "brand.title": { "type": "string" },
      "tags": { "type": "string" },
      "status": { "type": "string" },
      "basePrice": { "type": "number" },
      "ratings.average": { "type": "number" }
    }
  }
}
```

**Search Query Example**:
```javascript
db.products.aggregate([
  {
    $search: {
      text: {
        query: "red smartphone",
        path: ["title", "description", "tags"]
      },
      compound: {
        must: [
          { text: { query: "red smartphone", path: "title" } }
        ],
        should: [
          { near: { path: "basePrice", origin: 500, pivot: 100 } }
        ],
        filter: [
          { equals: { path: "status", value: "active" } },
          { range: { path: "basePrice", gte: 200, lte: 1000 } }
        ]
      }
    }
  },
  { $limit: 20 }
]);
```

### 6.2 Elasticsearch Integration (Alternative)

**Pros**:
- More powerful search features (fuzzy, synonyms, phrase matching)
- Better performance for complex queries
- Mature ecosystem (Kibana for analytics)

**Cons**:
- Separate infrastructure
- Data sync complexity
- Higher operational overhead

**Sync Strategy**:
1. **Change Streams** (real-time):
   ```javascript
   const changeStream = db.products.watch();
   changeStream.on('change', async (change) => {
     if (change.operationType === 'insert' || change.operationType === 'update') {
       await esClient.index({
         index: 'products',
         id: change.documentKey._id.toString(),
         body: transformForES(change.fullDocument)
       });
     }
   });
   ```

2. **Batch Indexing** (initial load):
   ```javascript
   const cursor = db.products.find({ status: 'active' }).batchSize(1000);
   for await (const product of cursor) {
     await esClient.index({
       index: 'products',
       id: product._id.toString(),
       body: transformForES(product)
     });
   }
   ```

### 6.3 Hybrid Approach

- **Atlas Search**: For category/brand/price filtering + keyword search
- **MongoDB Aggregation**: For complex analytics queries
- **Redis**: For autocomplete suggestions (cached)

---

## 7. Performance Optimizations

### 7.1 Read Optimization

1. **Projection**: Only return needed fields
   ```javascript
   db.products.find(
     { status: 'active' },
     { title: 1, slug: 1, basePrice: 1, images: { $slice: 1 } }
   );
   ```

2. **Covered Queries**: Queries satisfied by index alone
   ```javascript
   // Index: { status: 1, slug: 1, title: 1 }
   db.products.find(
     { status: 'active' },
     { slug: 1, title: 1, _id: 0 }
   );
   ```

3. **Query Caching**: Cache common queries in Redis
   ```javascript
   const cacheKey = `products:featured:${page}`;
   let products = await redis.get(cacheKey);
   if (!products) {
     products = await db.products.find({ isFeatured: true }).toArray();
     await redis.setex(cacheKey, 300, JSON.stringify(products)); // 5 min TTL
   }
   ```

4. **Pagination**: Use range queries instead of skip
   ```javascript
   // Bad: db.products.find().skip(10000).limit(20)
   // Good:
   db.products.find({ _id: { $gt: lastSeenId } }).limit(20).sort({ _id: 1 });
   ```

### 7.2 Write Optimization

1. **Batch Inserts**:
   ```javascript
   db.products.insertMany(productsArray, { ordered: false });
   ```

2. **Update Operators**: Use atomic updates
   ```javascript
   db.products.updateOne(
     { _id: productId, "variants._id": variantId },
     { $inc: { "variants.$.stock": -1, salesCount: 1 } }
   );
   ```

3. **Bulk Operations**:
   ```javascript
   const bulkOps = products.map(p => ({
     updateOne: {
       filter: { _id: p._id },
       update: { $set: p },
       upsert: true
     }
   }));
   db.products.bulkWrite(bulkOps);
   ```

### 7.3 Connection Pooling

```javascript
// backend/src/config/database.js
const mongoUri = process.env.MONGODB_URI;
await mongoose.connect(mongoUri, {
  maxPoolSize: 50, // Adjust based on load (50-100 for production)
  minPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  family: 4 // Force IPv4
});
```

---

## 8. Data Validation

### 8.1 Mongoose Schema Validation

Use Mongoose schemas with validators (see next section for full schemas).

### 8.2 MongoDB Schema Validation

```javascript
db.createCollection("products", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["title", "slug", "status"],
      properties: {
        title: {
          bsonType: "string",
          minLength: 3,
          maxLength: 200
        },
        slug: {
          bsonType: "string",
          pattern: "^[a-z0-9-]+$"
        },
        basePrice: {
          bsonType: ["number", "null"],
          minimum: 0
        },
        status: {
          enum: ["active", "inactive"]
        },
        variants: {
          bsonType: "array",
          items: {
            bsonType: "object",
            required: ["sku", "price"],
            properties: {
              sku: { bsonType: "string" },
              price: { bsonType: "number", minimum: 0 },
              stock: { bsonType: "number", minimum: 0 }
            }
          }
        }
      }
    }
  },
  validationAction: "error"
});
```

---

## 9. Operational Considerations

### 9.1 Backup Strategy

1. **Continuous Backup** (MongoDB Atlas):
   - Point-in-time recovery (1-hour granularity)
   - Automatic daily snapshots
   - Retain for 30 days

2. **Manual Backups** (Self-hosted):
   ```bash
   mongodump --uri="mongodb://localhost:27017/enterprise-ecommerce" --out=/backups/$(date +%Y%m%d)
   ```

3. **Backup Schedule**:
   - Daily: Full backup at 2 AM
   - Hourly: Incremental oplog backup
   - Weekly: Archive to S3/Azure Blob

### 9.2 Monitoring

**Key Metrics**:
- Query response time (p95, p99)
- Index hit ratio (should be >95%)
- Replication lag (should be <1 second)
- Disk usage (alert at 70%)
- Connection pool usage (alert at 80%)

**Tools**:
- MongoDB Atlas Charts
- Prometheus + Grafana
- New Relic / Datadog

### 9.3 Security

1. **Authentication**:
   - Use SCRAM-SHA-256 or X.509 certificates
   - Separate users for app, admin, backup

2. **Authorization**:
   - Role-based access control (RBAC)
   - Principle of least privilege

3. **Encryption**:
   - At-rest: Enable MongoDB encryption
   - In-transit: TLS/SSL for all connections
   - Field-level: Encrypt sensitive fields (credit cards)

4. **Network Security**:
   - IP whitelisting
   - VPC peering (AWS/Azure)
   - No public internet access for database

---

## 10. Summary

### 10.1 Key Decisions

| Aspect | Decision | Rationale |
|--------|----------|-----------|
| **Variants** | Embedded in products | Always accessed together, bounded size |
| **Images** | Embedded (both product and variant) | Small data, accessed with parent |
| **Categories** | Materialized path | Fast tree queries, denormalized counts |
| **Reviews** | Separate collection | Unbounded growth, aggregation needs |
| **Orders** | Embedded order items | Atomic creation, snapshot pattern |
| **Carts** | Embedded cart items | Frequent updates, small size |
| **Sharding** | Hashed `_id` for products | Even distribution, no hot shards |
| **Search** | Atlas Search or Elasticsearch | Full-text + faceted search capability |

### 10.2 Document Size Estimates

- **Product** (with 5 variants, 10 images): ~10 KB
- **Order** (with 5 items): ~5 KB
- **Review**: ~0.5 KB
- **Cart** (with 10 items): ~3 KB
- **User**: ~1 KB

### 10.3 Collection Growth Projections

| Collection | Initial Count | 1 Year Growth | Storage (1 year) |
|-----------|--------------|---------------|------------------|
| Products | 10,000,000 | +2,000,000 | 120 GB |
| Reviews | 5,000,000 | +5,000,000 | 5 GB |
| Orders | 1,000,000 | +5,000,000 | 30 GB |
| Users | 500,000 | +1,000,000 | 1.5 GB |
| Carts | 100,000 | +200,000 | 0.6 GB |
| **Total** | | | **~157 GB** |

### 10.4 Next Steps

1. ✅ **Schema Design Complete** (this document)
2. 🔄 **Create Mongoose Models** (Section 11)
3. 📝 **Write Migration Scripts** (Section 12)
4. 🧪 **Create Seeders** (Section 13)
5. 🚀 **Deploy and Test**

---

## 11. Mongoose Models Implementation

See `MONGOOSE_MODELS_IMPLEMENTATION.md` for complete schemas with:
- Validation rules
- Indexes
- Virtual properties
- Instance methods
- Static methods
- Pre/post hooks

---

## 12. Migration Scripts

See `MIGRATION_SCRIPTS_GUIDE.md` for:
- PostgreSQL extraction scripts
- Data transformation logic
- Bulk import strategies
- Progress tracking
- Error handling
- Rollback procedures

---

## 13. Seeder Generators

See `MONGODB_SEEDERS_GUIDE.md` for:
- Bulk insert patterns
- Faker.js data generation
- Realistic test data at scale
- Reference consistency
- Performance optimization

---

*This document represents the canonical MongoDB schema design for the enterprise e-commerce platform. All implementations should reference this design for consistency.*

**Version**: 1.0  
**Last Updated**: 2024  
**Status**: Production-Ready  
