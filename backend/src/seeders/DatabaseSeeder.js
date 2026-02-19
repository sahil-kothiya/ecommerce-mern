import { logger } from '../utils/logger.js';

import { catalogSeeder } from './CatalogSeeder.js';
import { UserSeeder } from './UserSeeder.js';
import { variantSeeder } from './VariantSeeder.js';
import mongoose from 'mongoose';

export class DatabaseSeeder {
    constructor() {
        this.startTime = null;
    }

    async run(options = {}) {
        this.startTime = Date.now();
        logger.info('Starting complete database seeding...\n');

        const {
            products = 10,
            categories = 10,
            brands = 10,
            banners = 10,
            users = 10,
            variantTypes = 10,
            clearExisting = true,
            skipCategories = false,
            skipBrands = false,
            skipBanners = false,
            skipProducts = false,
            skipUsers = false,
            skipVariantTypes = false,
        } = options;

        try {
            await this.ensureConnection();

            logger.info('Phase 1: Seeding catalog entities...');
            await catalogSeeder.run({
                clearExisting,
                categories: {
                    enabled: !skipCategories,
                    count: categories,
                },
                brands: {
                    enabled: !skipBrands,
                    count: brands,
                },
                banners: {
                    enabled: !skipBanners,
                    count: banners,
                },
                products: {
                    enabled: !skipProducts,
                    count: products,
                },
            });
            this.logPhaseCompletion('Phase 1');

            if (!skipUsers) {
                logger.info('Phase 2: Creating users...');
                const userSeeder = new UserSeeder();
                await userSeeder.run(users);
                this.logPhaseCompletion('Phase 2');
            }

            if (!skipVariantTypes) {
                logger.info('Phase 3: Creating variant types and options...');
                await variantSeeder.run({
                    clearExisting,
                    count: variantTypes,
                    optionsPerType: 5,
                });
                this.logPhaseCompletion('Phase 3');
            }

            logger.info('Phase 4: Final optimization...');
            await this.createIndexes();
            await this.updateStats();
            this.logPhaseCompletion('Phase 4');

            this.logFinalSummary();
        } catch (error) {
            console.error('Database seeding failed:', error);
            throw error;
        }
    }

    async ensureConnection() {
        if (mongoose.connection.readyState === 0) {
            logger.info('Connecting to database...');
            throw new Error('Database connection not established. Please connect to MongoDB first.');
        }
        logger.info('Database connection verified');
    }

    async createIndexes() {
        logger.info('Creating additional indexes...');

        const { Product, Category, Brand, User, Order, Cart, VariantType, VariantOption } = mongoose.models;

        try {
            await Product.collection.createIndex({ 'category.id': 1, status: 1 });
            await Product.collection.createIndex({ 'brand.id': 1, status: 1 });
            await Product.collection.createIndex({ basePrice: 1, status: 1 });
            await Product.collection.createIndex({ isFeatured: 1, status: 1 });
            await Product.collection.createIndex({ tags: 1, status: 1 });
            await Product.collection.createIndex({ 'ratings.average': -1, status: 1 });
            await Product.collection.createIndex({ salesCount: -1, status: 1 });
            await Product.collection.createIndex({ viewCount: -1 });

            await Category.collection.createIndex({ parentId: 1, sortOrder: 1 });
            await Category.collection.createIndex({ level: 1, status: 1 });

            if (User) {
                await User.collection.createIndex({ email: 1 }, { unique: true });
                await User.collection.createIndex({ status: 1 });
            }

            if (Order) {
                await Order.collection.createIndex({ userId: 1, status: 1 });
                await Order.collection.createIndex({ orderNumber: 1 }, { unique: true });
                await Order.collection.createIndex({ createdAt: -1 });
            }

            if (Cart) {
                await Cart.collection.createIndex({ userId: 1, productId: 1, variantId: 1 }, { unique: true });
                await Cart.collection.createIndex({ userId: 1, createdAt: -1 });
            }

            if (VariantType) {
                await VariantType.collection.createIndex({ name: 1 }, { unique: true });
                await VariantType.collection.createIndex({ status: 1, sortOrder: 1 });
            }

            if (VariantOption) {
                await VariantOption.collection.createIndex({ variantTypeId: 1, value: 1 }, { unique: true });
                await VariantOption.collection.createIndex({ variantTypeId: 1, status: 1, sortOrder: 1 });
            }

            logger.info('Additional indexes created');
        } catch (error) {
            console.warn('Some indexes may already exist:', error.message);
        }
    }

    async updateStats() {
        logger.info('Updating statistics...');

        const { Product, Category, Brand } = mongoose.models;

        try {
            const categories = await Category.find();

            for (const category of categories) {
                const productsCount = await Product.countDocuments({
                    'category.id': category._id,
                    status: 'active',
                });

                await Category.updateOne(
                    { _id: category._id },
                    { $set: { productsCount } }
                );
            }

            const brands = await Brand.find();

            for (const brand of brands) {
                const productCount = await Product.countDocuments({
                    'brand.id': brand._id,
                    status: 'active',
                });

                await Brand.updateOne(
                    { _id: brand._id },
                    { $set: { productCount } }
                );
            }

            logger.info('Statistics updated');
        } catch (error) {
            console.warn('Statistics update failed:', error.message);
        }
    }

    logPhaseCompletion(phase) {
        const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(1);
        logger.info(`${phase} completed in ${elapsed}s\n`);
    }

    logFinalSummary() {
        const totalTime = ((Date.now() - this.startTime) / 1000).toFixed(1);

        logger.info('\nDATABASE SEEDING COMPLETED');
        logger.info('='.repeat(50));
        logger.info(`Total time: ${totalTime}s`);
        logger.info(`Database: ${mongoose.connection.name}`);
        logger.info(`Connection: ${mongoose.connection.host}:${mongoose.connection.port}`);
        logger.info('='.repeat(50));
    }

    async seedMinimal() {
        logger.info('Running minimal seed (10 categories/brands/banners/products)...');

        await this.run({
            products: 10,
            categories: 10,
            brands: 10,
            banners: 10,
            users: 10,
            variantTypes: 10,
            skipUsers: false,
            skipVariantTypes: false,
        });
    }

    async seedDevelopment() {
        logger.info('Running development seed...');

        await this.run({
            products: 1000,
            categories: 25,
            brands: 25,
            banners: 20,
            users: 100,
            variantTypes: 10,
        });
    }

    async seedProduction() {
        logger.info('Running production seed...');

        await this.run({
            products: 100000,
            categories: 250,
            brands: 250,
            banners: 100,
            users: 10000,
            variantTypes: 10,
        });
    }

    async seedOnlyProducts(count = 1000) {
        logger.info(`Seeding only ${count.toLocaleString()} products...`);

        await this.run({
            products: count,
            skipCategories: true,
            skipBrands: true,
            skipBanners: true,
            skipUsers: true,
            skipVariantTypes: true,
            clearExisting: false,
        });
    }

    async reseedProducts(count = 10000) {
        logger.info(`Re-seeding ${count.toLocaleString()} products...`);

        const { Product } = mongoose.models;
        await Product.deleteMany({});
        logger.info('Existing products cleared');

        await this.seedOnlyProducts(count);
    }
}

export const databaseSeeder = new DatabaseSeeder();

export const seedMinimal = () => databaseSeeder.seedMinimal();
export const seedDevelopment = () => databaseSeeder.seedDevelopment();
export const seedProduction = () => databaseSeeder.seedProduction();
export const reseedProducts = (count) => databaseSeeder.reseedProducts(count);
