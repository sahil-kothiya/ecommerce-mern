import { validationResult } from 'express-validator';
import { AppError } from '../middleware/errorHandler.js';

// ============================================================================
// VALIDATION MIDDLEWARE
// ============================================================================
// Checks validation results from express-validator and throws formatted errors

/**
 * Validate request data and throw AppError if validation fails
 * 
 * This middleware should be used after validator chains (e.g., loginValidator)
 * It extracts validation errors and throws them in a consistent format
 * 
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next function
 * @throws {AppError} 400 error with validation error details
 */
export const validate = (req, res, next) => {
    // Extract validation errors from the request
    const errors = validationResult(req);
    
    // If no validation errors, proceed to next middleware
    if (errors.isEmpty()) {
        return next();
    }
    
    // Format validation errors for consistent error response
    const errorMessages = errors.array().map(error => ({
        field: error.path || error.param,  // Field name that failed validation
        message: error.msg                  // User-friendly error message
    }));
    
    // Throw standardized validation error
    throw new AppError(
        'Validation failed',
        400,
        errorMessages
    );
};

// ============================================================================
// EXPORT ALL VALIDATORS
// ============================================================================
// Re-export all validator chains from individual validator files
export * from './authValidators.js';
export * from './productValidators.js';
export * from './orderValidators.js';
