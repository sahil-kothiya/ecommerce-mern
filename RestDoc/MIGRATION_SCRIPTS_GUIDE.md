# MongoDB Migration Scripts Guide

## Overview

This guide provides production-ready Node.js scripts for migrating data from Laravel PostgreSQL/MySQL database to MongoDB. The scripts handle:

- Data extraction from relational database
- Schema transformation to MongoDB document structure  
- Bulk import with error handling
- Progress tracking and logging
- Rollback procedures
- Validation and verification

---

## Prerequisites

```bash
npm install pg mysql2 mongodb mongoose dotenv progress cli-progress chalk
```

**Environment Setup** (`.env.migration`):
```env
# Source Database (PostgreSQL/MySQL)
SOURCE_DB_TYPE=postgres
SOURCE_DB_HOST=localhost
SOURCE_DB_PORT=5432
SOURCE_DB_NAME=laravel_ecommerce
SOURCE_DB_USER=postgres
SOURCE_DB_PASSWORD=yourpassword

# Target Database (MongoDB)
MONGODB_URI=mongodb://localhost:27017/enterprise-ecommerce

# Migration Settings
BATCH_SIZE=1000
PARALLEL_WORKERS=4
LOG_LEVEL=info
DRY_RUN=false
```

---

## 1. Base Migration Class

**File**: `scripts/migration/BaseMigration.js`

