

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

export const validationErrorResponse = (validationErrors) => {
    const errors = validationErrors.map(err => ({
        field: err.param || err.field,
        message: err.msg || err.message
    }));

    return errorResponse('Validation failed', 400, errors);
};

export const createdResponse = (resource, message = 'Resource created successfully') => {
    return successResponse(resource, message);
};

export const updatedResponse = (resource, message = 'Resource updated successfully') => {
    return successResponse(resource, message);
};

export const deletedResponse = (message = 'Resource deleted successfully') => {
    return successResponse(null, message);
};

export const notFoundResponse = (resource = 'Resource') => {
    return errorResponse(`${resource} not found`, 404);
};

export const unauthorizedResponse = (message = 'Unauthorized access') => {
    return errorResponse(message, 401);
};

export const forbiddenResponse = (message = 'Access forbidden') => {
    return errorResponse(message, 403);
};
