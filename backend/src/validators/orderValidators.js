import { body, param, query } from 'express-validator';
import mongoose from 'mongoose';

export const createOrderValidator = [
    body('items')
        .isArray({ min: 1 })
        .withMessage('Order must contain at least one item'),
    
    body('items.*.product')
        .custom(value => mongoose.Types.ObjectId.isValid(value))
        .withMessage('Invalid product ID'),
    
    body('items.*.quantity')
        .isInt({ min: 1 })
        .withMessage('Quantity must be at least 1'),
    
    body('shippingAddress')
        .notEmpty()
        .withMessage('Shipping address is required'),
    
    body('shippingAddress.fullName')
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Full name must be between 2 and 100 characters'),
    
    body('shippingAddress.phone')
        .trim()
        .matches(/^[0-9]{10,15}$/)
        .withMessage('Phone number must be 10-15 digits'),
    
    body('shippingAddress.addressLine1')
        .trim()
        .isLength({ min: 5, max: 200 })
        .withMessage('Address must be between 5 and 200 characters'),
    
    body('shippingAddress.city')
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('City must be between 2 and 100 characters'),
    
    body('shippingAddress.state')
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('State must be between 2 and 100 characters'),
    
    body('shippingAddress.postalCode')
        .trim()
        .matches(/^[0-9]{5,10}$/)
        .withMessage('Postal code must be 5-10 digits'),
    
    body('shippingAddress.country')
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Country must be between 2 and 100 characters'),
    
    body('paymentMethod')
        .isIn(['credit_card', 'debit_card', 'paypal', 'stripe', 'cod'])
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
        .isIn(['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'])
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
        .isIn(['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'])
        .withMessage('Invalid status')
];
