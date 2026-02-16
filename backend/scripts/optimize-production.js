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
    logger.info('\nðŸ“Š Building database indexes...\n');

    try {
        // Get all models
        const models = [
            { name: 'Product', model: Product },
            { name: 'Category', model: Category }
        ];

        for (const { name, model } of models) {
            logger.info(`\nðŸ” Checking ${name} indexes...`);

            // Get existing indexes
            const existingIndexes = await model.collection.indexes();
            logger.info(`   Found ${existingIndexes.length} existing indexes`);

            // Build indexes
            logger.info(`   Building indexes for ${name}...`);
            await model.createIndexes();

            // Get updated indexes
            const updatedIndexes = await model.collection.indexes();
            logger.info(`   âœ… ${name} now has ${updatedIndexes.length} indexes`);

            // Show index names
            updatedIndexes.forEach(idx => {
                const keys = Object.keys(idx.key).join(', ');
                logger.info(`      - ${idx.name}: ${keys}`);
            });
        }

        logger.info('\nâœ… All indexes built successfully!\n');

    } catch (error) {
        console.error('\nâŒ Error building indexes:', error.message);
        throw error;
    }
}

/**
 * Analyze database performance
 */
async function analyzePerformance() {
    logger.info('\nðŸ“ˆ Analyzing database performance...\n');

    try {
        // Get collection stats
        const productStats = await Product.collection.stats();
        const categoryStats = await Category.collection.stats();

        logger.info('Product Collection Stats:');
        logger.info(`   Documents: ${productStats.count.toLocaleString()}`);
        logger.info(`   Size: ${(productStats.size / 1024 / 1024).toFixed(2)} MB`);
        logger.info(`   Storage: ${(productStats.storageSize / 1024 / 1024).toFixed(2)} MB`);
        logger.info(`   Avg Document Size: ${(productStats.avgObjSize / 1024).toFixed(2)} KB`);
        logger.info(`   Indexes: ${productStats.nindexes}`);
        logger.info(`   Index Size: ${(productStats.totalIndexSize / 1024 / 1024).toFixed(2)} MB`);

        logger.info('\nCategory Collection Stats:');
        logger.info(`   Documents: ${categoryStats.count.toLocaleString()}`);
        logger.info(`   Size: ${(categoryStats.size / 1024 / 1024).toFixed(2)} MB`);

        // Index usage statistics
        logger.info('\nðŸ“Š Index Usage Statistics:');
        const indexStats = await Product.collection.aggregate([
            { $indexStats: {} }
        ]).toArray();

        indexStats.forEach(stat => {
            logger.info(`\n   Index: ${stat.name}`);
            logger.info(`   Operations: ${stat.accesses.ops}`);
            logger.info(`   Since: ${new Date(stat.accesses.since).toLocaleString()}`);
        });

        logger.info('\nâœ… Performance analysis complete!\n');

    } catch (error) {
        console.error('\nâŒ Error analyzing performance:', error.message);
    }
}

/**
 * Check for slow queries
 */
async function checkSlowQueries() {
    logger.info('\nðŸŒ Checking for slow queries...\n');

    try {
        // Enable profiling
        await mongoose.connection.db.setProfilingLevel(1, { slowms: 100 });

        logger.info('âœ… Profiling enabled for queries slower than 100ms');
        logger.info('   Run your application and check system.profile collection');
        logger.info('   Command: db.system.profile.find().sort({ ts: -1 }).limit(10)\n');

    } catch (error) {
        console.error('âŒ Error setting up profiling:', error.message);
    }
}

/**
 * Recommendations
 */
function showRecommendations(productCount) {
    logger.info('\nðŸ’¡ Production Recommendations:\n');

    if (productCount > 1000000) {
        logger.info('   âš ï¸  Large dataset detected (1M+ products)');
        logger.info('   â†’ Enable Redis caching immediately');
        logger.info('   â†’ Use cursor-based pagination');
        logger.info('   â†’ Consider database sharding');
        logger.info('');
    }

    logger.info('   âœ… Connection Pool: Set maxPoolSize to 100');
    logger.info('   âœ… Compression: Enable zlib compression');
    logger.info('   âœ… Read Preference: Use secondaryPreferred');
    logger.info('   âœ… Auto Index: Set to false in production');
    logger.info('   âœ… Query Optimization: Use lean() and projection');
    logger.info('   âœ… Monitoring: Setup MongoDB Atlas or Ops Manager');
    logger.info('');
}

/**
 * Main execution
 */
async function main() {
    logger.info('â•'.repeat(60));
    logger.info('   ðŸš€ Production Optimization Script for 10M+ Products');
    logger.info('â•'.repeat(60));

    try {
        // Connect to database
        logger.info('\nðŸ”Œ Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI, {
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 5000
        });
        logger.info('âœ… Connected to MongoDB\n');

        // Get current counts
        const productCount = await Product.countDocuments();
        const categoryCount = await Category.countDocuments();

        logger.info(`ðŸ“¦ Current Data:`);
        logger.info(`   Products: ${productCount.toLocaleString()}`);
        logger.info(`   Categories: ${categoryCount.toLocaleString()}`);

        // Build indexes
        await buildIndexes();

        // Analyze performance
        await analyzePerformance();

        // Check slow queries
        await checkSlowQueries();

        // Show recommendations
        showRecommendations(productCount);

        logger.info('â•'.repeat(60));
        logger.info('   âœ… Optimization Complete!');
        logger.info('â•'.repeat(60));
        logger.info('\nNext steps:');
        logger.info('  1. Review PRODUCTION_GUIDE.md');
        logger.info('  2. Setup Redis caching');
        logger.info('  3. Configure monitoring');
        logger.info('  4. Enable compression');
        logger.info('  5. Test with load testing tools\n');

    } catch (error) {
        console.error('\nâŒ Fatal error:', error.message);
        console.error(error.stack);
        process.exit(1);
    } finally {
        await mongoose.connection.close();
        logger.info('\nðŸ”Œ Disconnected from MongoDB\n');
    }
}

// Run script
main();
