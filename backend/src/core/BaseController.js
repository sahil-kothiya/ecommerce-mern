import { logger } from '../utils/logger.js';
import { AppError } from '../middleware/errorHandler.js';
import { config } from '../config/index.js';

export class BaseController {
    
    constructor(service) {
        this.service = service;
    }

sendSuccess(res, data, statusCode = 200, message = null) {
        const response = {
            success: true,
            ...(message && { message }),
            data
        };

        return res.status(statusCode).json(response);
    }

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

catchAsync(fn) {
        return (req, res, next) => {
            Promise.resolve(fn(req, res, next)).catch(next);
        };
    }

validateRequiredFields(body, requiredFields) {
        const missingFields = requiredFields.filter((field) => {
            const value = body[field];
            return value === undefined || value === null || (typeof value === 'string' && value.trim() === '');
        });
        
        if (missingFields.length > 0) {
            throw new AppError(
                `Missing required fields: ${missingFields.join(', ')}`,
                400
            );
        }
    }

parsePaginationParams(query) {
        const page = Math.max(1, parseInt(query.page, 10) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
        const skip = (page - 1) * limit;

        return { page, limit, skip };
    }

parseSortParams(sortQuery, allowedFields = []) {
        if (!sortQuery) return { createdAt: -1 };

        const sortObj = {};
        const sortFields = sortQuery.split(',');

        sortFields.forEach(field => {
            const isDescending = field.startsWith('-');
            const fieldName = isDescending ? field.slice(1) : field;

                        if (allowedFields.length > 0 && !allowedFields.includes(fieldName)) {
                return;
            }

            sortObj[fieldName] = isDescending ? -1 : 1;
        });

        return Object.keys(sortObj).length > 0 ? sortObj : { createdAt: -1 };
    }

buildFilterQuery(query, allowedFilters = []) {
        const filter = {};

        allowedFilters.forEach(field => {
            if (query[field] !== undefined) {
                filter[field] = query[field];
            }
        });

        return filter;
    }

logAction(action, metadata = {}) {
        logger.info(`Controller Action: ${action}`, metadata);
    }

getUserId(req) {
        return req.user?._id || req.user?.id || null;
    }

isAdmin(req) {
        return req.user?.role === 'admin';
    }

setTokenCookie(res, name, value, options = {}) {
        const isProduction = config.nodeEnv === 'production';
        const isCrossOrigin = config.frontendUrl !== config.apiUrl;
        const cookieOptions = {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction && isCrossOrigin ? 'none' : 'lax',
            path: '/',
            ...options
        };

        res.cookie(name, value, cookieOptions);
    }

clearTokenCookie(res, name) {
        const isProduction = config.nodeEnv === 'production';
        const isCrossOrigin = config.frontendUrl !== config.apiUrl;
        res.clearCookie(name, {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction && isCrossOrigin ? 'none' : 'lax',
            path: '/'
        });
    }
}
