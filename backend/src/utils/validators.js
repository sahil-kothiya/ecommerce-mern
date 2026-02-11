/**
 * @fileoverview Validation Utilities
 * @description Common validation functions for data sanitization and validation
 * @author Enterprise E-Commerce Team
 * @version 1.0.0
 */

import mongoose from 'mongoose';

/**
 * Validate MongoDB ObjectId
 * @param {string} id - ID to validate
 * @returns {boolean} True if valid ObjectId
 */
export const isValidObjectId = (id) => {
    return mongoose.Types.ObjectId.isValid(id);
};

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid email format
 */
export const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

/**
 * Validate phone number (international format)
 * @param {string} phone - Phone number to validate
 * @returns {boolean} True if valid phone format
 */
export const isValidPhone = (phone) => {
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    return phoneRegex.test(phone);
};

/**
 * Validate URL format
 * @param {string} url - URL to validate
 * @returns {boolean} True if valid URL
 */
export const isValidUrl = (url) => {
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
};

/**
 * Sanitize string input (remove HTML tags and trim)
 * @param {string} input - Input string to sanitize
 * @returns {string} Sanitized string
 */
export const sanitizeString = (input) => {
    if (typeof input !== 'string') return '';
    return input.replace(/<[^>]*>/g, '').trim();
};

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @param {Object} [options] - Validation options
 * @param {number} [options.minLength=6] - Minimum password length
 * @param {boolean} [options.requireNumber=true] - Require at least one number
 * @param {boolean} [options.requireLetter=true] - Require at least one letter
 * @param {boolean} [options.requireSpecialChar=false] - Require special character
 * @returns {Object} Validation result with isValid and message
 */
export const validatePasswordStrength = (password, options = {}) => {
    const {
        minLength = 6,
        requireNumber = true,
        requireLetter = true,
        requireSpecialChar = false
    } = options;

    if (!password || password.length < minLength) {
        return {
            isValid: false,
            message: `Password must be at least ${minLength} characters long`
        };
    }

    if (requireLetter && !/[a-zA-Z]/.test(password)) {
        return {
            isValid: false,
            message: 'Password must contain at least one letter'
        };
    }

    if (requireNumber && !/\d/.test(password)) {
        return {
            isValid: false,
            message: 'Password must contain at least one number'
        };
    }

    if (requireSpecialChar && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
        return {
            isValid: false,
            message: 'Password must contain at least one special character'
        };
    }

    return { isValid: true, message: 'Password is valid' };
};

/**
 * Validate date range
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {boolean} True if valid range
 */
export const isValidDateRange = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return start < end;
};

/**
 * Validate price value
 * @param {number} price - Price to validate
 * @param {Object} [options] - Validation options
 * @param {number} [options.min=0] - Minimum price
 * @param {number} [options.max=Infinity] - Maximum price
 * @returns {boolean} True if valid price
 */
export const isValidPrice = (price, options = {}) => {
    const { min = 0, max = Infinity } = options;
    const numPrice = parseFloat(price);
    return !isNaN(numPrice) && numPrice >= min && numPrice <= max;
};

/**
 * Validate array of ObjectIds
 * @param {Array} ids - Array of IDs to validate
 * @returns {boolean} True if all are valid ObjectIds
 */
export const isValidObjectIdArray = (ids) => {
    if (!Array.isArray(ids)) return false;
    return ids.every(id => isValidObjectId(id));
};

/**
 * Validate image file type
 * @param {string} mimeType - File MIME type
 * @returns {boolean} True if valid image type
 */
export const isValidImageType = (mimeType) => {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    return validTypes.includes(mimeType);
};

/**
 * Validate file size
 * @param {number} size - File size in bytes
 * @param {number} maxSizeMB - Maximum size in MB
 * @returns {boolean} True if within size limit
 */
export const isValidFileSize = (size, maxSizeMB = 5) => {
    const maxBytes = maxSizeMB * 1024 * 1024;
    return size <= maxBytes;
};

/**
 * Validate slug format
 * @param {string} slug - Slug to validate
 * @returns {boolean} True if valid slug format
 */
export const isValidSlug = (slug) => {
    const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
    return slugRegex.test(slug);
};

/**
 * Validate color hex code
 * @param {string} color - Hex color code
 * @returns {boolean} True if valid hex color
 */
export const isValidHexColor = (color) => {
    const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    return hexRegex.test(color);
};

/**
 * Validate JSON string
 * @param {string} jsonString - String to validate as JSON
 * @returns {boolean} True if valid JSON
 */
export const isValidJSON = (jsonString) => {
    try {
        JSON.parse(jsonString);
        return true;
    } catch {
        return false;
    }
};

/**
 * Validate credit card number (Luhn algorithm)
 * @param {string} cardNumber - Credit card number
 * @returns {boolean} True if valid card number
 */
export const isValidCreditCard = (cardNumber) => {
    const sanitized = cardNumber.replace(/\s/g, '');
    if (!/^\d+$/.test(sanitized)) return false;

    let sum = 0;
    let isEven = false;

    for (let i = sanitized.length - 1; i >= 0; i--) {
        let digit = parseInt(sanitized[i], 10);

        if (isEven) {
            digit *= 2;
            if (digit > 9) digit -= 9;
        }

        sum += digit;
        isEven = !isEven;
    }

    return sum % 10 === 0;
};

/**
 * Validate coordinates (latitude and longitude)
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {boolean} True if valid coordinates
 */
export const isValidCoordinates = (lat, lng) => {
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    
    return !isNaN(latitude) && 
           !isNaN(longitude) && 
           latitude >= -90 && 
           latitude <= 90 && 
           longitude >= -180 && 
           longitude <= 180;
};
