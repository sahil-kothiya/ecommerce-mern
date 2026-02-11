/**
 * @fileoverview MongoDB Database Configuration
 * @description Handles MongoDB connection with event listeners, connection pooling, and error handling
 * @description Optimized for 10M+ products with connection pooling and compression
 * @author Enterprise E-Commerce Team
 * @version 2.0.0
 */

import mongoose from 'mongoose';
import { config } from './index.js';
import { logger } from '../utils/logger.js';

/**
 * MongoDB connection options optimized for 10M+ products
 * @type {Object}
 */
const connectionOptions = {
    // Connection pool settings (critical for 10M+ products)
    maxPoolSize: 100,             // Increased for high concurrency
    minPoolSize: 10,              // Keep connections warm
    maxIdleTimeMS: 300000,        // Close idle connections after 5 minutes
    
    // Timeout settings (aggressive for production scale)
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    connectTimeoutMS: 10000,
    
    // Monitoring
    heartbeatFrequencyMS: 10000,
    
    // Performance optimizations
    autoIndex: false,              // Always false in production (10M products!)
    retryWrites: true,
    retryReads: true,
    
    // Compression for network traffic
    compressors: ['zlib'],
    zlibCompressionLevel: 6,
    
    // Read preference for read replicas
    readPreference: 'secondaryPreferred', // Use replicas for reads
    
    // Write concern for consistency
    w: 'majority',
    wtimeoutMS: 5000,
    
    // Modern engine
    useNewUrlParser: true,
    useUnifiedTopology: true
};

/**
 * Connect to MongoDB database
 * @async
 * @returns {Promise<void>}
 * @throws {Error} If connection fails
 */
export const connectDB = async () => {
    try {
        // Select appropriate database URI based on environment
        const mongoUri = config.nodeEnv === 'test' 
            ? config.mongodbTestUri 
            : config.mongodbUri;

        // Validate URI exists
        if (!mongoUri) {
            throw new Error('MongoDB URI is not defined in environment variables');
        }

        // Attempt connection
        await mongoose.connect(mongoUri, connectionOptions);

        // Setup event listeners after successful connection
        setupEventListeners();

        logger.info(`✅ MongoDB connected successfully to ${maskUri(mongoUri)}`);
        logger.info(`📊 Database: ${mongoose.connection.name}`);
        logger.info(`🔗 Connection state: ${getConnectionState()}`);

    } catch (error) {
        logger.error('❌ MongoDB connection error:', error.message);
        
        // In production, retry connection after delay
        if (config.nodeEnv === 'production') {
            logger.info('🔄 Retrying connection in 5 seconds...');
            setTimeout(connectDB, 5000);
        } else {
            throw error;
        }
    }
};

/**
 * Setup MongoDB event listeners for monitoring connection health
 * @private
 */
const setupEventListeners = () => {
    const { connection } = mongoose;

    // Connection established
    connection.on('connected', () => {
        logger.info('🔗 MongoDB connection established');
    });

    // Connection error
    connection.on('error', (err) => {
        logger.error('❌ MongoDB connection error:', err);
    });

    // Connection disconnected
    connection.on('disconnected', () => {
        logger.warn('⚠️  MongoDB disconnected');
        
        // Attempt to reconnect in production
        if (config.nodeEnv === 'production') {
            logger.info('🔄 Attempting to reconnect...');
        }
    });

    // Connection reconnected
    connection.on('reconnected', () => {
        logger.info('🔄 MongoDB reconnected successfully');
    });

    // Application termination
    process.on('SIGINT', async () => {
        await gracefulShutdown('SIGINT');
    });

    process.on('SIGTERM', async () => {
        await gracefulShutdown('SIGTERM');
    });

    // Unhandled rejections
    process.on('unhandledRejection', (err) => {
        logger.error('🚨 Unhandled Promise Rejection:', err);
        if (config.nodeEnv === 'production') {
            gracefulShutdown('unhandledRejection');
        }
    });
};

/**
 * Gracefully close MongoDB connection
 * @async
 * @param {string} signal - Termination signal name
 * @returns {Promise<void>}
 */
const gracefulShutdown = async (signal) => {
    try {
        logger.info(`🛑 Received ${signal}, closing MongoDB connection...`);
        
        await mongoose.connection.close();
        
        logger.info('✅ MongoDB connection closed successfully');
        process.exit(0);
    } catch (error) {
        logger.error('❌ Error during graceful shutdown:', error);
        process.exit(1);
    }
};

/**
 * Disconnect from MongoDB database
 * @async
 * @returns {Promise<void>}
 * @throws {Error} If disconnection fails
 */
export const disconnectDB = async () => {
    try {
        await mongoose.connection.close();
        logger.info('✅ MongoDB connection closed');
    } catch (error) {
        logger.error('❌ Error disconnecting from MongoDB:', error);
        throw error;
    }
};

/**
 * Get current connection state as string
 * @returns {string} Connection state description
 */
export const getConnectionState = () => {
    const states = {
        0: 'disconnected',
        1: 'connected',
        2: 'connecting',
        3: 'disconnecting'
    };
    
    return states[mongoose.connection.readyState] || 'unknown';
};

/**
 * Check if database is connected
 * @returns {boolean} True if connected
 */
export const isConnected = () => {
    return mongoose.connection.readyState === 1;
};

/**
 * Get database connection statistics
 * @returns {Object} Connection statistics
 */
export const getConnectionStats = () => {
    return {
        state: getConnectionState(),
        name: mongoose.connection.name,
        host: mongoose.connection.host,
        port: mongoose.connection.port,
        readyState: mongoose.connection.readyState,
        collections: Object.keys(mongoose.connection.collections).length
    };
};

/**
 * Mask sensitive information in MongoDB URI
 * @private
 * @param {string} uri - MongoDB connection URI
 * @returns {string} Masked URI
 */
const maskUri = (uri) => {
    // Replace password with asterisks
    return uri.replace(/:[^:@]+@/, ':****@');
};

/**
 * Drop database (use with caution - development/test only)
 * @async
 * @returns {Promise<void>}
 * @throws {Error} If not in development/test environment
 */
export const dropDatabase = async () => {
    if (config.nodeEnv === 'production') {
        throw new Error('Cannot drop database in production environment');
    }
    
    try {
        await mongoose.connection.dropDatabase();
        logger.warn('⚠️  Database dropped');
    } catch (error) {
        logger.error('❌ Error dropping database:', error);
        throw error;
    }
};

/**
 * Create indexes for all models
 * @async
 * @returns {Promise<void>}
 */
export const createIndexes = async () => {
    try {
        logger.info('📊 Creating database indexes...');
        
        // Get all models
        const models = mongoose.modelNames();
        
        // Create indexes for each model
        for (const modelName of models) {
            const model = mongoose.model(modelName);
            await model.createIndexes();
            logger.info(`✅ Indexes created for ${modelName}`);
        }
        
        logger.info('✅ All database indexes created successfully');
    } catch (error) {
        logger.error('❌ Error creating indexes:', error);
        throw error;
    }
};

