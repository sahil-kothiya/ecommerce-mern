import { body, param, query } from 'express-validator';
import mongoose from 'mongoose';

export const createProductValidator = [
    body('name')
        .trim()
        .isLength({ min: 3, max: 200 })
        .withMessage('Product name must be between 3 and 200 characters'),
    
    body('slug')
        .optional()
        .trim()
        .isLength({ min: 3, max: 200 })
        .matches(/^[a-z0-9-]+$/)
        .withMessage('Slug must contain only lowercase letters, numbers, and hyphens'),
    
    body('description')
        .optional()
        .trim()
        .isLength({ max: 5000 })
        .withMessage('Description cannot exceed 5000 characters'),
    
    body('price')
        .isFloat({ min: 0 })
        .withMessage('Price must be a positive number'),
    
    body('comparePrice')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Compare price must be a positive number')
        .custom((value, { req }) => !value || value >= req.body.price)
        .withMessage('Compare price must be greater than or equal to price'),
    
    body('stock')
        .isInt({ min: 0 })
        .withMessage('Stock must be a non-negative integer'),
    
    body('category')
        .notEmpty()
        .withMessage('Category is required')
        .custom(value => mongoose.Types.ObjectId.isValid(value))
        .withMessage('Invalid category ID'),
    
    body('brand')
        .optional()
        .custom(value => !value || mongoose.Types.ObjectId.isValid(value))
        .withMessage('Invalid brand ID'),
    
    body('status')
        .optional()
        .isIn(['draft', 'active', 'inactive', 'archived'])
        .withMessage('Invalid status'),
    
    body('images')
        .optional()
        .isArray()
        .withMessage('Images must be an array'),
    
    body('variants')
        .optional()
        .isArray()
        .withMessage('Variants must be an array')
];

export const updateProductValidator = [
    param('id')
        .custom(value => mongoose.Types.ObjectId.isValid(value))
        .withMessage('Invalid product ID'),
    
    body('name')
        .optional()
        .trim()
        .isLength({ min: 3, max: 200 })
        .withMessage('Product name must be between 3 and 200 characters'),
    
    body('price')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Price must be a positive number'),
    
    body('stock')
        .optional()
        .isInt({ min: 0 })
        .withMessage('Stock must be a non-negative integer'),
    
    body('status')
        .optional()
        .isIn(['draft', 'active', 'inactive', 'archived'])
        .withMessage('Invalid status')
];

export const productIdValidator = [
    param('id')
        .custom(value => mongoose.Types.ObjectId.isValid(value))
        .withMessage('Invalid product ID')
];

export const productQueryValidator = [
    query('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Page must be a positive integer'),
    
    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100'),
    
    query('sort')
        .optional()
        .isIn(['price', '-price', 'createdAt', '-createdAt', 'name', '-name', 'salesCount', '-salesCount'])
        .withMessage('Invalid sort field'),
    
    query('status')
        .optional()
        .isIn(['draft', 'active', 'inactive', 'archived'])
        .withMessage('Invalid status'),
    
    query('minPrice')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Minimum price must be a positive number'),
    
    query('maxPrice')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Maximum price must be a positive number')
];