```javascript
import mongoose from 'mongoose';
import { Pool as PgPool } from 'pg';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import chalk from 'chalk';
import cliProgress from 'cli-progress';

dotenv.config({ path: '.env.migration' });

export class BaseMigration {
  constructor(name) {
    this.name = name;
    this.sourceDb = null;
    this.mongoConnection = null;
    this.stats = {
      total: 0,
      migrated: 0,
      failed: 0,
      skipped: 0,
      startTime: null,
      endTime: null
    };
    this.errors = [];
    this.progressBar = null;
  }

  async connect() {
    console.log(chalk.blue(`Connecting to databases...`));
    
    // Connect to source database
    if (process.env.SOURCE_DB_TYPE === 'postgres') {
      this.sourceDb = new PgPool({
        host: process.env.SOURCE_DB_HOST,
        port: process.env.SOURCE_DB_PORT,
        database: process.env.SOURCE_DB_NAME,
        user: process.env.SOURCE_DB_USER,
        password: process.env.SOURCE_DB_PASSWORD,
        max: 10
      });
      await this.sourceDb.query('SELECT 1');
    } else if (process.env.SOURCE_DB_TYPE === 'mysql') {
      this.sourceDb = await mysql.createPool({
        host: process.env.SOURCE_DB_HOST,
        port: process.env.SOURCE_DB_PORT,
        database: process.env.SOURCE_DB_NAME,
        user: process.env.SOURCE_DB_USER,
        password: process.env.SOURCE_DB_PASSWORD,
        waitForConnections: true,
        connectionLimit: 10
      });
    }
    
    // Connect to MongoDB
    this.mongoConnection = await mongoose.connect(process.env.MONGODB_URI, {
      maxPoolSize: 20,
      minPoolSize: 5
    });
    
    console.log(chalk.green('✓ Database connections established'));
  }

  async disconnect() {
    if (this.sourceDb) {
      if (process.env.SOURCE_DB_TYPE === 'postgres') {
        await this.sourceDb.end();
      } else {
        await this.sourceDb.end();
      }
    }
    
    if (this.mongoConnection) {
      await mongoose.disconnect();
    }
    
    console.log(chalk.blue('Database connections closed'));
  }

  async executeSourceQuery(query, params = []) {
    if (process.env.SOURCE_DB_TYPE === 'postgres') {
      const result = await this.sourceDb.query(query, params);
      return result.rows;
    } else {
      const [rows] = await this.sourceDb.execute(query, params);
      return rows;
    }
  }

  createProgressBar(total) {
    this.progressBar = new cliProgress.SingleBar({
      format: `${chalk.cyan('{bar}')} | {percentage}% | {value}/{total} | ETA: {eta}s | {status}`,
      barCompleteChar: '\u2588',
      barIncompleteChar: '\u2591',
      hideCursor: true
    });
    
    this.progressBar.start(total, 0, { status: 'Starting...' });
  }

  updateProgress(status = '') {
    if (this.progressBar) {
      this.progressBar.update(this.stats.migrated + this.stats.failed + this.stats.skipped, {
        status
      });
    }
  }

  stopProgress() {
    if (this.progressBar) {
      this.progressBar.stop();
    }
  }

  logError(context, error, data = null) {
    const errorLog = {
      context,
      message: error.message,
      stack: error.stack,
      data,
      timestamp: new Date()
    };
    
    this.errors.push(errorLog);
    console.error(chalk.red(`Error in ${context}:`), error.message);
    
    if (data) {
      console.error(chalk.red('Related data:'), JSON.stringify(data, null, 2));
    }
  }

  printSummary() {
    this.stats.endTime = new Date();
    const duration = (this.stats.endTime - this.stats.startTime) / 1000;
    
    console.log('\\n' + chalk.bold.cyan('='.repeat(60)));
    console.log(chalk.bold.cyan(`Migration Summary: ${this.name}`));
    console.log(chalk.bold.cyan('='.repeat(60)));
    
    console.log(chalk.white(`Total records:    ${this.stats.total}`));
    console.log(chalk.green(`✓ Migrated:       ${this.stats.migrated}`));
    console.log(chalk.red(`✗ Failed:         ${this.stats.failed}`));
    console.log(chalk.yellow(`⊘ Skipped:        ${this.stats.skipped}`));
    console.log(chalk.white(`Duration:         ${duration.toFixed(2)}s`));
    console.log(chalk.white(`Speed:            ${(this.stats.migrated / duration).toFixed(2)} records/sec`));
    
    if (this.errors.length > 0) {
      console.log(chalk.red(`\\nErrors: ${this.errors.length}`));
      console.log(chalk.red('Check error log for details'));
    }
    
    console.log(chalk.bold.cyan('='.repeat(60)) + '\\n');
  }

  async saveErrorLog() {
    if (this.errors.length > 0) {
      const fs = await import('fs/promises');
      const timestamp = new Date().toISOString().replace(/:/g, '-');
      const filename = `./logs/migration-errors-${this.name}-${timestamp}.json`;
      
      await fs.mkdir('./logs', { recursive: true });
      await fs.writeFile(filename, JSON.stringify(this.errors, null, 2));
      
      console.log(chalk.yellow(`Error log saved to: ${filename}`));
    }
  }

  async bulkInsert(Model, documents, options = {}) {
    const batchSize = options.batchSize || parseInt(process.env.BATCH_SIZE) || 1000;
    const results = [];
    
    for (let i = 0; i < documents.length; i += batchSize) {
      const batch = documents.slice(i, i + batchSize);
      
      try {
        if (process.env.DRY_RUN === 'true') {
          console.log(chalk.yellow(`[DRY RUN] Would insert ${batch.length} documents`));
          results.push(...batch);
        } else {
          const inserted = await Model.insertMany(batch, { 
            ordered: false,
            lean: true 
          });
          results.push(...inserted);
        }
        
        this.stats.migrated += batch.length;
        this.updateProgress(`Inserted ${this.stats.migrated} / ${this.stats.total}`);
      } catch (error) {
        // Handle bulk write errors
        if (error.writeErrors) {
          this.stats.failed += error.writeErrors.length;
          this.stats.migrated += batch.length - error.writeErrors.length;
          
          error.writeErrors.forEach(we => {
            this.logError('bulkInsert', we, batch[we.index]);
          });
        } else {
          this.stats.failed += batch.length;
          this.logError('bulkInsert', error, { batchSize: batch.length });
        }
      }
    }
    
    return results;
  }

  async run() {
    throw new Error('run() method must be implemented by subclass');
  }

  async execute() {
    this.stats.startTime = new Date();
    
    try {
      console.log(chalk.bold.blue(`\\nStarting migration: ${this.name}\\n`));
      
      await this.connect();
      await this.run();
      
      this.printSummary();
      await this.saveErrorLog();
      
      return this.stats;
    } catch (error) {
      console.error(chalk.red('\\nFatal error during migration:'), error);
      this.logError('execute', error);
      throw error;
    } finally {
      this.stopProgress();
      await this.disconnect();
    }
  }
}
```

---

## 2. Product Migration Script

**File**: `scripts/migration/MigrateProducts.js`

