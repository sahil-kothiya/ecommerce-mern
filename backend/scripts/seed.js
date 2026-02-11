#!/usr/bin/env node

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { databaseSeeder } from '../src/seeders/DatabaseSeeder.js';

// Load environment variables
dotenv.config();

// Parse command line arguments
const args = process.argv.slice(2);
const options = {};

// Parse command line options
for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--products' && args[i + 1]) {
        options.products = parseInt(args[i + 1]);
        i++; // Skip next argument
    } else if (arg === '--users' && args[i + 1]) {
        options.users = parseInt(args[i + 1]);
        i++; // Skip next argument
    } else if (arg === '--minimal') {
        options.products = 100;
        options.users = 50;
    } else if (arg === '--development') {
        options.products = 1000;
        options.users = 100;
    } else if (arg === '--production') {
        options.products = 10000000;
        options.users = 10000;
    } else if (arg === '--skip-categories') {
        options.skipCategories = true;
    } else if (arg === '--skip-brands') {
        options.skipBrands = true;
    } else if (arg === '--skip-products') {
        options.skipProducts = true;
    } else if (arg === '--skip-users') {
        options.skipUsers = true;
    } else if (arg === '--help') {
        showHelp();
        process.exit(0);
    }
}

function showHelp() {
    console.log(`
🌱 Enterprise E-commerce Database Seeder

Usage: npm run seed [options]

Options:
  --products <number>     Number of products to create (default: 10000)
  --users <number>        Number of users to create (default: 1000)
  
  --minimal              Quick setup (100 products, 50 users)
  --development          Development setup (1K products, 100 users)  
  --production           Production setup (10M products, 10K users)
  
  --skip-categories      Skip creating categories and brands
  --skip-brands          Skip creating brands
  --skip-products        Skip creating products
  --skip-users           Skip creating users
  
  --help                 Show this help message

Examples:
  npm run seed                           # Default seeding
  npm run seed -- --minimal              # Quick minimal setup
  npm run seed -- --products 5000        # Create 5000 products
  npm run seed -- --skip-users           # Skip user creation
  npm run seed -- --development          # Development environment
  
Database Connection:
  Uses MONGODB_URI environment variable
  Default: mongodb://localhost:27017/enterprise-ecommerce
`);
}

async function connectToDatabase() {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/enterprise-ecommerce';

    console.log(`🔌 Connecting to MongoDB: ${mongoUri.replace(/\/\/.*@/, '//***@')}`);

    try {
        await mongoose.connect(mongoUri, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        });

        console.log('✅ Connected to MongoDB successfully');
        console.log(`📊 Database: ${mongoose.connection.name}`);
        console.log(`🏠 Host: ${mongoose.connection.host}:${mongoose.connection.port}\n`);

    } catch (error) {
        console.error('❌ Failed to connect to MongoDB:', error.message);
        process.exit(1);
    }
}

async function main() {
    console.log('🚀 Enterprise E-commerce Database Seeder');
    console.log('═'.repeat(50));

    try {
        // Connect to database
        await connectToDatabase();

        // Run seeding
        await databaseSeeder.run(options);

        console.log('\n🎉 Seeding completed successfully!');

    } catch (error) {
        console.error('\n❌ Seeding failed:', error);
        console.error('Stack trace:', error.stack);
        process.exit(1);
    } finally {
        // Close database connection
        await mongoose.connection.close();
        console.log('🔌 Database connection closed');
    }
}

// Handle process termination gracefully
process.on('SIGINT', async () => {
    console.log('\n\n⚠️  Received SIGINT. Gracefully shutting down...');

    if (mongoose.connection.readyState !== 0) {
        await mongoose.connection.close();
    }

    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\n\n⚠️  Received SIGTERM. Gracefully shutting down...');

    if (mongoose.connection.readyState !== 0) {
        await mongoose.connection.close();
    }

    process.exit(0);
});

// Run the seeder
main();