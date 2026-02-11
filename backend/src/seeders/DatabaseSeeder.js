import { categoryBrandVariantBaseSeeder } from './CategoryBrandVariantBaseSeeder.js';
import { productSeeder } from './ProductSeeder.js';
import { UserSeeder } from './UserSeeder.js';
import mongoose from 'mongoose';

export class DatabaseSeeder {
    constructor() {
        this.startTime = null;
    }

    async run(options = {}) {
        this.startTime = Date.now();
        console.log('🚀 Starting complete database seeding...\n');

        const {
            products = 10000,
            users = 1000,
            skipCategories = false,
            skipBrands = false,
            skipProducts = false,
            skipUsers = false
        } = options;

        try {
            // Ensure database connection
            await this.ensureConnection();

            // Step 1: Create base categories, brands, and variant types
            if (!skipCategories && !skipBrands) {
                console.log('🏗️  Phase 1: Setting up categories, brands, and variant types...');
                await categoryBrandVariantBaseSeeder.run();
                this.logPhaseCompletion('Phase 1');
            }

            // Step 2: Create products
            if (!skipProducts) {
                console.log('🛍️  Phase 2: Creating products...');
                await productSeeder.run(products);
                this.logPhaseCompletion('Phase 2');
            }

            // Step 3: Create users
            if (!skipUsers) {
                console.log('👥 Phase 3: Creating users...');
                const userSeeder = new UserSeeder();
                await userSeeder.run(users);
                this.logPhaseCompletion('Phase 3');
            }

            // Step 4: Additional setup (indexes, etc.)
            console.log('⚙️  Phase 4: Final optimization...');
            await this.createIndexes();
            await this.updateStats();
            this.logPhaseCompletion('Phase 4');

            this.logFinalSummary();

        } catch (error) {
            console.error('❌ Database seeding failed:', error);
            throw error;
        }
    }

    async ensureConnection() {
        if (mongoose.connection.readyState === 0) {
            console.log('🔌 Connecting to database...');
            // Connection should be established in your main app
            throw new Error('Database connection not established. Please connect to MongoDB first.');
        }
        console.log('✅ Database connection verified');
    }

    async createIndexes() {
        console.log('📇 Creating additional indexes...');

        const { Product, Category, Brand, User, Order, Cart } = mongoose.models;

        try {
            // Product indexes for performance
            await Product.collection.createIndex({ 'category.id': 1, status: 1 });
            await Product.collection.createIndex({ 'brand.id': 1, status: 1 });
            await Product.collection.createIndex({ basePrice: 1, status: 1 });
            await Product.collection.createIndex({ isFeatured: 1, status: 1 });
            await Product.collection.createIndex({ tags: 1, status: 1 });
            await Product.collection.createIndex({ 'ratings.average': -1, status: 1 });
            await Product.collection.createIndex({ salesCount: -1, status: 1 });
            await Product.collection.createIndex({ viewCount: -1 });

            // Category indexes
            await Category.collection.createIndex({ parent: 1, position: 1 });
            await Category.collection.createIndex({ level: 1, status: 1 });

            // User indexes
            if (User) {
                await User.collection.createIndex({ email: 1 }, { unique: true });
                await User.collection.createIndex({ status: 1 });
            }

            // Order indexes  
            if (Order) {
                await Order.collection.createIndex({ user: 1, status: 1 });
                await Order.collection.createIndex({ orderNumber: 1 }, { unique: true });
                await Order.collection.createIndex({ createdAt: -1 });
            }

            // Cart indexes
            if (Cart) {
                await Cart.collection.createIndex({ user: 1, status: 1 });
                await Cart.collection.createIndex({ sessionId: 1, status: 1 });
            }

            console.log('✅ Additional indexes created');

        } catch (error) {
            console.warn('⚠️  Some indexes may already exist:', error.message);
        }
    }

    async updateStats() {
        console.log('📊 Updating statistics...');

        const { Product, Category, Brand } = mongoose.models;

        try {
            // Update category product counts
            const categories = await Category.find();

            for (const category of categories) {
                const productCount = await Product.countDocuments({
                    'category.id': category._id,
                    status: 'active'
                });

                await Category.updateOne(
                    { _id: category._id },
                    { $set: { productCount } }
                );
            }

            // Update brand product counts
            const brands = await Brand.find();

            for (const brand of brands) {
                const productCount = await Product.countDocuments({
                    'brand.id': brand._id,
                    status: 'active'
                });

                await Brand.updateOne(
                    { _id: brand._id },
                    { $set: { productCount } }
                );
            }

            console.log('✅ Statistics updated');

        } catch (error) {
            console.warn('⚠️  Statistics update failed:', error.message);
        }
    }

    logPhaseCompletion(phase) {
        const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(1);
        console.log(`✅ ${phase} completed in ${elapsed}s\n`);
    }

    logFinalSummary() {
        const totalTime = ((Date.now() - this.startTime) / 1000).toFixed(1);

        console.log('\n🎉 DATABASE SEEDING COMPLETED! 🎉');
        console.log('═'.repeat(50));
        console.log(`⏱️  Total time: ${totalTime}s`);
        console.log(`🗄️  Database: ${mongoose.connection.name}`);
        console.log(`🔗 Connection: ${mongoose.connection.host}:${mongoose.connection.port}`);
        console.log('\n📈 Your e-commerce database is ready for action!');
        console.log('═'.repeat(50));
    }

    // Utility methods for specific seeding scenarios

    async seedMinimal() {
        console.log('🏃‍♂️ Running minimal seed (categories, brands, 100 products)...');

        await this.run({
            products: 100,
            users: 50,
            skipUsers: false
        });
    }

    async seedDevelopment() {
        console.log('🛠️  Running development seed (1K products)...');

        await this.run({
            products: 1000,
            users: 100
        });
    }

    async seedProduction() {
        console.log('🏭 Running production seed (10M products)...');

        await this.run({
            products: 10000000,
            users: 10000
        });
    }

    async seedOnlyProducts(count = 1000) {
        console.log(`🛍️  Seeding only ${count.toLocaleString()} products...`);

        await this.run({
            products: count,
            skipCategories: true,
            skipBrands: true,
            skipUsers: true
        });
    }

    async reseedProducts(count = 10000) {
        console.log(`🔄 Re-seeding ${count.toLocaleString()} products...`);

        // Clear existing products
        const { Product } = mongoose.models;
        await Product.deleteMany({});
        console.log('🧹 Existing products cleared');

        await this.seedOnlyProducts(count);
    }
}

// Export singleton instance
export const databaseSeeder = new DatabaseSeeder();

// Export convenience functions
export const seedMinimal = () => databaseSeeder.seedMinimal();
export const seedDevelopment = () => databaseSeeder.seedDevelopment();
export const seedProduction = () => databaseSeeder.seedProduction();
export const reseedProducts = (count) => databaseSeeder.reseedProducts(count);