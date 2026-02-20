import { body, param } from 'express-validator';
import mongoose from 'mongoose';

export const registerValidator = [
        body('name')
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Name must be between 2 and 100 characters'),
    
        body('email')
        .trim()
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email'),
    
        body('password')
        .trim()
        .isLength({ min: 8, max: 128 })
        .withMessage('Password must be between 8 and 128 characters'),
    
        body('confirmPassword')
        .trim()
        .custom((value, { req }) => value === req.body.password)
        .withMessage('Passwords do not match')
];

export const loginValidator = [
        body('email')
        .trim()
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email'),
    
        body('password')
        .notEmpty()
        .withMessage('Password is required'),
    
        body('rememberMe')
        .optional()
        .isBoolean()
        .withMessage('Remember me must be a boolean value')
];

export const updatePasswordValidator = [
        body('currentPassword')
        .notEmpty()
        .withMessage('Current password is required'),
    
        body('newPassword')
        .isLength({ min: 8, max: 128 })
        .withMessage('New password must be between 8 and 128 characters'),
    
        body('confirmPassword')
        .custom((value, { req }) => value === req.body.newPassword)
        .withMessage('Passwords do not match')
];

export const emailValidator = [
        body('email')
        .trim()
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email')
];

export const resetPasswordValidator = [
    body('token')
        .trim()
        .notEmpty()
        .withMessage('Reset token is required'),
    body('newPassword')
        .isLength({ min: 8, max: 128 })
        .withMessage('New password must be between 8 and 128 characters'),
    body('confirmPassword')
        .custom((value, { req }) => value === req.body.newPassword)
        .withMessage('Passwords do not match')
];

export const addressIdValidator = [
    param('addressId')
        .custom((value) => mongoose.Types.ObjectId.isValid(value))
        .withMessage('Invalid address ID'),
];

export const createAddressValidator = [
    body('firstName')
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage('First name is required and must be less than 100 characters'),
    body('lastName')
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage('Last name is required and must be less than 100 characters'),
    body('phone')
        .trim()
        .isLength({ min: 7, max: 30 })
        .withMessage('Phone is required'),
    body('address1')
        .trim()
        .isLength({ min: 3, max: 200 })
        .withMessage('Address line 1 is required'),
    body('city')
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage('City is required'),
    body('postCode')
        .trim()
        .isLength({ min: 2, max: 20 })
        .withMessage('Post code is required'),
    body('country')
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Country is required'),
];

export const updateSearchPreferencesValidator = [
    body('savedFilters')
        .optional()
        .isArray({ max: 20 })
        .withMessage('savedFilters must be an array with at most 20 items'),
    body('savedFilters.*.name')
        .optional()
        .trim()
        .isLength({ min: 1, max: 80 })
        .withMessage('Saved filter name is required and must be at most 80 characters'),
    body('savedFilters.*.filters')
        .optional()
        .isObject()
        .withMessage('Saved filter filters must be an object'),
    body('recentSearches')
        .optional()
        .isArray({ max: 20 })
        .withMessage('recentSearches must be an array with at most 20 items'),
    body('recentSearches.*')
        .optional()
        .trim()
        .isLength({ min: 1, max: 120 })
        .withMessage('Each recent search must be between 1 and 120 characters'),
];