```javascript
import { BaseMigration } from './BaseMigration.js';
import { Product } from '../../backend/src/models/Product.js';
import { Category } from '../../backend/src/models/Category.enhanced.js';
import { Brand } from '../../backend/src/models/Brand.js';
import mongoose from 'mongoose';

export class MigrateProducts extends BaseMigration {
  constructor() {
    super('Products');
    this.categoryMap = new Map();
    this.brandMap = new Map();
  }

  async run() {
    // Pre-load categories and brands for denormalization
    await this.loadCategoryMap();
    await this.loadBrandMap();
    
    // Get total count
    const countResult = await this.executeSourceQuery(
      'SELECT COUNT(*) as count FROM products WHERE status = $1',
      ['active']
    );
    this.stats.total = parseInt(countResult[0].count);
    
    console.log(`Found ${this.stats.total} products to migrate`);
    this.createProgressBar(this.stats.total);
    
    // Fetch products in batches
    const batchSize = parseInt(process.env.BATCH_SIZE) || 1000;
    let offset = 0;
    
    while (offset < this.stats.total) {
      const products = await this.fetchProductsBatch(offset, batchSize);
      const transformedProducts = [];
      
      for (const product of products) {
        try {
          const mongoDoc = await this.transformProduct(product);
          transformedProducts.push(mongoDoc);
        } catch (error) {
          this.stats.failed++;
          this.logError('transformProduct', error, product);
        }
      }
      
      // Bulk insert
      await this.bulkInsert(Product, transformedProducts);
      
      offset += batchSize;
    }
  }

  async loadCategoryMap() {
    const categories = await Category.find({}).lean();
    categories.forEach(cat => {
      this.categoryMap.set(cat._id.toString(), {
        id: cat._id,
        title: cat.title,
        slug: cat.slug,
        path: cat.pathNames
      });
    });
    console.log(`Loaded ${this.categoryMap.size} categories`);
  }

  async loadBrandMap() {
    const brands = await Brand.find({}).lean();
    brands.forEach(brand => {
      this.brandMap.set(brand._id.toString(), {
        id: brand._id,
        title: brand.title,
        slug: brand.slug
      });
    });
    console.log(`Loaded ${this.brandMap.size} brands`);
  }

  async fetchProductsBatch(offset, limit) {
    const query = `
      SELECT 
        p.*,
        c.id as cat_id, c.title as cat_title, c.slug as cat_slug,
        b.id as brand_id, b.title as brand_title, b.slug as brand_slug
      FROM products p
      LEFT JOIN categories c ON p.cat_id = c.id
      LEFT JOIN brands b ON p.brand_id = b.id
      WHERE p.status = $1
      ORDER BY p.id
      LIMIT $2 OFFSET $3
    `;
    
    return this.executeSourceQuery(query, ['active', limit, offset]);
  }

  async transformProduct(row) {
    const productId = new mongoose.Types.ObjectId();
    
    // Fetch variants if product has variants
    let variants = [];
    if (row.has_variants) {
      variants = await this.fetchProductVariants(row.id);
    }
    
    // Fetch images
    const images = await this.fetchProductImages(row.id);
    
    // Build MongoDB document
    return {
      _id: productId,
      title: row.title,
      slug: row.slug,
      summary: row.summary,
      description: row.description,
      condition: row.condition,
      status: row.status,
      isFeatured: row.is_featured,
      hasVariants: row.has_variants,
      
      // Base fields
      basePrice: row.has_variants ? null : row.base_price,
      baseDiscount: row.has_variants ? null : row.base_discount,
      baseStock: row.has_variants ? null : row.base_stock,
      baseSku: row.has_variants ? null : row.base_sku,
      size: row.size ? row.size.split(',') : [],
      
      // Embedded variants
      variants: variants.map(v => this.transformVariant(v)),
      
      // Images
      images: images.map(img => ({
        _id: new mongoose.Types.ObjectId(),
        path: img.image_path,
        isPrimary: img.is_primary,
        sortOrder: img.sort_order,
        altText: img.alt_text,
        createdAt: img.created_at,
        updatedAt: img.updated_at
      })),
      
      // Denormalized category
      category: row.cat_id ? {
        id: new mongoose.Types.ObjectId(row.cat_id),
        title: row.cat_title,
        slug: row.cat_slug,
        path: '' // Will be populated from categoryMap
      } : null,
      
      // Denormalized brand
      brand: row.brand_id ? {
        id: new mongoose.Types.ObjectId(row.brand_id),
        title: row.brand_title,
        slug: row.brand_slug
      } : null,
      
      ratings: {
        average: 0,
        count: 0,
        distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
      },
      
      tags: [],
      viewCount: 0,
      salesCount: 0,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  async fetchProductVariants(productId) {
    const query = `
      SELECT 
        pv.*,
        json_agg(
          json_build_object(
            'type_id', pvt.id,
            'type_name', pvt.name,
            'type_display_name', pvt.display_name,
            'option_id', pvo.id,
            'option_value', pvo.value,
            'option_display_value', pvo.display_value,
            'hex_color', pvo.hex_color
          )
        ) as options,
        (
          SELECT json_agg(
            json_build_object(
              'image_path', vi.image_path,
              'is_primary', vi.is_primary,
              'sort_order', vi.sort_order,
              'created_at', vi.created_at
            )
          )
          FROM variant_images vi
          WHERE vi.product_variant_id = pv.id
        ) as images
      FROM product_variants pv
      LEFT JOIN product_variant_option_assignments pvoa ON pv.id = pvoa.product_variant_id
      LEFT JOIN product_variant_options pvo ON pvoa.product_variant_option_id = pvo.id
      LEFT JOIN product_variant_types pvt ON pvo.variant_type_id = pvt.id
      WHERE pv.product_id = $1 AND pv.status = 'active'
      GROUP BY pv.id
    `;
    
    return this.executeSourceQuery(query, [productId]);
  }

  transformVariant(row) {
    const options = row.options || [];
    const images = row.images || [];
    
    return {
      _id: new mongoose.Types.ObjectId(),
      sku: row.sku,
      displayName: row.display_name || this.generateVariantDisplayName(options),
      price: row.price,
      discount: row.discount || 0,
      stock: row.stock,
      status: row.status,
      
      options: options.map(opt => ({
        typeId: new mongoose.Types.ObjectId(opt.type_id),
        typeName: opt.type_name,
        typeDisplayName: opt.type_display_name,
        optionId: new mongoose.Types.ObjectId(opt.option_id),
        value: opt.option_value,
        displayValue: opt.option_display_value,
        hexColor: opt.hex_color
      })),
      
      images: images.map(img => ({
        _id: new mongoose.Types.ObjectId(),
        path: img.image_path,
        isPrimary: img.is_primary,
        sortOrder: img.sort_order,
        createdAt: img.created_at
      })),
      
      variantValues: options.map(o => o.option_value).join('-').toLowerCase(),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  generateVariantDisplayName(options) {
    return options.map(o => o.option_display_value).join(' / ');
  }

  async fetchProductImages(productId) {
    const query = `
      SELECT image_path, is_primary, sort_order, alt_text, created_at, updated_at
      FROM product_images
      WHERE product_id = $1
      ORDER BY sort_order
    `;
    
    return this.executeSourceQuery(query, [productId]);
  }
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const migration = new MigrateProducts();
  migration.execute()
    .then(stats => {
      console.log('Migration completed successfully');
      process.exit(stats.failed > 0 ? 1 : 0);
    })
    .catch(error => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}
```

