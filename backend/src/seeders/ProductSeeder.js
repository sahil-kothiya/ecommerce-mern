import mongoose from 'mongoose';
import { Product } from '../models/Product.js';
import { Category } from '../models/Category.js';
import { Brand } from '../models/Brand.js';
import { VariantType, VariantOption } from '../models/Supporting.models.js';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PRODUCT SEEDER CONFIGURATION
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * HOW TO RUN THIS SEEDER:
 * ----------------------
 * 
 * Method 1: Run specific seeder file
 *   npm run seed:products
 * 
 * Method 2: Run from the main seed file
 *   npm run seed
 * 
 * Method 3: Run programmatically
 *   node backend/runSeeder.js products
 * 
 * Method 4: Custom count
 *   node backend/runSeeder.js products --count=50000
 * 
 * CONFIGURATION OPTIONS:
 * ---------------------
 * - Total Products: 100,000 (1 Lakh) - Change DEFAULT_PRODUCT_COUNT below
 * - Variant Products: 98% (98,000 products with variants)
 * - Non-Variant Products: 2% (2,000 simple products)
 * - Batch Size: 1000 products per batch (adjustable)
 * - Variants Per Product: 2-9 variants (random)
 * 
 * WHAT THIS SEEDER DOES:
 * ---------------------
 * 1. Loads reference data (Categories, Brands, Variant Types)
 * 2. Clears existing products (TRUNCATE)
 * 3. Creates 100,000 products in batches
 * 4. Generates realistic product data with images
 * 5. Creates variants for 98% of products
 * 
 * RELATED TABLES:
 * --------------
 * This seeder REQUIRES the following data to exist first:
 * - Categories (run CategorySeeder first)
 * - Brands (run BrandSeeder first)
 * - Variant Types & Options (run VariantSeeder first)
 * 
 * AUTO-TRUNCATE OPTIONS:
 * ---------------------
 * Set truncateRelatedTables = true to auto-clear related data
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION SECTION - ADJUST THESE VALUES
// ═══════════════════════════════════════════════════════════════════════════

const CONFIG = {
    // Total number of products to create (1 Lakh = 100,000)
    DEFAULT_PRODUCT_COUNT: 100000,

    // Percentage of products with variants (98%)
    VARIANT_PRODUCT_PERCENTAGE: 0.98,

    // Batch size for bulk insertion (higher = faster but more memory)
    BATCH_SIZE: 1000,

    // Auto-truncate related tables before seeding
    TRUNCATE_RELATED_TABLES: false, // Set to true to clear all related data

    // Variant configuration
    MIN_VARIANTS_PER_PRODUCT: 2,
    MAX_VARIANTS_PER_PRODUCT: 9,

    // Product status distribution
    ACTIVE_PRODUCT_PERCENTAGE: 0.95, // 95% active, 5% inactive
    FEATURED_PRODUCT_PERCENTAGE: 0.10, // 10% featured products
};

// ═══════════════════════════════════════════════════════════════════════════

export class ProductSeeder {
    constructor() {
        this.productCount = 0;
        this.variantCount = 0;
        this.nonVariantCount = 0;
        this.batchSize = CONFIG.BATCH_SIZE;
        this.config = CONFIG;
    }

