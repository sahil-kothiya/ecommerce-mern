import { logger } from './logger.js';

// ============================================================================
// ERROR PROCESSING UTILITIES
// ============================================================================
// Utility functions for handling and formatting API errors consistently

/**
 * Process API error response and extract field errors
 * 
 * @param {Error} error - The error object from API call
 * @returns {Object} - { fieldErrors: {}, errorMessages: [], generalError: '' }
 */
export const processApiError = (error) => {
    const result = {
        fieldErrors: {},
        errorMessages: [],
        generalError: 'An error occurred. Please try again.'
    };

    logger.info('=== PROCESSING API ERROR ===');
    logger.info('Full error:', error);
    logger.info('Response data:', error.response?.data);

    // Check if we have response data
    if (error.response?.data) {
        const responseData = error.response.data;

        // Process errors array (field-specific validation errors)
        if (responseData.errors && Array.isArray(responseData.errors)) {
            logger.info('Found errors array:', responseData.errors);
            
            responseData.errors.forEach((errorItem, index) => {
                logger.info(`Processing error ${index}:`, errorItem);
                
                // Handle our custom format: { field, message }
                if (errorItem.field && errorItem.message) {
                    result.fieldErrors[errorItem.field] = errorItem.message;
                    result.errorMessages.push(errorItem.message);
                } 
                // Handle express-validator format: { msg, path, param }
                else if (errorItem.msg) {
                    const field = errorItem.path || errorItem.param || 'unknown';
                    result.fieldErrors[field] = errorItem.msg;
                    result.errorMessages.push(errorItem.msg);
                }
                // Handle string errors
                else if (typeof errorItem === 'string') {
                    result.errorMessages.push(errorItem);
                }
            });
        }

        // Use specific server message if available
        if (responseData.message && responseData.message !== 'Validation failed') {
            result.generalError = responseData.message;
        }
        // If we have field errors, don't show general error
        else if (result.errorMessages.length > 0) {
            result.generalError = '';
        }
    }
    // Handle network errors or other issues
    else if (error.message && !error.message.includes('Request failed')) {
        result.generalError = error.message;
    }

    logger.info('Processed result:', result);
    return result;
};

/**
 * Get input field CSS classes based on error state
 * 
 * @param {Object} errors - Client-side validation errors (from react-hook-form)
 * @param {Object} serverErrors - Server-side validation errors
 * @param {string} fieldName - Name of the form field
 * @returns {string} - CSS classes for the input field
 */
export const getFieldClasses = (errors, serverErrors, fieldName) => {
    const baseClasses = 'w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent';
    const errorClasses = 'border-red-500';
    const validClasses = 'border-gray-300';
    
    const hasError = errors[fieldName] || serverErrors[fieldName];
    return `${baseClasses} ${hasError ? errorClasses : validClasses}`;
};

/**
 * Get the error message for a specific field
 * 
 * @param {Object} errors - Client-side validation errors
 * @param {Object} serverErrors - Server-side validation errors  
 * @param {string} fieldName - Name of the form field
 * @returns {string|null} - Error message or null if no error
 */
export const getFieldError = (errors, serverErrors, fieldName) => {
    return errors[fieldName]?.message || serverErrors[fieldName] || null;
};

/**
 * Check if a field has any errors
 * 
 * @param {Object} errors - Client-side validation errors
 * @param {Object} serverErrors - Server-side validation errors
 * @param {string} fieldName - Name of the form field 
 * @returns {boolean} - True if field has errors
 */
export const hasFieldError = (errors, serverErrors, fieldName) => {
    return !!(errors[fieldName] || serverErrors[fieldName]);
};