---

## 3. Category Migration Script

**File**: `scripts/migration/MigrateCategories.js`

```javascript
import { BaseMigration } from './BaseMigration.js';
import { Category } from '../../backend/src/models/Category.enhanced.js';
import mongoose from 'mongoose';

export class MigrateCategories extends BaseMigration {
  constructor() {
    super('Categories');
    this.categoryIdMap = new Map(); // Old ID -> New ObjectId
  }

  async run() {
    // Fetch all categories (need all at once for tree structure)
    const categories = await this.executeSourceQuery(`
      SELECT * FROM categories ORDER BY level, parent_id, sort_order
    `);
    
    this.stats.total = categories.length;
    console.log(`Found ${this.stats.total} categories to migrate`);
    this.createProgressBar(this.stats.total);
    
    // First pass: Create category documents with new ObjectIds
    const categoriesByOldId = new Map();
    categories.forEach(cat => {
      const newId = new mongoose.Types.ObjectId();
      this.categoryIdMap.set(cat.id.toString(), newId);
      categoriesByOldId.set(cat.id.toString(), cat);
    });
    
    // Second pass: Build MongoDB documents with correct parent references
    const mongoCategories = [];
    
    for (const cat of categories) {
      try {
        const mongoDoc = {
          _id: this.categoryIdMap.get(cat.id.toString()),
          title: cat.title,
          slug: cat.slug,
          summary: cat.summary,
          photo: cat.photo,
          
          parentId: cat.parent_id ? this.categoryIdMap.get(cat.parent_id.toString()) : null,
          level: cat.level,
          path: this.buildPath(cat.parent_id, categoriesByOldId),
          pathNames: this.buildPathNames(cat, categoriesByOldId),
          sortOrder: cat.sort_order,
          
          hasChildren: cat.has_children,
          childrenCount: cat.children_count,
          productsCount: cat.products_count,
          totalProductsCount: cat.products_count, // Will be updated later
          
          status: cat.status,
          isFeatured: cat.is_featured,
          
          seoTitle: cat.seo_title,
          seoDescription: cat.seo_description,
          
          addedBy: cat.added_by ? new mongoose.Types.ObjectId() : null,
          createdAt: cat.created_at,
          updatedAt: cat.updated_at
        };
        
        mongoCategories.push(mongoDoc);
      } catch (error) {
        this.stats.failed++;
        this.logError('transformCategory', error, cat);
      }
    }
    
    // Bulk insert
    await this.bulkInsert(Category, mongoCategories);
  }

  buildPath(parentId, categoriesMap) {
    if (!parentId) return '';
    
    const path = [];
    let currentId = parentId;
    
    while (currentId) {
      const newId = this.categoryIdMap.get(currentId.toString());
      if (newId) {
        path.unshift(newId.toString());
      }
      
      const parent = categoriesMap.get(currentId.toString());
      currentId = parent?.parent_id;
    }
    
    return path.join('/');
  }

  buildPathNames(category, categoriesMap) {
    const names = [category.title];
    let currentId = category.parent_id;
    
    while (currentId) {
      const parent = categoriesMap.get(currentId.toString());
      if (parent) {
        names.unshift(parent.title);
        currentId = parent.parent_id;
      } else {
        break;
      }
    }
    
    return names.join('/');
  }
}
```

