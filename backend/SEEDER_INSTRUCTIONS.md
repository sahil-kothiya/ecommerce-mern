# 🌱 Database Seeder Instructions

Complete guide for seeding your database with 1 Lakh (100,000) products.

---

## 📋 Table of Contents

1. [Quick Start](#quick-start)
2. [Configuration](#configuration)
3. [Running Seeders](#running-seeders)
4. [Seeder Order](#seeder-order)
5. [Customization](#customization)
6. [Troubleshooting](#troubleshooting)

---

## 🚀 Quick Start

### Prerequisites

```bash
# 1. Install dependencies
npm install

# 2. Make sure MongoDB is running
# MongoDB should be accessible at the URL in your .env file
```

### Run All Seeders (Recommended)

```bash
# This will run all seeders in correct order
npm run seed

# Or use node directly
node backend/runSeeder.js
```

---

## ⚙️ Configuration

### Product Seeder Configuration

Open `backend/src/seeders/ProductSeeder.js` and modify the `CONFIG` object:

```javascript
const CONFIG = {
    // Total products to create (1 Lakh = 100,000)
    DEFAULT_PRODUCT_COUNT: 100000,
    
    // 98% products with variants
    VARIANT_PRODUCT_PERCENTAGE: 0.98,
    
    // Batch size (higher = faster but more memory)
    BATCH_SIZE: 1000,
    
    // Auto-clear related tables
    TRUNCATE_RELATED_TABLES: false,
    
    // Variants per product range
    MIN_VARIANTS_PER_PRODUCT: 2,
    MAX_VARIANTS_PER_PRODUCT: 9,
    
    // Product distribution
    ACTIVE_PRODUCT_PERCENTAGE: 0.95,    // 95% active
    FEATURED_PRODUCT_PERCENTAGE: 0.10,  // 10% featured
};
```

### Common Configuration Scenarios

#### Scenario 1: Add 50,000 Products
```javascript
DEFAULT_PRODUCT_COUNT: 50000,
```

#### Scenario 2: All Products with Variants
```javascript
VARIANT_PRODUCT_PERCENTAGE: 1.0, // 100% variant products
```

#### Scenario 3: Faster Seeding (More Memory)
```javascript
BATCH_SIZE: 5000, // Process 5000 products per batch
```

#### Scenario 4: Clear All Related Data
```javascript
TRUNCATE_RELATED_TABLES: true, // Will clear categories, brands, etc.
```

---

## 🏃 Running Seeders

### Method 1: Run Specific Seeder

```bash
# Seed only products (100,000)
npm run seed:products

# Seed only categories
npm run seed:categories

# Seed only brands
npm run seed:brands

# Seed only variants
npm run seed:variants
```

### Method 2: Run with Custom Count

```bash
# Add 50,000 products
node backend/runSeeder.js products --count=50000

# Add 200,000 products
node backend/runSeeder.js products --count=200000
```

### Method 3: Run All Seeders in Order

```bash
# This runs everything in correct order
npm run seed
```

### Method 4: Programmatic Execution

Create a custom script:

```javascript
// custom-seed.js
import { productSeeder } from './backend/src/seeders/ProductSeeder.js';
import { connectDB } from './backend/src/config/database.js';

async function seed() {
    await connectDB();
    
    // Seed 1 Lakh products
    await productSeeder.run(100000);
    
    process.exit(0);
}

seed();
```

---

## 🔄 Seeder Order

**IMPORTANT:** Run seeders in this exact order!

```bash
# Step 1: Categories (REQUIRED FIRST)
npm run seed:categories

# Step 2: Brands (REQUIRED SECOND)
npm run seed:brands

# Step 3: Variant Types & Options (REQUIRED THIRD)
npm run seed:variants

# Step 4: Products (REQUIRES ALL ABOVE)
npm run seed:products
```

### Why This Order?

```
Categories → Brands → Variants → Products
    ↓          ↓          ↓          ↓
Required   Required   Required   Uses All
  First     Second     Third      Above
```

Products reference:
- ✅ Categories (for product.category)
- ✅ Brands (for product.brand)
- ✅ Variant Types (for product.variants)

---

## 🎨 Customization

### 1. Change Product Count

**File:** `ProductSeeder.js` (Line ~50)

```javascript
// Change this value:
DEFAULT_PRODUCT_COUNT: 100000, // Your desired count

// Examples:
DEFAULT_PRODUCT_COUNT: 50000,   // 50K products
DEFAULT_PRODUCT_COUNT: 500000,  // 5 Lakh products
DEFAULT_PRODUCT_COUNT: 1000000, // 10 Lakh products
```

### 2. Adjust Variant Ratio

**File:** `ProductSeeder.js` (Line ~53)

```javascript
// Change variant percentage:
VARIANT_PRODUCT_PERCENTAGE: 0.98, // 98% with variants

// Examples:
VARIANT_PRODUCT_PERCENTAGE: 1.0,  // 100% with variants
VARIANT_PRODUCT_PERCENTAGE: 0.80, // 80% with variants
VARIANT_PRODUCT_PERCENTAGE: 0.50, // 50/50 split
```

### 3. Modify Batch Size (Performance)

**File:** `ProductSeeder.js` (Line ~56)

```javascript
// Higher = Faster but uses more RAM
BATCH_SIZE: 1000, // Process 1000 at a time

// Performance options:
BATCH_SIZE: 500,   // Slower, less memory
BATCH_SIZE: 2000,  // Faster, more memory
BATCH_SIZE: 5000,  // Very fast, high memory
```

### 4. Enable Auto-Truncate

**File:** `ProductSeeder.js` (Line ~59)

```javascript
// Clear related tables before seeding
TRUNCATE_RELATED_TABLES: false, // Default: OFF

// Enable to clear all:
TRUNCATE_RELATED_TABLES: true, // WARNING: Clears everything!
```

### 5. Adjust Variants Per Product

**File:** `ProductSeeder.js` (Lines ~62-63)

```javascript
// Number of variants per product
MIN_VARIANTS_PER_PRODUCT: 2,  // Minimum
MAX_VARIANTS_PER_PRODUCT: 9,  // Maximum

// Examples:
MIN_VARIANTS_PER_PRODUCT: 3,  // At least 3 variants
MAX_VARIANTS_PER_PRODUCT: 15, // Up to 15 variants
```

---

## 📊 Expected Output

When running the seeder, you'll see:

```
═══════════════════════════════════════════════════════════════
🛍️  PRODUCT SEEDER - LARGE SCALE DATA GENERATION
═══════════════════════════════════════════════════════════════

📊 Configuration:
   - Total Products: 100,000
   - Variant Products: 98,000 (98%)
   - Non-Variant Products: 2,000 (2%)
   - Batch Size: 1,000
   - Truncate Related Tables: NO

📚 Loading reference data from database...
✅ Reference data loaded:
   - Categories: 150
   - Brands: 100
   - Variant Types: 8

🧹 Truncating products table...
✅ Cleared 0 existing products

🏭 Starting batch production...

📦 Batch 1/100 - Generating 1,000 products...
   ✓ Batch 1 completed in 12.34s
   ✓ Progress: 1,000/100,000 (1.0%)
   ✓ Variants: 5,432 (avg: 5.5 per product)
   ✓ Non-Variant: 20

... (continues for all batches)

═══════════════════════════════════════════════════════════════
✅ PRODUCT SEEDING COMPLETED SUCCESSFULLY!
═══════════════════════════════════════════════════════════════

📊 Final Summary:
   ✓ Total Products Created: 100,000
   ✓ Products with Variants: 98,000
   ✓ Simple Products (No Variants): 2,000
   ✓ Total Variants Generated: 539,200
   ✓ Average Variants per Product: 5.50
```

---

## ⏱️ Estimated Time

| Products | Batch Size | Estimated Time |
|----------|------------|----------------|
| 10,000   | 1,000      | ~2-3 minutes   |
| 50,000   | 1,000      | ~10-15 minutes |
| 100,000  | 1,000      | ~20-30 minutes |
| 500,000  | 2,000      | ~2-3 hours     |
| 1,000,000| 5,000      | ~5-7 hours     |

*Times vary based on CPU, RAM, and MongoDB performance*

---

## 🐛 Troubleshooting

### Issue 1: "No categories found"

**Problem:** Categories don't exist in database

**Solution:**
```bash
# Run category seeder first
npm run seed:categories
```

### Issue 2: "No brands found"

**Problem:** Brands don't exist in database

**Solution:**
```bash
# Run brand seeder first
npm run seed:brands
```

### Issue 3: "No variant types found"

**Problem:** Variant types don't exist

**Solution:**
```bash
# Run variant seeder first
npm run seed:variants
```

### Issue 4: Out of Memory

**Problem:** Node.js runs out of memory

**Solution:**
```bash
# Increase Node.js memory limit
node --max-old-space-size=4096 backend/runSeeder.js products

# Or reduce batch size in ProductSeeder.js:
BATCH_SIZE: 500, // Smaller batches
```

### Issue 5: MongoDB Connection Timeout

**Problem:** Database connection times out

**Solution:**
```bash
# Check MongoDB is running
# Increase timeout in database.js config
# Check network/firewall settings
```

### Issue 6: Slow Performance

**Solutions:**
1. Increase batch size (more memory, faster):
   ```javascript
   BATCH_SIZE: 5000,
   ```

2. Disable indexes temporarily (in Product model)

3. Use more powerful server

4. Ensure MongoDB has enough RAM

---

## 📁 File Locations

```
backend/
├── src/
│   ├── seeders/
│   │   ├── ProductSeeder.js      ← Main seeder (CONFIGURE HERE)
│   │   ├── CategorySeeder.js     ← Run first
│   │   ├── BrandSeeder.js        ← Run second
│   │   └── VariantSeeder.js      ← Run third
│   └── models/
│       ├── Product.js            ← Product schema
│       ├── Category.js           ← Category schema
│       ├── Brand.js              ← Brand schema
│       └── Supporting.models.js  ← Variant schemas
├── runSeeder.js                  ← Main runner script
└── SEEDER_INSTRUCTIONS.md        ← This file
```

---

## 🔥 Quick Commands Cheat Sheet

```bash
# Full seed (all tables)
npm run seed

# Individual seeders
npm run seed:categories
npm run seed:brands
npm run seed:variants
npm run seed:products

# Custom product count
node backend/runSeeder.js products --count=50000

# Increase memory for large seeds
node --max-old-space-size=8192 backend/runSeeder.js products
```

---

## 💡 Best Practices

1. ✅ Always run seeders in correct order
2. ✅ Backup database before seeding
3. ✅ Start with smaller counts for testing
4. ✅ Monitor system resources during seeding
5. ✅ Use appropriate batch size for your system
6. ⚠️ Be careful with TRUNCATE_RELATED_TABLES option
7. 📊 Check summary output for verification

---

## 📞 Support

For issues or questions:
- Check error messages carefully
- Review configuration settings
- Ensure all required seeders ran first
- Verify MongoDB is running
- Check system resources (RAM, CPU)

---

**Last Updated:** November 28, 2025
**Version:** 2.0.0
**Status:** Production Ready ✅
