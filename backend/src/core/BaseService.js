/**
 * @fileoverview Base Service class implementing common business logic patterns
 * @description Provides reusable methods for all service classes
 * @author Enterprise E-Commerce Team
 * @version 1.0.0
 */

import { AppError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';

/**
 * Base Service Class
 * @description Abstract service providing common business logic operations
 * @abstract
 */
export class BaseService {
    /**
     * Creates an instance of BaseService
     * @param {Object} model - Mongoose model instance
     */
    constructor(model) {
        this.model = model;
    }

    /**
     * Find all documents with optional filtering, sorting, and pagination
     * @param {Object} options - Query options
     * @param {Object} [options.filter={}] - MongoDB filter object
     * @param {Object} [options.sort={ createdAt: -1 }] - Sort object
     * @param {number} [options.page=1] - Page number
     * @param {number} [options.limit=20] - Items per page
     * @param {string} [options.populate=''] - Fields to populate
     * @param {string} [options.select=''] - Fields to select
     * @returns {Promise<Object>} Paginated results with metadata
     */
    async findAll(options = {}) {
        try {
            const {
                filter = {},
                sort = { createdAt: -1 },
                page = 1,
                limit = 20,
                populate = '',
                select = ''
            } = options;

            const skip = (page - 1) * limit;

            // Build query
            let query = this.model.find(filter);

            if (select) query = query.select(select);
            if (populate) query = query.populate(populate);
            if (sort) query = query.sort(sort);

            // Execute query with pagination
            const [items, total] = await Promise.all([
                query.skip(skip).limit(limit).lean(),
                this.model.countDocuments(filter)
            ]);

            return {
                items,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                }
            };
        } catch (error) {
            logger.error('BaseService.findAll error:', error);
            throw error;
        }
    }

    /**
     * Find single document by ID
     * @param {string} id - Document ID
     * @param {Object} [options={}] - Query options
     * @param {string} [options.populate=''] - Fields to populate
     * @param {string} [options.select=''] - Fields to select
     * @returns {Promise<Object|null>} Document or null
     */
    async findById(id, options = {}) {
        try {
            const { populate = '', select = '' } = options;

            let query = this.model.findById(id);

            if (select) query = query.select(select);
            if (populate) query = query.populate(populate);

            const document = await query.lean();
            return document;
        } catch (error) {
            logger.error(`BaseService.findById error for ID ${id}:`, error);
            throw error;
        }
    }

    /**
     * Find single document by ID or throw error
     * @param {string} id - Document ID
     * @param {Object} [options={}] - Query options
     * @returns {Promise<Object>} Document
     * @throws {AppError} If document not found
     */
    async findByIdOrFail(id, options = {}) {
        const document = await this.findById(id, options);
        
        if (!document) {
            throw new AppError(`${this.model.modelName} not found`, 404);
        }

        return document;
    }

    /**
     * Find one document by filter
     * @param {Object} filter - MongoDB filter object
     * @param {Object} [options={}] - Query options
     * @returns {Promise<Object|null>} Document or null
     */
    async findOne(filter, options = {}) {
        try {
            const { populate = '', select = '' } = options;

            let query = this.model.findOne(filter);

            if (select) query = query.select(select);
            if (populate) query = query.populate(populate);

            return await query.lean();
        } catch (error) {
            logger.error('BaseService.findOne error:', error);
            throw error;
        }
    }

    /**
     * Create new document
     * @param {Object} data - Document data
     * @returns {Promise<Object>} Created document
     */
    async create(data) {
        try {
            const document = await this.model.create(data);
            logger.info(`${this.model.modelName} created:`, document._id);
            return document.toObject();
        } catch (error) {
            logger.error('BaseService.create error:', error);
            throw error;
        }
    }

    /**
     * Update document by ID
     * @param {string} id - Document ID
     * @param {Object} data - Update data
     * @param {Object} [options={ new: true, runValidators: true }] - Update options
     * @returns {Promise<Object|null>} Updated document
     */
    async update(id, data, options = { new: true, runValidators: true }) {
        try {
            const document = await this.model.findByIdAndUpdate(
                id,
                data,
                options
            );

            if (document) {
                logger.info(`${this.model.modelName} updated:`, id);
            }

            return document ? document.toObject() : null;
        } catch (error) {
            logger.error(`BaseService.update error for ID ${id}:`, error);
            throw error;
        }
    }

    /**
     * Update document by ID or throw error
     * @param {string} id - Document ID
     * @param {Object} data - Update data
     * @returns {Promise<Object>} Updated document
     * @throws {AppError} If document not found
     */
    async updateOrFail(id, data) {
        const document = await this.update(id, data);
        
        if (!document) {
            throw new AppError(`${this.model.modelName} not found`, 404);
        }

        return document;
    }

    /**
     * Delete document by ID
     * @param {string} id - Document ID
     * @returns {Promise<Object|null>} Deleted document
     */
    async delete(id) {
        try {
            const document = await this.model.findByIdAndDelete(id);
            
            if (document) {
                logger.info(`${this.model.modelName} deleted:`, id);
            }

            return document ? document.toObject() : null;
        } catch (error) {
            logger.error(`BaseService.delete error for ID ${id}:`, error);
            throw error;
        }
    }

    /**
     * Delete document by ID or throw error
     * @param {string} id - Document ID
     * @returns {Promise<Object>} Deleted document
     * @throws {AppError} If document not found
     */
    async deleteOrFail(id) {
        const document = await this.delete(id);
        
        if (!document) {
            throw new AppError(`${this.model.modelName} not found`, 404);
        }

        return document;
    }

    /**
     * Check if document exists by ID
     * @param {string} id - Document ID
     * @returns {Promise<boolean>} True if exists
     */
    async exists(id) {
        try {
            const count = await this.model.countDocuments({ _id: id });
            return count > 0;
        } catch (error) {
            logger.error(`BaseService.exists error for ID ${id}:`, error);
            return false;
        }
    }

    /**
     * Count documents matching filter
     * @param {Object} [filter={}] - MongoDB filter object
     * @returns {Promise<number>} Count
     */
    async count(filter = {}) {
        try {
            return await this.model.countDocuments(filter);
        } catch (error) {
            logger.error('BaseService.count error:', error);
            throw error;
        }
    }

    /**
     * Soft delete document (sets status to inactive)
     * @param {string} id - Document ID
     * @returns {Promise<Object|null>} Updated document
     */
    async softDelete(id) {
        return await this.update(id, { status: 'inactive' });
    }

    /**
     * Bulk create documents
     * @param {Array<Object>} dataArray - Array of document data
     * @returns {Promise<Array>} Created documents
     */
    async bulkCreate(dataArray) {
        try {
            const documents = await this.model.insertMany(dataArray);
            logger.info(`${this.model.modelName} bulk created: ${documents.length} items`);
            return documents.map(doc => doc.toObject());
        } catch (error) {
            logger.error('BaseService.bulkCreate error:', error);
            throw error;
        }
    }

    /**
     * Transaction wrapper for multiple operations
     * @param {Function} operations - Async function containing operations
     * @returns {Promise<any>} Result of operations
     */
    async transaction(operations) {
        const session = await this.model.db.startSession();
        session.startTransaction();

        try {
            const result = await operations(session);
            await session.commitTransaction();
            return result;
        } catch (error) {
            await session.abortTransaction();
            logger.error('Transaction failed:', error);
            throw error;
        } finally {
            session.endSession();
        }
    }
}