    /**
     * Main seeding method
     * @param {number} totalProducts - Total number of products to create (default: 100,000)
     */
    async run(totalProducts = CONFIG.DEFAULT_PRODUCT_COUNT) {
        console.log('\n═══════════════════════════════════════════════════════════════');
        console.log('🛍️  PRODUCT SEEDER - LARGE SCALE DATA GENERATION');
        console.log('═══════════════════════════════════════════════════════════════\n');
        console.log(`📊 Configuration:`);
        console.log(`   - Total Products: ${totalProducts.toLocaleString()}`);
        console.log(`   - Variant Products: ${Math.floor(totalProducts * CONFIG.VARIANT_PRODUCT_PERCENTAGE).toLocaleString()} (${(CONFIG.VARIANT_PRODUCT_PERCENTAGE * 100)}%)`);
        console.log(`   - Non-Variant Products: ${Math.floor(totalProducts * (1 - CONFIG.VARIANT_PRODUCT_PERCENTAGE)).toLocaleString()} (${((1 - CONFIG.VARIANT_PRODUCT_PERCENTAGE) * 100)}%)`);
        console.log(`   - Batch Size: ${CONFIG.BATCH_SIZE.toLocaleString()}`);
        console.log(`   - Truncate Related Tables: ${CONFIG.TRUNCATE_RELATED_TABLES ? 'YES' : 'NO'}\n`);

        try {
            // Step 1: Optionally truncate related tables
            if (CONFIG.TRUNCATE_RELATED_TABLES) {
                await this.truncateRelatedTables();
            }

            // Step 2: Load reference data
            await this.loadReferenceData();

            // Step 3: Clear existing products
            await this.clearExistingProducts();

            // Step 4: Create products in batches
            await this.createProductsBatch(totalProducts);

            // Step 5: Display summary
            console.log('\n═══════════════════════════════════════════════════════════════');
            console.log('✅ PRODUCT SEEDING COMPLETED SUCCESSFULLY!');
            console.log('═══════════════════════════════════════════════════════════════\n');
            console.log(`📊 Final Summary:`);
            console.log(`   ✓ Total Products Created: ${this.productCount.toLocaleString()}`);
            console.log(`   ✓ Products with Variants: ${(this.productCount - this.nonVariantCount).toLocaleString()}`);
            console.log(`   ✓ Simple Products (No Variants): ${this.nonVariantCount.toLocaleString()}`);
            console.log(`   ✓ Total Variants Generated: ${this.variantCount.toLocaleString()}`);
            console.log(`   ✓ Average Variants per Product: ${(this.variantCount / (this.productCount - this.nonVariantCount)).toFixed(2)}\n`);

        } catch (error) {
            console.error('\n❌ Product seeding failed:', error);
            throw error;
        }
    }

    /**
     * Truncate all related tables (OPTIONAL)
     * Enable by setting CONFIG.TRUNCATE_RELATED_TABLES = true
     */
    async truncateRelatedTables() {
        console.log('🗑️  Truncating related tables...');

        try {
            // You can add other collections to truncate here
            // await Category.deleteMany({});
            // await Brand.deleteMany({});
            // await VariantType.deleteMany({});
            // await VariantOption.deleteMany({});

            console.log('✅ Related tables truncated (disabled by default)\n');
        } catch (error) {
            console.error('⚠️  Warning: Could not truncate some tables:', error.message);
        }
    }

    /**
     * Load reference data from database
     * REQUIRED: Categories, Brands, and Variant Types must exist
     */
    async loadReferenceData() {
        console.log('📚 Loading reference data from database...');

        this.categories = await Category.find({ status: 'active' }).lean();
        this.brands = await Brand.find({ status: 'active' }).lean();
        this.variantTypes = await VariantType.find().populate('options').lean();

        // Validation
        if (this.categories.length === 0) {
            throw new Error('❌ No categories found! Please run CategorySeeder first.');
        }
        if (this.brands.length === 0) {
            throw new Error('❌ No brands found! Please run BrandSeeder first.');
        }
        if (this.variantTypes.length === 0) {
            throw new Error('❌ No variant types found! Please run VariantSeeder first.');
        }

        console.log(`✅ Reference data loaded:`);
        console.log(`   - Categories: ${this.categories.length}`);
        console.log(`   - Brands: ${this.brands.length}`);
        console.log(`   - Variant Types: ${this.variantTypes.length}\n`);
    }

    /**
     * Clear all existing products (TRUNCATE)
     */
    async clearExistingProducts() {
        console.log('🧹 Truncating products table...');
        const deletedCount = await Product.countDocuments();
        await Product.deleteMany({});
        console.log(`✅ Cleared ${deletedCount.toLocaleString()} existing products\n`);
    }