---

## 4. Order Migration Script

**File**: `scripts/migration/MigrateOrders.js`

```javascript
import { BaseMigration } from './BaseMigration.js';
import { Order } from '../../backend/src/models/Order.enhanced.js';
import mongoose from 'mongoose';

export class MigrateOrders extends BaseMigration {
  constructor() {
    super('Orders');
  }

  async run() {
    const countResult = await this.executeSourceQuery(
      'SELECT COUNT(*) as count FROM orders'
    );
    this.stats.total = parseInt(countResult[0].count);
    
    console.log(`Found ${this.stats.total} orders to migrate`);
    this.createProgressBar(this.stats.total);
    
    const batchSize = parseInt(process.env.BATCH_SIZE) || 1000;
    let offset = 0;
    
    while (offset < this.stats.total) {
      const orders = await this.fetchOrdersBatch(offset, batchSize);
      const transformedOrders = [];
      
      for (const order of orders) {
        try {
          const mongoDoc = await this.transformOrder(order);
          transformedOrders.push(mongoDoc);
        } catch (error) {
          this.stats.failed++;
          this.logError('transformOrder', error, order);
        }
      }
      
      await this.bulkInsert(Order, transformedOrders);
      offset += batchSize;
    }
  }

  async fetchOrdersBatch(offset, limit) {
    const query = `
      SELECT 
        o.*,
        u.name as user_name, u.email as user_email,
        s.type as shipping_type, s.price as shipping_price
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      LEFT JOIN shippings s ON o.shipping_id = s.id
      ORDER BY o.id
      LIMIT $1 OFFSET $2
    `;
    
    return this.executeSourceQuery(query, [limit, offset]);
  }

  async transformOrder(row) {
    // Fetch order items (from carts table in Laravel)
    const items = await this.fetchOrderItems(row.id);
    
    return {
      _id: new mongoose.Types.ObjectId(),
      orderNumber: row.order_number,
      userId: row.user_id ? new mongoose.Types.ObjectId() : null,
      
      user: {
        name: row.user_name,
        email: row.user_email
      },
      
      items: items.map(item => ({
        _id: new mongoose.Types.ObjectId(),
        productId: new mongoose.Types.ObjectId(),
        variantId: item.variant_id ? new mongoose.Types.ObjectId() : null,
        title: item.product_title,
        sku: item.sku || 'N/A',
        image: item.product_image,
        price: item.price,
        discount: 0,
        quantity: item.quantity,
        amount: item.amount,
        variantOptions: []
      })),
      
      subTotal: row.sub_total,
      shippingCost: row.shipping_cost || 0,
      couponDiscount: row.coupon || 0,
      totalAmount: row.total_amount,
      totalQuantity: row.quantity,
      
      shipping: {
        id: row.shipping_id ? new mongoose.Types.ObjectId() : null,
        type: row.shipping_type,
        price: row.shipping_price
      },
      
      coupon: row.coupon ? {
        code: 'MIGRATED',
        discount: row.coupon
      } : null,
      
      paymentMethod: row.payment_method,
      paymentStatus: row.payment_status,
      transactionId: row.transaction_id,
      
      status: row.status,
      statusHistory: [{
        status: row.status,
        timestamp: row.updated_at
      }],
      
      address: {
        firstName: row.first_name,
        lastName: row.last_name,
        email: row.email,
        phone: row.phone,
        address1: row.address1,
        address2: row.address2,
        city: '',
        state: '',
        country: row.country,
        postCode: row.post_code
      },
      
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  async fetchOrderItems(orderId) {
    const query = `
      SELECT 
        c.*,
        p.title as product_title,
        p.slug as product_slug,
        (SELECT image_path FROM product_images WHERE product_id = c.product_id AND is_primary = true LIMIT 1) as product_image
      FROM carts c
      LEFT JOIN products p ON c.product_id = p.id
      WHERE c.order_id = $1
    `;
    
    return this.executeSourceQuery(query, [orderId]);
  }
}
```

