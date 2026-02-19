#!/usr/bin/env node

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { databaseSeeder } from '../src/seeders/DatabaseSeeder.js';
import { logger } from '../src/utils/logger.js';

dotenv.config();

const args = process.argv.slice(2);
const options = {};
let isProductionPreset = false;

for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--products' && args[i + 1]) {
        options.products = parseInt(args[i + 1], 10);
        i++;
    } else if (arg === '--categories' && args[i + 1]) {
        options.categories = parseInt(args[i + 1], 10);
        i++;
    } else if (arg === '--brands' && args[i + 1]) {
        options.brands = parseInt(args[i + 1], 10);
        i++;
    } else if (arg === '--banners' && args[i + 1]) {
        options.banners = parseInt(args[i + 1], 10);
        i++;
    } else if (arg === '--users' && args[i + 1]) {
        options.users = parseInt(args[i + 1], 10);
        i++;
    } else if (arg === '--variant-types' && args[i + 1]) {
        options.variantTypes = parseInt(args[i + 1], 10);
        i++;
    } else if (arg === '--clear-existing') {
        options.clearExisting = true;
    } else if (arg === '--no-clear-existing') {
        options.clearExisting = false;
    } else if (arg === '--minimal') {
        options.products = 10;
        options.categories = 10;
        options.brands = 10;
        options.banners = 10;
        options.users = 10;
        options.variantTypes = 10;
    } else if (arg === '--development') {
        options.products = 1000;
        options.categories = 25;
        options.brands = 25;
        options.banners = 20;
        options.users = 100;
        options.variantTypes = 10;
    } else if (arg === '--production') {
        options.products = 100000;
        options.categories = 250;
        options.brands = 250;
        options.banners = 100;
        options.users = 10000;
        options.variantTypes = 10;
        isProductionPreset = true;
    } else if (arg === '--unsafe-production') {
        options.unsafeProduction = true;
    } else if (arg === '--skip-categories') {
        options.skipCategories = true;
    } else if (arg === '--skip-brands') {
        options.skipBrands = true;
    } else if (arg === '--skip-banners') {
        options.skipBanners = true;
    } else if (arg === '--skip-products') {
        options.skipProducts = true;
    } else if (arg === '--skip-users') {
        options.skipUsers = true;
    } else if (arg === '--skip-variant-types') {
        options.skipVariantTypes = true;
    } else if (arg === '--help') {
        showHelp();
        process.exit(0);
    }
}

const PRODUCTION_SAFE_LIMITS = {
    products: 200000,
    categories: 1000,
    brands: 1000,
    banners: 500,
    users: 100000,
    variantTypes: 100,
};

const applyProductionSafetyGuards = () => {
    if (!isProductionPreset || options.unsafeProduction) return;

    Object.entries(PRODUCTION_SAFE_LIMITS).forEach(([key, max]) => {
        const value = Number(options[key]);
        if (!Number.isFinite(value) || value <= 0) return;
        if (value > max) {
            logger.warn(`Safety guard: clamped "${key}" from ${value} to ${max}. Use --unsafe-production to bypass.`);
            options[key] = max;
        }
    });
};

applyProductionSafetyGuards();

function showHelp() {
    logger.info(`
Enterprise E-commerce Database Seeder

Usage: npm run seed [options]

Options:
  --products <number>       Number of products to create (default: 10)
  --categories <number>     Number of categories to create (default: 10)
  --brands <number>         Number of brands to create (default: 10)
  --banners <number>        Number of banners to create (default: 10)
  --users <number>          Number of users to create (default: 10)
  --variant-types <number>  Number of variant types to create (default: 10)

  --clear-existing          Clear existing catalog data before seeding
  --no-clear-existing       Keep existing data and append new records

  --minimal                 10 records each (categories/brands/banners/products/users)
  --development             Development setup
  --production              Production setup
  --unsafe-production       Allow production counts above safety limits

  --skip-categories         Skip category creation
  --skip-brands             Skip brand creation
  --skip-banners            Skip banner creation
  --skip-products           Skip product creation
  --skip-users              Skip user creation
  --skip-variant-types      Skip variant type/option creation

  --help                    Show this help message

Examples:
  npm run seed
  npm run seed -- --minimal
  npm run seed -- --products 10 --categories 10 --brands 10 --banners 10 --variant-types 10
  npm run seed -- --skip-users
  npm run seed -- --production --unsafe-production
`);
}

async function connectToDatabase() {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/enterprise-ecommerce';

    logger.info(`Connecting to MongoDB: ${mongoUri.replace(/\/\/.*@/, '//***@')}`);

    try {
        await mongoose.connect(mongoUri, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        });

        logger.info('Connected to MongoDB successfully');
        logger.info(`Database: ${mongoose.connection.name}`);
        logger.info(`Host: ${mongoose.connection.host}:${mongoose.connection.port}\n`);
    } catch (error) {
        console.error('Failed to connect to MongoDB:', error.message);
        process.exit(1);
    }
}

async function main() {
    logger.info('Enterprise E-commerce Database Seeder');
    logger.info('='.repeat(50));

    try {
        await connectToDatabase();
        await databaseSeeder.run(options);
        logger.info('\nSeeding completed successfully');
    } catch (error) {
        console.error('\nSeeding failed:', error);
        console.error('Stack trace:', error.stack);
        process.exit(1);
    } finally {
        await mongoose.connection.close();
        logger.info('Database connection closed');
    }
}

process.on('SIGINT', async () => {
    logger.info('\nReceived SIGINT. Gracefully shutting down...');

    if (mongoose.connection.readyState !== 0) {
        await mongoose.connection.close();
    }

    process.exit(0);
});

process.on('SIGTERM', async () => {
    logger.info('\nReceived SIGTERM. Gracefully shutting down...');

    if (mongoose.connection.readyState !== 0) {
        await mongoose.connection.close();
    }

    process.exit(0);
});

main();
