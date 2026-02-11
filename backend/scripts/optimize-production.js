/**
 * @fileoverview Production Optimization Script
 * @description Verifies and optimizes database for 10M+ products
 * @author Enterprise E-Commerce Team
 * @version 2.0.0
 */

import mongoose from 'mongoose';
import { config } from '../src/config/index.js';
import { Product } from '../src/models/Product.js';
import { Category } from '../src/models/Category.js';
import { logger } from '../src/utils/logger.js';

const MONGODB_URI = config.mongodbUri;

/**
 * Check and build indexes
 */
async function buildIndexes() {
    console.log('\n📊 Building database indexes...\n');

    try {
        // Get all models
        const models = [
            { name: 'Product', model: Product },
            { name: 'Category', model: Category }
        ];

        for (const { name, model } of models) {
            console.log(`\n🔍 Checking ${name} indexes...`);

            // Get existing indexes
            const existingIndexes = await model.collection.indexes();
            console.log(`   Found ${existingIndexes.length} existing indexes`);

            // Build indexes
            console.log(`   Building indexes for ${name}...`);
            await model.createIndexes();

            // Get updated indexes
            const updatedIndexes = await model.collection.indexes();
            console.log(`   ✅ ${name} now has ${updatedIndexes.length} indexes`);

            // Show index names
            updatedIndexes.forEach(idx => {
                const keys = Object.keys(idx.key).join(', ');
                console.log(`      - ${idx.name}: ${keys}`);
            });
        }

        console.log('\n✅ All indexes built successfully!\n');

    } catch (error) {
        console.error('\n❌ Error building indexes:', error.message);
        throw error;
    }
}

/**
 * Analyze database performance
 */
async function analyzePerformance() {
    console.log('\n📈 Analyzing database performance...\n');

    try {
        // Get collection stats
        const productStats = await Product.collection.stats();
        const categoryStats = await Category.collection.stats();

        console.log('Product Collection Stats:');
        console.log(`   Documents: ${productStats.count.toLocaleString()}`);
        console.log(`   Size: ${(productStats.size / 1024 / 1024).toFixed(2)} MB`);
        console.log(`   Storage: ${(productStats.storageSize / 1024 / 1024).toFixed(2)} MB`);
        console.log(`   Avg Document Size: ${(productStats.avgObjSize / 1024).toFixed(2)} KB`);
        console.log(`   Indexes: ${productStats.nindexes}`);
        console.log(`   Index Size: ${(productStats.totalIndexSize / 1024 / 1024).toFixed(2)} MB`);

        console.log('\nCategory Collection Stats:');
        console.log(`   Documents: ${categoryStats.count.toLocaleString()}`);
        console.log(`   Size: ${(categoryStats.size / 1024 / 1024).toFixed(2)} MB`);

        // Index usage statistics
        console.log('\n📊 Index Usage Statistics:');
        const indexStats = await Product.collection.aggregate([
            { $indexStats: {} }
        ]).toArray();

        indexStats.forEach(stat => {
            console.log(`\n   Index: ${stat.name}`);
            console.log(`   Operations: ${stat.accesses.ops}`);
            console.log(`   Since: ${new Date(stat.accesses.since).toLocaleString()}`);
        });

        console.log('\n✅ Performance analysis complete!\n');

    } catch (error) {
        console.error('\n❌ Error analyzing performance:', error.message);
    }
}

/**
 * Check for slow queries
 */
async function checkSlowQueries() {
    console.log('\n🐌 Checking for slow queries...\n');

    try {
        // Enable profiling
        await mongoose.connection.db.setProfilingLevel(1, { slowms: 100 });

        console.log('✅ Profiling enabled for queries slower than 100ms');
        console.log('   Run your application and check system.profile collection');
        console.log('   Command: db.system.profile.find().sort({ ts: -1 }).limit(10)\n');

    } catch (error) {
        console.error('❌ Error setting up profiling:', error.message);
    }
}

/**
 * Recommendations
 */
function showRecommendations(productCount) {
    console.log('\n💡 Production Recommendations:\n');

    if (productCount > 1000000) {
        console.log('   ⚠️  Large dataset detected (1M+ products)');
        console.log('   → Enable Redis caching immediately');
        console.log('   → Use cursor-based pagination');
        console.log('   → Consider database sharding');
        console.log('');
    }

    console.log('   ✅ Connection Pool: Set maxPoolSize to 100');
    console.log('   ✅ Compression: Enable zlib compression');
    console.log('   ✅ Read Preference: Use secondaryPreferred');
    console.log('   ✅ Auto Index: Set to false in production');
    console.log('   ✅ Query Optimization: Use lean() and projection');
    console.log('   ✅ Monitoring: Setup MongoDB Atlas or Ops Manager');
    console.log('');
}

/**
 * Main execution
 */
async function main() {
    console.log('═'.repeat(60));
    console.log('   🚀 Production Optimization Script for 10M+ Products');
    console.log('═'.repeat(60));

    try {
        // Connect to database
        console.log('\n🔌 Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI, {
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 5000
        });
        console.log('✅ Connected to MongoDB\n');

        // Get current counts
        const productCount = await Product.countDocuments();
        const categoryCount = await Category.countDocuments();

        console.log(`📦 Current Data:`);
        console.log(`   Products: ${productCount.toLocaleString()}`);
        console.log(`   Categories: ${categoryCount.toLocaleString()}`);

        // Build indexes
        await buildIndexes();

        // Analyze performance
        await analyzePerformance();

        // Check slow queries
        await checkSlowQueries();

        // Show recommendations
        showRecommendations(productCount);

        console.log('═'.repeat(60));
        console.log('   ✅ Optimization Complete!');
        console.log('═'.repeat(60));
        console.log('\nNext steps:');
        console.log('  1. Review PRODUCTION_GUIDE.md');
        console.log('  2. Setup Redis caching');
        console.log('  3. Configure monitoring');
        console.log('  4. Enable compression');
        console.log('  5. Test with load testing tools\n');

    } catch (error) {
        console.error('\n❌ Fatal error:', error.message);
        console.error(error.stack);
        process.exit(1);
    } finally {
        await mongoose.connection.close();
        console.log('\n🔌 Disconnected from MongoDB\n');
    }
}

// Run script
main();