    /**
     * Create products in batches for better performance
     * @param {number} totalProducts - Total products to create
     */
    async createProductsBatch(totalProducts) {
        const batches = Math.ceil(totalProducts / this.batchSize);
        const nonVariantTarget = Math.floor(totalProducts * (1 - CONFIG.VARIANT_PRODUCT_PERCENTAGE));

        console.log('🏭 Starting batch production...\n');

        for (let batch = 0; batch < batches; batch++) {
            const startIndex = batch * this.batchSize;
            const endIndex = Math.min(startIndex + this.batchSize, totalProducts);
            const batchSize = endIndex - startIndex;

            const startTime = Date.now();
            console.log(`📦 Batch ${batch + 1}/${batches} - Generating ${batchSize.toLocaleString()} products...`);

            const products = [];

            for (let i = startIndex; i < endIndex; i++) {
                // Determine if this product should have variants
                // First 2% are non-variant, rest are variant-based
                const shouldHaveVariants = this.nonVariantCount >= nonVariantTarget;

                const product = await this.generateProduct(i, shouldHaveVariants);
                products.push(product);
            }

            // Bulk insert for performance
            await Product.insertMany(products, { ordered: false });
            this.productCount += batchSize;

            const duration = ((Date.now() - startTime) / 1000).toFixed(2);
            const progress = ((this.productCount / totalProducts) * 100).toFixed(1);
            const avgVariants = this.variantCount > 0 ? (this.variantCount / (this.productCount - this.nonVariantCount)).toFixed(1) : 0;

            console.log(`   ✓ Batch ${batch + 1} completed in ${duration}s`);
            console.log(`   ✓ Progress: ${this.productCount.toLocaleString()}/${totalProducts.toLocaleString()} (${progress}%)`);
            console.log(`   ✓ Variants: ${this.variantCount.toLocaleString()} (avg: ${avgVariants} per product)`);
            console.log(`   ✓ Non-Variant: ${this.nonVariantCount.toLocaleString()}\n`);
        }
    }

    /**
     * Generate a single product with all details
     * @param {number} index - Product index for unique identification
     * @param {boolean} forceVariants - Force this product to have variants (for 98% ratio)
     */
    async generateProduct(index, forceVariants = true) {
        const category = this.getRandomCategory();
        const brand = this.getRandomBrand();

        // 98% products should have variants, 2% should not
        const hasVariants = forceVariants;

        if (!hasVariants) {
            this.nonVariantCount++;
        }

        const baseTitle = this.generateProductTitle(category, brand);
        const product = {
            title: baseTitle,
            slug: this.generateSlug(baseTitle, index),
            summary: this.generateSummary(baseTitle, category),
            description: this.generateDescription(baseTitle, category, brand),
            condition: this.getRandomCondition(),
            status: this.getRandomStatus(),
            isFeatured: Math.random() > 0.9, // 10% featured
            hasVariants,
            category: {
                id: category._id,
                title: category.title,
                slug: category.slug,
                path: category.pathNames || category.title
            },
            brand: {
                id: brand._id,
                title: brand.title,
                slug: brand.slug
            },
            images: this.generateImages(),
            tags: this.generateTags(category, brand),
            seo: {
                title: baseTitle,
                description: this.generateSummary(baseTitle, category),
                keywords: this.generateKeywords(baseTitle, category, brand)
            },
            ratings: {
                average: Math.round((Math.random() * 2 + 3) * 10) / 10, // 3.0 - 5.0
                count: Math.floor(Math.random() * 1000),
                distribution: this.generateRatingDistribution()
            },
            viewCount: Math.floor(Math.random() * 10000),
            salesCount: Math.floor(Math.random() * 500),
            createdAt: this.generateRandomDate()
        };

        // Generate variants or simple product data
        if (hasVariants) {
            // VARIANT-BASED PRODUCT (98% of products)
            const variants = this.generateVariants(category, brand);
            product.variants = variants;
            this.variantCount += variants.length;

            // Calculate aggregated pricing from variants
            const prices = variants.map(v => v.price);
            product.basePrice = Math.min(...prices);
            product.maxPrice = Math.max(...prices);

            const stocks = variants.map(v => v.stock);
            product.totalStock = stocks.reduce((sum, stock) => sum + stock, 0);
        } else {
            // SIMPLE PRODUCT WITHOUT VARIANTS (2% of products)
            product.basePrice = this.generatePrice(category);
            product.baseDiscount = Math.random() > 0.7 ? Math.floor(Math.random() * 30) + 5 : 0;
            product.baseStock = Math.floor(Math.random() * 200) + 10;
            product.baseSku = this.generateSKU(brand, index);
        }

        return product;
    }

