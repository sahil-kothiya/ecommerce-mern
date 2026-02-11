/**
 * @fileoverview API Response Utilities
 * @description Standardized response formatters for consistent API responses
 * @author Enterprise E-Commerce Team
 * @version 1.0.0
 */

/**
 * Format success response
 * @param {Object} data - Response data
 * @param {string} [message] - Optional success message
 * @param {Object} [meta] - Optional metadata
 * @returns {Object} Formatted success response
 */
export const successResponse = (data, message = null, meta = null) => {
    const response = {
        success: true,
        ...(message && { message }),
        data
    };

    if (meta) {
        response.meta = meta;
    }

    return response;
};

/**
 * Format error response
 * @param {string} message - Error message
 * @param {number} [statusCode=500] - HTTP status code
 * @param {Array} [errors] - Validation errors array
 * @returns {Object} Formatted error response
 */
export const errorResponse = (message, statusCode = 500, errors = null) => {
    const response = {
        success: false,
        message,
        statusCode
    };

    if (errors && errors.length > 0) {
        response.errors = errors;
    }

    return response;
};

/**
 * Format paginated response
 * @param {Array} items - Array of items
 * @param {Object} pagination - Pagination metadata
 * @param {number} pagination.page - Current page
 * @param {number} pagination.limit - Items per page
 * @param {number} pagination.total - Total items
 * @returns {Object} Formatted paginated response
 */
export const paginatedResponse = (items, pagination) => {
    const { page, limit, total } = pagination;
    const totalPages = Math.ceil(total / limit);

    return successResponse(
        { items },
        null,
        {
            pagination: {
                currentPage: page,
                itemsPerPage: limit,
                totalItems: total,
                totalPages,
                hasNextPage: page < totalPages,
                hasPreviousPage: page > 1,
                nextPage: page < totalPages ? page + 1 : null,
                previousPage: page > 1 ? page - 1 : null
            }
        }
    );
};

/**
 * Format validation error response
 * @param {Array} validationErrors - Array of validation error objects
 * @returns {Object} Formatted validation error response
 */
export const validationErrorResponse = (validationErrors) => {
    const errors = validationErrors.map(err => ({
        field: err.param || err.field,
        message: err.msg || err.message
    }));

    return errorResponse('Validation failed', 400, errors);
};

/**
 * Format created resource response
 * @param {Object} resource - Created resource data
 * @param {string} [message] - Success message
 * @returns {Object} Formatted creation response
 */
export const createdResponse = (resource, message = 'Resource created successfully') => {
    return successResponse(resource, message);
};

/**
 * Format updated resource response
 * @param {Object} resource - Updated resource data
 * @param {string} [message] - Success message
 * @returns {Object} Formatted update response
 */
export const updatedResponse = (resource, message = 'Resource updated successfully') => {
    return successResponse(resource, message);
};

/**
 * Format deleted resource response
 * @param {string} [message] - Success message
 * @returns {Object} Formatted deletion response
 */
export const deletedResponse = (message = 'Resource deleted successfully') => {
    return successResponse(null, message);
};

/**
 * Format not found error response
 * @param {string} [resource='Resource'] - Resource name
 * @returns {Object} Formatted not found response
 */
export const notFoundResponse = (resource = 'Resource') => {
    return errorResponse(`${resource} not found`, 404);
};

/**
 * Format unauthorized error response
 * @param {string} [message] - Custom error message
 * @returns {Object} Formatted unauthorized response
 */
export const unauthorizedResponse = (message = 'Unauthorized access') => {
    return errorResponse(message, 401);
};

/**
 * Format forbidden error response
 * @param {string} [message] - Custom error message
 * @returns {Object} Formatted forbidden response
 */
export const forbiddenResponse = (message = 'Access forbidden') => {
    return errorResponse(message, 403);
};
