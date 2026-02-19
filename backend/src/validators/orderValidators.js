import { body, param, query } from 'express-validator';
import mongoose from 'mongoose';

export const createOrderValidator = [
    body('firstName')
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('First name must be between 2 and 100 characters'),
    body('lastName')
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Last name must be between 2 and 100 characters'),
    body('email')
        .trim()
        .isEmail()
        .withMessage('Valid email is required'),
    body('phone')
        .trim()
        .matches(/^[\d\s()+-]{10,20}$/)
        .withMessage('Phone number must be 10-20 characters'),
    body('address1')
        .trim()
        .isLength({ min: 5, max: 200 })
        .withMessage('Address line 1 must be between 5 and 200 characters'),
    body('city')
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('City must be between 2 and 100 characters'),
    body('postCode')
        .trim()
        .isLength({ min: 3, max: 20 })
        .withMessage('Post code must be between 3 and 20 characters'),
    body('country')
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Country must be between 2 and 100 characters'),
    
    body('paymentMethod')
        .isIn(['paypal', 'stripe', 'cod'])
        .withMessage('Invalid payment method'),
    
    body('couponCode')
        .optional()
        .trim()
        .isLength({ min: 3, max: 50 })
        .withMessage('Invalid coupon code')
];

export const updateOrderStatusValidator = [
    param('id')
        .custom(value => mongoose.Types.ObjectId.isValid(value))
        .withMessage('Invalid order ID'),
    
    body('status')
        .isIn(['new', 'process', 'delivered', 'cancelled'])
        .withMessage('Invalid order status'),
    
    body('notes')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Notes cannot exceed 500 characters')
];

export const orderIdValidator = [
    param('id')
        .custom(value => mongoose.Types.ObjectId.isValid(value))
        .withMessage('Invalid order ID')
];

export const orderQueryValidator = [
    query('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Page must be a positive integer'),
    
    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100'),
    
    query('status')
        .optional()
        .isIn(['new', 'process', 'delivered', 'cancelled'])
        .withMessage('Invalid status')
];

export const returnRequestValidator = [
    param('id')
        .custom((value) => mongoose.Types.ObjectId.isValid(value))
        .withMessage('Invalid order ID'),
    body('reason')
        .trim()
        .isLength({ min: 5, max: 500 })
        .withMessage('Reason must be between 5 and 500 characters'),
    body('notes')
        .optional()
        .trim()
        .isLength({ max: 1000 })
        .withMessage('Notes cannot exceed 1000 characters'),
    body('items')
        .optional()
        .isArray({ min: 1 })
        .withMessage('Items must be a non-empty array'),
    body('items.*.productId')
        .optional()
        .custom((value) => mongoose.Types.ObjectId.isValid(value))
        .withMessage('Invalid product ID in return items'),
    body('items.*.variantId')
        .optional({ nullable: true })
        .custom((value) => value === null || value === '' || mongoose.Types.ObjectId.isValid(value))
        .withMessage('Invalid variant ID in return items'),
    body('items.*.quantity')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Quantity must be at least 1'),
];