    generateProductTitle(category, brand) {
        const adjectives = [
            'Premium', 'Classic', 'Modern', 'Elegant', 'Stylish', 'Comfortable',
            'Durable', 'Lightweight', 'Professional', 'Casual', 'Vintage',
            'Luxury', 'Essential', 'Versatile', 'High-Performance', 'Innovative'
        ];

        const productTypes = {
            'Electronics': [
                'Smartphone', 'Laptop', 'Tablet', 'Headphones', 'Speaker', 'Camera',
                'Monitor', 'Keyboard', 'Mouse', 'Charger', 'Case', 'Stand'
            ],
            'Fashion & Apparel': [
                'T-Shirt', 'Jeans', 'Dress', 'Jacket', 'Sweater', 'Sneakers',
                'Boots', 'Handbag', 'Watch', 'Sunglasses', 'Belt', 'Scarf'
            ],
            'Home & Garden': [
                'Sofa', 'Chair', 'Table', 'Lamp', 'Rug', 'Mirror', 'Vase',
                'Cushion', 'Curtains', 'Plant Pot', 'Picture Frame', 'Clock'
            ],
            'Beauty & Personal Care': [
                'Lipstick', 'Foundation', 'Mascara', 'Perfume', 'Moisturizer',
                'Shampoo', 'Face Mask', 'Serum', 'Brush Set', 'Palette'
            ],
            'Sports & Outdoors': [
                'Running Shoes', 'Workout Shirt', 'Yoga Mat', 'Water Bottle',
                'Backpack', 'Tent', 'Sleeping Bag', 'Bike', 'Helmet', 'Gloves'
            ]
        };

        const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];

        // Find product types for this category
        let types = [];
        for (const [catName, catTypes] of Object.entries(productTypes)) {
            if (category.title.includes(catName) || category.pathNames?.includes(catName)) {
                types = catTypes;
                break;
            }
        }

        if (types.length === 0) {
            types = ['Product', 'Item', 'Accessory', 'Essential', 'Collection'];
        }

        const type = types[Math.floor(Math.random() * types.length)];

