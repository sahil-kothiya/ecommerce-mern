/**
 * @fileoverview Base Controller class implementing common patterns for all controllers
 * @description Provides reusable methods for handling HTTP requests, responses, and errors
 * @author Enterprise E-Commerce Team
 * @version 1.0.0
 */

import { logger } from '../utils/logger.js';
import { AppError } from '../middleware/errorHandler.js';

/**
 * Base Controller Class
 * @description Abstract controller providing common CRUD operations and response patterns
 * @abstract
 */
export class BaseController {
    /**
     * Creates an instance of BaseController
     * @param {Object} service - Service layer instance for business logic
     */
    constructor(service) {
        this.service = service;
    }

    /**
     * Send success response with consistent format
     * @param {Object} res - Express response object
     * @param {Object} data - Response data
     * @param {number} [statusCode=200] - HTTP status code
     * @param {string} [message] - Optional success message
     * @returns {Object} JSON response
     */
    sendSuccess(res, data, statusCode = 200, message = null) {
        const response = {
            success: true,
            ...(message && { message }),
            data
        };

        return res.status(statusCode).json(response);
    }

    /**
     * Send paginated response with metadata
     * @param {Object} res - Express response object
     * @param {Array} items - Array of items to paginate
     * @param {Object} pagination - Pagination metadata
     * @param {number} pagination.page - Current page number
     * @param {number} pagination.limit - Items per page
     * @param {number} pagination.total - Total items count
     * @returns {Object} JSON response with pagination
     */
    sendPaginatedResponse(res, items, pagination) {
        const { page, limit, total } = pagination;
        const pages = Math.ceil(total / limit);

        return this.sendSuccess(res, {
            items,
            pagination: {
                currentPage: page,
                itemsPerPage: limit,
                totalItems: total,
                totalPages: pages,
                hasNextPage: page < pages,
                hasPreviousPage: page > 1
            }
        });
    }

    /**
     * Catch async errors and pass to error handler
     * @param {Function} fn - Async function to wrap
     * @returns {Function} Express middleware function
     */
    catchAsync(fn) {
        return (req, res, next) => {
            Promise.resolve(fn(req, res, next)).catch(next);
        };
    }

    /**
     * Validate required fields in request body
     * @param {Object} body - Request body
     * @param {Array<string>} requiredFields - Array of required field names
     * @throws {AppError} If validation fails
     */
    validateRequiredFields(body, requiredFields) {
        const missingFields = requiredFields.filter(field => !body[field]);
        
        if (missingFields.length > 0) {
            throw new AppError(
                `Missing required fields: ${missingFields.join(', ')}`,
                400
            );
        }
    }

    /**
     * Parse and validate pagination parameters
     * @param {Object} query - Request query parameters
     * @returns {Object} Validated pagination params
     */
    parsePaginationParams(query) {
        const page = Math.max(1, parseInt(query.page, 10) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
        const skip = (page - 1) * limit;

        return { page, limit, skip };
    }

    /**
     * Parse and validate sort parameters
     * @param {string} sortQuery - Sort query string (e.g., '-createdAt,title')
     * @param {Array<string>} allowedFields - Allowed fields for sorting
     * @returns {Object} MongoDB sort object
     */
    parseSortParams(sortQuery, allowedFields = []) {
        if (!sortQuery) return { createdAt: -1 };

        const sortObj = {};
        const sortFields = sortQuery.split(',');

        sortFields.forEach(field => {
            const isDescending = field.startsWith('-');
            const fieldName = isDescending ? field.slice(1) : field;

            // Validate field if allowedFields is provided
            if (allowedFields.length > 0 && !allowedFields.includes(fieldName)) {
                return;
            }

            sortObj[fieldName] = isDescending ? -1 : 1;
        });

        return Object.keys(sortObj).length > 0 ? sortObj : { createdAt: -1 };
    }

    /**
     * Build filter query from request parameters
     * @param {Object} query - Request query parameters
     * @param {Array<string>} allowedFilters - Allowed filter fields
     * @returns {Object} MongoDB filter object
     */
    buildFilterQuery(query, allowedFilters = []) {
        const filter = {};

        allowedFilters.forEach(field => {
            if (query[field] !== undefined) {
                filter[field] = query[field];
            }
        });

        return filter;
    }

    /**
     * Log controller action
     * @param {string} action - Action name
     * @param {Object} metadata - Additional metadata to log
     */
    logAction(action, metadata = {}) {
        logger.info(`Controller Action: ${action}`, metadata);
    }

    /**
     * Extract user ID from request
     * @param {Object} req - Express request object
     * @returns {string|null} User ID or null
     */
    getUserId(req) {
        return req.user?._id || req.user?.id || null;
    }

    /**
     * Check if user is admin
     * @param {Object} req - Express request object
     * @returns {boolean} True if user is admin
     */
    isAdmin(req) {
        return req.user?.role === 'admin';
    }
}
