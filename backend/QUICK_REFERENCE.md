# 🎯 Product Seeder - Quick Reference Card

## ⚡ Quick Commands

```bash
# Run everything (recommended)
npm run seed

# Individual seeders (in order)
npm run seed:categories  # 1. Run first
npm run seed:brands      # 2. Run second
npm run seed:variants    # 3. Run third
npm run seed:products    # 4. Run last (100K products)

# Custom count
node backend/runSeeder.js products --count=50000
```

---

## 📊 Default Configuration

| Setting | Value | Description |
|---------|-------|-------------|
| **Total Products** | 100,000 | 1 Lakh products |
| **Variant Products** | 98,000 (98%) | Products with variants |
| **Simple Products** | 2,000 (2%) | Products without variants |
| **Batch Size** | 1,000 | Products per batch |
| **Variants Per Product** | 2-9 | Random range |
| **Active Products** | 95% | 95,000 active |
| **Featured Products** | 10% | 10,000 featured |

---

## 🔧 Where to Change Settings

**File:** `backend/src/seeders/ProductSeeder.js` (Lines 47-68)

### Change Product Count
```javascript
DEFAULT_PRODUCT_COUNT: 100000,  // ← Change this number
```

### Change Variant Ratio
```javascript
VARIANT_PRODUCT_PERCENTAGE: 0.98,  // ← 98% = 0.98, 50% = 0.50
```

### Change Batch Size (Performance)
```javascript
BATCH_SIZE: 1000,  // ← Higher = faster but more memory
```

### Enable Auto-Truncate (⚠️ Danger)
```javascript
TRUNCATE_RELATED_TABLES: false,  // ← Set to true to clear all tables
```

### Change Variants Per Product
```javascript
MIN_VARIANTS_PER_PRODUCT: 2,   // ← Minimum variants
MAX_VARIANTS_PER_PRODUCT: 9,   // ← Maximum variants
```

---

## ⏱️ Estimated Time

| Products | Time |
|----------|------|
| 10,000 | ~3 min |
| 50,000 | ~15 min |
| 100,000 | ~30 min |
| 500,000 | ~2.5 hrs |
| 1,000,000 | ~6 hrs |

---

## ✅ Seeder Order (IMPORTANT!)

```
1. Categories  → npm run seed:categories
2. Brands      → npm run seed:brands
3. Variants    → npm run seed:variants
4. Products    → npm run seed:products (requires all above)
```

---

## 🚨 Common Issues

### "No categories found"
```bash
npm run seed:categories  # Run this first
```

### "No brands found"
```bash
npm run seed:brands  # Run this second
```

### Out of Memory
```bash
node --max-old-space-size=4096 backend/runSeeder.js products
```

Or reduce batch size in `ProductSeeder.js`:
```javascript
BATCH_SIZE: 500,  // Smaller batches
```

---

## 📁 Configuration File Location

```
backend/src/seeders/ProductSeeder.js
    ↓
Lines 47-68: CONFIG object
    ↓
Change values here
```

---

## 💾 What Gets Created

### Per Product (with variants):
- ✅ 1 Product document
- ✅ 2-9 Variants (configurable)
- ✅ 3 Product images
- ✅ 3 Images per variant
- ✅ Full product details (title, description, pricing, etc.)

### Per Product (without variants):
- ✅ 1 Product document
- ✅ 3 Product images
- ✅ Simple pricing & stock
- ✅ Full product details

---

## 🎛️ Example Configurations

### Small Test (10K products)
```javascript
DEFAULT_PRODUCT_COUNT: 10000,
VARIANT_PRODUCT_PERCENTAGE: 0.98,
BATCH_SIZE: 500,
```

### Medium (50K products)
```javascript
DEFAULT_PRODUCT_COUNT: 50000,
VARIANT_PRODUCT_PERCENTAGE: 0.98,
BATCH_SIZE: 1000,
```

### Large (1 Lakh / 100K products) - DEFAULT
```javascript
DEFAULT_PRODUCT_COUNT: 100000,
VARIANT_PRODUCT_PERCENTAGE: 0.98,
BATCH_SIZE: 1000,
```

### Extra Large (5 Lakh / 500K products)
```javascript
DEFAULT_PRODUCT_COUNT: 500000,
VARIANT_PRODUCT_PERCENTAGE: 0.98,
BATCH_SIZE: 2000,
```

### All Variants
```javascript
DEFAULT_PRODUCT_COUNT: 100000,
VARIANT_PRODUCT_PERCENTAGE: 1.0,  // 100% variants
BATCH_SIZE: 1000,
```

### No Variants
```javascript
DEFAULT_PRODUCT_COUNT: 100000,
VARIANT_PRODUCT_PERCENTAGE: 0.0,  // 0% variants
BATCH_SIZE: 1000,
```

---

## 📋 Pre-Flight Checklist

Before running seeder:

- [ ] MongoDB is running
- [ ] Database connection is configured in `.env`
- [ ] Categories seeder has been run
- [ ] Brands seeder has been run
- [ ] Variants seeder has been run
- [ ] You have enough disk space (~5-10 GB for 100K products)
- [ ] System has adequate RAM (4GB+ recommended)

---

## 🔥 Performance Tips

### Faster Seeding
```javascript
BATCH_SIZE: 5000,  // Process more at once (needs more RAM)
```

### Less Memory Usage
```javascript
BATCH_SIZE: 500,   // Process less at once (slower)
```

### High Performance (8GB+ RAM)
```bash
node --max-old-space-size=8192 backend/runSeeder.js products
```
```javascript
BATCH_SIZE: 10000,
```

---

## 📊 Expected Database Size

| Products | Approx. Size |
|----------|--------------|
| 10,000 | ~200 MB |
| 50,000 | ~1 GB |
| 100,000 | ~2 GB |
| 500,000 | ~10 GB |
| 1,000,000 | ~20 GB |

*Includes all variants and images metadata*

---

## 🎯 Summary Output Example

```
✅ PRODUCT SEEDING COMPLETED!
📊 Final Summary:
   ✓ Total Products Created: 100,000
   ✓ Products with Variants: 98,000
   ✓ Simple Products: 2,000
   ✓ Total Variants: 539,200
   ✓ Avg Variants/Product: 5.50
```

---

## 📞 Need Help?

1. Check `SEEDER_INSTRUCTIONS.md` for detailed guide
2. Review configuration in `ProductSeeder.js`
3. Ensure all prerequisite seeders ran successfully
4. Verify MongoDB connection and disk space

---

**File:** `backend/src/seeders/ProductSeeder.js`  
**Config:** Lines 47-68  
**Last Updated:** November 28, 2025