        return `${brand.title} ${adjective} ${type}`;
    }

    generateSlug(title, index) {
        return title
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-') + `-${index}`;
    }

    generateSummary(title, category) {
        const features = [
            'high-quality materials', 'modern design', 'excellent performance',
            'comfortable fit', 'durable construction', 'stylish appearance',
            'user-friendly', 'reliable performance', 'premium quality'
        ];

        const feature = features[Math.floor(Math.random() * features.length)];
        return `${title} featuring ${feature}. Perfect for ${category.title.toLowerCase()} enthusiasts.`;
    }

    generateDescription(title, category, brand) {
        const descriptions = [
            `Experience the perfect blend of style and functionality with this ${title}. Crafted by ${brand.title}, this premium product delivers exceptional quality and performance.`,

            `Discover the latest in ${category.title.toLowerCase()} innovation with this ${title}. ${brand.title} brings you cutting-edge design combined with superior craftsmanship.`,

            `Elevate your ${category.title.toLowerCase()} collection with this stunning ${title}. ${brand.title} has created a masterpiece that combines form and function beautifully.`,

            `This ${title} represents the pinnacle of ${brand.title}'s commitment to excellence. Designed for those who appreciate quality and attention to detail.`,

            `Transform your ${category.title.toLowerCase()} experience with this exceptional ${title}. ${brand.title} continues to set the standard for innovation and quality.`
        ];

        return descriptions[Math.floor(Math.random() * descriptions.length)];
    }

    /**
     * Generate product variants (Color, Size, etc.)
     * @param {Object} category - Product category
     * @param {Object} brand - Product brand
     * @returns {Array} Array of variants
     */
    generateVariants(category, brand) {
        // Random variant count between configured min and max
        const variantCount = Math.floor(
            Math.random() * (CONFIG.MAX_VARIANTS_PER_PRODUCT - CONFIG.MIN_VARIANTS_PER_PRODUCT + 1)
        ) + CONFIG.MIN_VARIANTS_PER_PRODUCT;

        const variants = [];

        // Get relevant variant types for this category
        let relevantTypes = this.variantTypes;
        if (category.title.includes('Fashion') || category.title.includes('Clothing')) {
            relevantTypes = this.variantTypes.filter(t => ['Color', 'Size', 'Material', 'Style'].includes(t.name));
        }

        const basePrice = this.generatePrice(category);

        for (let i = 0; i < variantCount; i++) {
            const colorType = this.variantTypes.find(t => t.name === 'Color');
            const sizeType = this.variantTypes.find(t => t.name === 'Size');

            const color = colorType?.options[Math.floor(Math.random() * colorType.options.length)];
            const size = sizeType?.options[Math.floor(Math.random() * sizeType.options.length)];

            const options = [];
            if (color) {
                options.push({
                    typeId: colorType._id,
                    typeName: colorType.name,
                    typeDisplayName: colorType.displayName,
                    optionId: color._id,
                    value: color.value,
                    displayValue: color.displayValue,
                    hexColor: color.hexColor
                });
            }
            if (size) {
                options.push({
                    typeId: sizeType._id,
                    typeName: sizeType.name,
                    typeDisplayName: sizeType.displayName,
                    optionId: size._id,
                    value: size.value,
                    displayValue: size.displayValue
                });
            }

            const priceVariation = (Math.random() - 0.5) * 0.2; // ±10%
            const variantPrice = Math.round(basePrice * (1 + priceVariation));

            const variantTitle = `${color?.displayValue || 'Standard'} ${size?.displayValue || ''}`.trim();

            variants.push({
                sku: this.generateVariantSKU(brand, i),
                displayName: variantTitle,
                price: variantPrice,
                discount: Math.random() > 0.8 ? Math.floor(Math.random() * 20) + 5 : 0,
                stock: Math.floor(Math.random() * 100) + 5,
                status: Math.random() > 0.05 ? 'active' : 'inactive',
                options,
                images: this.generateVariantImages()
            });
        }

        return variants;
    }

    generateImages() {
        // Extended Laravel product images array - ensuring exactly 3 unique images per product
        const availableImages = [
            'product_6889f81c489d0_0.webp', 'product_6889f81c5163c_1.webp', 'product_6889f81c59696_2.webp',
            'product_6889f81c616e8_3.webp', 'product_6889f81c6a225_4.webp', 'product_6889f9113eecd_0.webp',
            'product_6889f980ae308_0.webp', 'product_6889fd3e6fc02_0.webp', 'product_6889ff20a3003_0.webp',
            'product_6889ff20ab21f_1.webp', 'product_6889ff20b31b8_2.webp', 'product_688a005542712_0.webp',
            'product_688a0088c4999_0.webp', 'product_688a01254a8de_0.webp', 'product_688a02ff4c13c_0.webp',
            'product_688a03fbc0e23_0.webp', 'product_688aefd6b5d92_0.webp', 'product_688b3bcfd79b9_0.webp',
            'product_688b3d8672a03_0.webp', 'product_688b4fa2cea02_0.webp', 'product_688b4fa2d7cae_1.webp',
            'product_688b51b8ae4fd_0.webp', 'product_688b5e59765d5_0.webp', 'product_688b603325c06_0.webp',
            'product_688c3b3d8cd70_0.webp', 'product_688c51f279b9c_0.webp', 'product_688c9e1305a57_0.webp',
            'product_688c9e130e22d_1.webp', 'product_68909d01452d4_0.webp', 'product_68909d014e1e4_1.webp',
            'product_68909d015694f_2.webp', 'product_68909d015f199_3.webp', 'product_68909d0168d61_4.webp',
            'product_68909d0170766_5.webp', 'product_68909d017985c_6.webp', 'product_6892df81c7fe4_0.webp',
            'product_6892df81d0732_1.webp', 'product_6892fe3b5293e_0.webp', 'product_6892fe3b5ba1b_1.webp',
            'product_6892fea723299_0.webp', 'product_6892fea72bb51_1.webp', 'product_6892ffc4a0ae1_0.webp',
            'product_6892ffc4a8cea_1.webp', 'product_6892ffc4afd6d_2.webp', 'product_6893008bb8af3_0.webp',
            'product_6893008bc2ce2_1.webp', 'product_6893008bcb95a_2.webp', 'product_689300d5e7a6b_0.webp',
            'product_689300d5f0a7f_1.webp', 'product_689300d604793_2.webp', 'product_6893012f60da8_0.webp',
            'product_6893012f69029_1.webp', 'product_6893012f70d3d_2.webp', 'product_68e8d66387660_0.webp',
            'product_68e8d79a74aad_0.webp', 'product_6901faebb109b_0.webp', 'product_6901fe4b2da2d_0.webp',
            'product_69020083e3b75_0.webp', 'product_690200b244587_0.webp', 'product_690200b24efd9_1.webp',
            'product_690200b258067_2.webp', 'product_690200b260592_3.webp', 'product_690200b26771a_4.webp',
            'product_690200b270dd5_5.webp', 'product_690200b27a849_6.webp', 'product_690200b282a87_7.webp',
            'product_690200b28ab7d_8.webp', 'product_690200b292edf_9.webp', 'product_690200b29bf1e_10.webp',
            'product_690200b2a5137_11.webp', 'product_690200b2add93_12.webp', 'product_690200b2b62ac_13.webp',
            'product_690200b2be15d_14.webp', 'product_690200b2c79a1_15.webp', 'product_690200b2cfbe7_16.webp',
            'product_690200b2d807d_17.webp', 'product_690200b2dfc85_18.webp', 'product_690200b2e7ceb_19.webp',
            'product_690200b2f080e_20.webp', 'product_690200b304657_21.webp', 'product_690200b30c797_22.webp',
            'product_690200b3148d2_23.webp', 'product_690200b31d457_24.webp', 'product_6902e66def238_0.webp',
            'product_6916fb796e1cf_0.webp', 'product_6916fb7976898_1.webp', 'product_6916fb797f148_2.webp',
            'product_6916fb7988b27_3.webp', 'product_6916fb79924de_4.webp', 'product_6916fb799b66f_5.webp',
            'product_6916fb79a4837_6.webp', 'product_6916fb79aca8f_7.webp', 'product_6916fb79b5092_8.webp',
            'product_6916fb79bcee6_9.webp', 'product_6916fb79c4a1b_10.webp', 'product_6918108911028_0.webp',
            'product_691810891a090_1.webp', 'product_6918108922ac1_2.webp', 'product_691c290eb614e_0.webp',
            'product_691c290ebf328_1.webp', 'product_691c290ec705d_2.webp', 'product_691c2aae35e4f_0.webp',
            'product_691c2af8d44f1_0.webp', 'product_691c2b1cd942e_0.webp', 'product_691c2b1ce1ece_1.webp',
            'product_691c2b1cead4d_2.webp', 'product_691c2c5ef01bd_0.webp', 'product_691c2c5f04722_1.webp',
            'product_691c2da306125_3.webp', 'product_691c2dc9ed050_0.webp', 'product_691c2de03eef9_1.webp',
            'product_691c320b0ebab_0.webp', 'product_691c33d0c9c37_1.webp', 'product_691c33d0d2068_2.webp',
            'product_691c364e6c2ff_3.webp', 'product_6901fe4b2da2d_1.webp', 'product_690200b244587_2.webp',
            'product_691c33d0c9c37_3.webp', 'product_691c320b0ebab_2.webp', 'product_691c2da306125_4.webp'
        ];

        // Always return exactly 3 unique images
        const shuffledImages = [...availableImages].sort(() => 0.5 - Math.random());
        const selectedImages = shuffledImages.slice(0, 3);

        const images = [];
        for (let i = 0; i < 3; i++) {
            images.push({
                path: `/images/products/${selectedImages[i]}`,
                altText: `Product image ${i + 1}`,
                isPrimary: i === 0,
                sortOrder: i
            });
        }

        return images;
    }

    generateVariantImages() {
        // Extended Laravel variant images array - ensuring exactly 3 images per variant
        const availableVariantImages = [
            'variant_68e8c429cdc68_0.webp', 'variant_68e8c67d53c28_0.webp', 'variant_68e8c73e05444_0.webp',
            'variant_68e8c824a9cf7_0.webp', 'variant_68e8ca99af65f_0.webp', 'variant_68e8cdbf8f7b7_0.webp',
            'variant_68e8cf3d223f7_0.webp', 'variant_68e8cfdb27714_0.webp', 'variant_68e8d02251456_0.webp',
            'variant_68e8d04846afc_0.webp', 'variant_68e8d10d7ef24_0.webp', 'variant_68e8d2a66ff27_0.webp',
            'variant_68e8d3848c5eb_0.webp', 'variant_68e8d467679cf_0.webp', 'variant_68e8d46771062_1.webp',
            'variant_68e8d46779626_2.webp', 'variant_68e8d53a7c3af_0.webp', 'variant_68ec8d7cd47f3_1.webp',
            'variant_68ececa9e9fb8_0.webp', 'variant_68ececa9f2ee2_1.webp', 'variant_68ececaa11db9_0.webp',
            'variant_68ececaa1abba_1.webp', 'variant_68ececaa2565a_2.webp', 'variant_68ececaa33d4d_0.webp',
            'variant_68ececaa42765_0.webp', 'variant_68ececaa4bcec_1.webp', 'variant_68edfabeda8af_0.webp',
            'variant_6901f4c839cad_0.webp', 'variant_6901f4c841ab6_1.webp', 'variant_6901f4c849376_2.webp',
            'variant_6901f4c85d109_0.webp', 'variant_6901f4c864a76_1.webp', 'variant_6901f4c86c824_2.webp',
            'variant_6901f4c876678_3.webp', 'variant_6901f4c87e9c8_4.webp', 'variant_6901f4c88c5aa_0.webp',
            'variant_6901f4c893147_1.webp', 'variant_6901f4c89e529_0.webp', 'variant_6901f4c8a616e_1.webp',
            'variant_6901f4c8addeb_2.webp', 'variant_690201b061c8f_0.webp', 'variant_690201d1267f3_0.webp',
            'variant_6902021a2cec0_0.webp', 'variant_69020281e822d_0.webp', 'variant_690202b9629f4_0.webp',
            'variant_690204516e31f_0.webp', 'variant_6902e6f9d2fd1_0.webp', 'variant_6902eba45bd69_0.webp',
            'variant_69031fe530b80_0.webp', 'variant_69031fe53b9d9_1.webp', 'variant_69031fe544ce7_2.webp',
            'variant_68ececa9e9fb8_2.webp', 'variant_68ececaa11db9_3.webp', 'variant_68e8c67d53c28_3.webp',
            'variant_6901f4c839cad_3.webp', 'variant_690201b061c8f_3.webp', 'variant_6902e6f9d2fd1_3.webp'
        ];

        // Always return exactly 3 images for variants
        const shuffledImages = [...availableVariantImages].sort(() => 0.5 - Math.random());
        const selectedImages = shuffledImages.slice(0, 3);

        const images = [];
        for (let i = 0; i < 3; i++) {
            images.push({
                path: `/images/products/variants/${selectedImages[i]}`,
                altText: `Variant image ${i + 1}`,
                isPrimary: i === 0,
                sortOrder: i
            });
        }

        return images;
    }

    generateTags(category, brand) {
        const commonTags = [
            'new', 'popular', 'trending', 'bestseller', 'limited-edition',
            'premium', 'eco-friendly', 'handmade', 'imported', 'sale'
        ];

        const categoryTags = category.title.toLowerCase().split(' ').filter(word => word.length > 2);
        const brandTags = [brand.slug];

        const allTags = [...commonTags, ...categoryTags, ...brandTags];
        const tagCount = Math.floor(Math.random() * 5) + 2;

        return this.getRandomItems(allTags, tagCount);
    }

    generateKeywords(title, category, brand) {
        const words = [
            ...title.toLowerCase().split(' '),
            ...category.title.toLowerCase().split(' '),
            brand.title.toLowerCase()
        ].filter(word => word.length > 2);

        return [...new Set(words)].join(', ');
    }

    generatePrice(category) {
        const priceRanges = {
            'Electronics': { min: 50, max: 2000 },
            'Fashion & Apparel': { min: 20, max: 500 },
            'Home & Garden': { min: 25, max: 1000 },
            'Beauty & Personal Care': { min: 10, max: 200 },
            'Sports & Outdoors': { min: 15, max: 800 }
        };

        let range = { min: 20, max: 300 }; // default

        for (const [catName, catRange] of Object.entries(priceRanges)) {
            if (category.title.includes(catName) || category.pathNames?.includes(catName)) {
                range = catRange;
                break;
            }
        }

        return Math.floor(Math.random() * (range.max - range.min) + range.min);
    }

    generateSKU(brand, index) {
        const prefix = brand.title.substring(0, 3).toUpperCase();
        const number = String(index).padStart(6, '0');
        return `${prefix}-${number}`;
    }

    generateVariantSKU(brand, variantIndex) {
        const prefix = brand.title.substring(0, 3).toUpperCase();
        const number = String(Date.now() + variantIndex).slice(-8);
        return `${prefix}-V${number}`;
    }

    generateRatingDistribution() {
        const total = Math.floor(Math.random() * 1000) + 50;

        // Bias towards higher ratings
        const dist = {
            1: Math.floor(total * (Math.random() * 0.05)),
            2: Math.floor(total * (Math.random() * 0.05)),
            3: Math.floor(total * (Math.random() * 0.15)),
            4: Math.floor(total * (Math.random() * 0.35 + 0.2)),
            5: 0
        };

        dist[5] = total - (dist[1] + dist[2] + dist[3] + dist[4]);

        return dist;
    }

    generateRandomDate() {
        const start = new Date(2023, 0, 1);
        const end = new Date();
        return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
    }

    getRandomCondition() {
        const conditions = ['default', 'new', 'hot'];
        const weights = [0.6, 0.3, 0.1]; // 60% default, 30% new, 10% hot

        const random = Math.random();
        let sum = 0;

        for (let i = 0; i < conditions.length; i++) {
            sum += weights[i];
            if (random <= sum) {
                return conditions[i];
            }
        }

        return 'new';
    }

    getRandomStatus() {
        return Math.random() > 0.05 ? 'active' : 'inactive'; // 95% active
    }

    getRandomCategory() {
        // Prefer leaf categories (categories without children)
        const leafCategories = this.categories.filter(cat =>
            !this.categories.some(otherCat => otherCat.parent?.toString() === cat._id.toString())
        );

        if (leafCategories.length > 0) {
            return leafCategories[Math.floor(Math.random() * leafCategories.length)];
        }

        return this.categories[Math.floor(Math.random() * this.categories.length)];
    }

    getRandomBrand() {
        return this.brands[Math.floor(Math.random() * this.brands.length)];
    }

    getRandomItems(array, count) {
        const shuffled = [...array].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, count);
    }
}

export const productSeeder = new ProductSeeder();