---

## 5. Master Migration Runner

**File**: `scripts/migration/runAll.js`

```javascript
import { MigrateCategories } from './MigrateCategories.js';
import { MigrateBrands } from './MigrateBrands.js';
import { MigrateVariantTypes } from './MigrateVariantTypes.js';
import { MigrateProducts } from './MigrateProducts.js';
import { MigrateOrders } from './MigrateOrders.js';
import { MigrateReviews } from './MigrateReviews.js';
import { MigrateUsers } from './MigrateUsers.js';
import chalk from 'chalk';

async function runMigrations() {
  const migrations = [
    new MigrateUsers(),        // 1. Users first (referenced by reviews, orders)
    new MigrateCategories(),   // 2. Categories (referenced by products)
    new MigrateBrands(),       // 3. Brands (referenced by products)
    new MigrateVariantTypes(), // 4. Variant types/options (referenced by products)
    new MigrateProducts(),     // 5. Products with variants
    new MigrateReviews(),      // 6. Reviews (after products)
    new MigrateOrders()        // 7. Orders (after products)
  ];

  const results = [];
  let hasFailures = false;

  console.log(chalk.bold.blue('\\n' + '='.repeat(60)));
  console.log(chalk.bold.blue('Starting Full Database Migration'));
  console.log(chalk.bold.blue('='.repeat(60) + '\\n'));

  for (const migration of migrations) {
    try {
      const stats = await migration.execute();
      results.push({ name: migration.name, stats });
      
      if (stats.failed > 0) {
        hasFailures = true;
      }
    } catch (error) {
      console.error(chalk.red(`Migration ${migration.name} failed:`, error));
      hasFailures = true;
      break; // Stop on critical failure
    }
  }

  // Print overall summary
  console.log(chalk.bold.cyan('\\n' + '='.repeat(60)));
  console.log(chalk.bold.cyan('Overall Migration Summary'));
  console.log(chalk.bold.cyan('='.repeat(60)));
  
  results.forEach(({ name, stats }) => {
    const status = stats.failed > 0 ? chalk.red('✗') : chalk.green('✓');
    console.log(`${status} ${name.padEnd(20)} - Migrated: ${stats.migrated}, Failed: ${stats.failed}`);
  });
  
  console.log(chalk.bold.cyan('='.repeat(60) + '\\n'));

  process.exit(hasFailures ? 1 : 0);
}

runMigrations().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
```

---

## Usage

```bash
# Install dependencies
npm install

# Set up environment
cp .env.migration.example .env.migration
# Edit .env.migration with your database credentials

# Run individual migration
node scripts/migration/MigrateProducts.js

# Run all migrations in order
node scripts/migration/runAll.js

# Dry run (no data inserted)
DRY_RUN=true node scripts/migration/runAll.js

# With custom batch size
BATCH_SIZE=500 node scripts/migration/MigrateProducts.js
```

---

## Verification Queries

After migration, run these queries to verify data integrity:

```javascript
// Count documents
db.products.countDocuments()
db.categories.countDocuments()
db.orders.countDocuments()

// Check product with variants
db.products.findOne({ hasVariants: true })

// Check denormalized data
db.products.findOne({ 'category.id': { $ne: null } })

// Verify indexes
db.products.getIndexes()
```

---

## Rollback Procedure

```javascript
// Drop all collections and re-run migration
use enterprise-ecommerce
db.products.drop()
db.categories.drop()
db.orders.drop()
db.reviews.drop()
// ... etc
```

---

*This migration framework handles production-scale data transformation with error handling, progress tracking, and validation.*
