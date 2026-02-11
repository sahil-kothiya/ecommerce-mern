/**
 * @fileoverview Order Service Layer
 * @description Handles order processing, payment, and fulfillment business logic
 * @author Enterprise E-Commerce Team
 * @version 1.0.0
 */

import { Order } from '../models/Order.js';
import { Product } from '../models/Product.js';
import { BaseService } from '../core/BaseService.js';
import { AppError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';
import { ORDER_STATUS, PAYMENT_STATUS } from '../constants/index.js';

/**
 * Order Service Class
 * @extends BaseService
 * @description Manages order lifecycle and business rules
 */
export class OrderService extends BaseService {
    constructor() {
        super(Order);
    }

    /**
     * Create new order with validation and stock management
     * @param {string} userId - User ID
     * @param {Object} orderData - Order data
     * @param {Array} orderData.items - Order items
     * @param {Object} orderData.shippingAddress - Shipping address
     * @param {string} orderData.paymentMethod - Payment method
     * @returns {Promise<Object>} Created order
     * @throws {AppError} If validation fails or insufficient stock
     */
    async createOrder(userId, orderData) {
        try {
            const { items, shippingAddress, paymentMethod, couponCode } = orderData;

            // Validate items
            if (!items || items.length === 0) {
                throw new AppError('Order must contain at least one item', 400);
            }

            // Validate and calculate order totals
            const validatedItems = await this.validateAndPrepareItems(items);

            // Calculate totals
            const totals = this.calculateOrderTotals(validatedItems, couponCode);

            // Create order
            const order = await this.create({
                userId,
                items: validatedItems,
                shippingAddress,
                paymentMethod,
                ...totals,
                status: ORDER_STATUS.PENDING,
                paymentStatus: PAYMENT_STATUS.PENDING,
                orderNumber: await this.generateOrderNumber()
            });

            // Reduce product stock
            await this.reduceProductStock(validatedItems);

            logger.info('Order created successfully:', order._id);

            return order;
        } catch (error) {
            if (error instanceof AppError) throw error;
            logger.error('OrderService.createOrder error:', error);
            throw new AppError('Failed to create order', 500);
        }
    }

    /**
     * Validate order items and check stock availability
     * @private
     * @param {Array} items - Order items
     * @returns {Promise<Array>} Validated items with product details
     * @throws {AppError} If product not found or insufficient stock
     */
    async validateAndPrepareItems(items) {
        const validatedItems = [];

        for (const item of items) {
            // Find product
            const product = await Product.findById(item.productId);

            if (!product) {
                throw new AppError(`Product not found: ${item.productId}`, 404);
            }

            // Check if active
            if (product.status !== 'active') {
                throw new AppError(`Product is not available: ${product.title}`, 400);
            }

            // Check stock
            if (product.baseStock < item.quantity) {
                throw new AppError(
                    `Insufficient stock for ${product.title}. Available: ${product.baseStock}`,
                    400
                );
            }

            // Calculate item price
            const price = product.baseDiscount > 0
                ? product.basePrice * (1 - product.baseDiscount / 100)
                : product.basePrice;

            validatedItems.push({
                productId: product._id,
                title: product.title,
                slug: product.slug,
                quantity: item.quantity,
                price: price,
                subtotal: price * item.quantity,
                image: product.images?.[0]?.path || null
            });
        }

        return validatedItems;
    }

    /**
     * Calculate order totals
     * @private
     * @param {Array} items - Validated order items
     * @param {string} [couponCode] - Coupon code if any
     * @returns {Object} Order totals
     */
    calculateOrderTotals(items, couponCode = null) {
        // Calculate subtotal
        const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);

        // Calculate tax (10% for demo)
        const taxRate = 0.10;
        const tax = subtotal * taxRate;

        // Calculate shipping (free shipping over $100)
        const shippingThreshold = 100;
        const shippingCost = subtotal >= shippingThreshold ? 0 : 10;

        // Apply discount if coupon provided
        let discount = 0;
        if (couponCode) {
            const CouponService = require('./CouponService').CouponService;
            const couponService = new CouponService();
            const couponData = await couponService.applyCoupon(couponCode, userId, subtotal);
            discount = couponData.discount;
        }

        // Calculate total
        const total = subtotal + tax + shippingCost - discount;

        return {
            subtotal: Math.round(subtotal * 100) / 100,
            tax: Math.round(tax * 100) / 100,
            shipping: shippingCost,
            discount,
            total: Math.round(total * 100) / 100
        };
    }

    /**
     * Reduce product stock after order creation
     * @private
     * @param {Array} items - Order items
     * @returns {Promise<void>}
     */
    async reduceProductStock(items) {
        const stockUpdates = items.map(item =>
            Product.findByIdAndUpdate(item.productId, {
                $inc: { baseStock: -item.quantity, salesCount: item.quantity }
            })
        );

        await Promise.all(stockUpdates);
    }

    /**
     * Generate unique order number
     * @private
     * @returns {Promise<string>} Order number
     */
    async generateOrderNumber() {
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        return `ORD-${timestamp}-${random}`;
    }

    /**
     * Get user orders with pagination
     * @param {string} userId - User ID
     * @param {Object} options - Query options
     * @returns {Promise<Object>} Paginated orders
     */
    async getUserOrders(userId, options = {}) {
        const { page = 1, limit = 10, status } = options;

        const filter = { userId };
        if (status) filter.status = status;

        return await this.findAll({
            filter,
            sort: { createdAt: -1 },
            page,
            limit
        });
    }

    /**
     * Get all orders (admin)
     * @param {Object} options - Query options
     * @returns {Promise<Object>} Paginated orders
     */
    async getAllOrders(options = {}) {
        const { page = 1, limit = 20, status, paymentStatus } = options;

        const filter = {};
        if (status) filter.status = status;
        if (paymentStatus) filter.paymentStatus = paymentStatus;

        return await this.findAll({
            filter,
            sort: { createdAt: -1 },
            page,
            limit,
            populate: 'userId'
        });
    }

    /**
     * Update order status
     * @param {string} orderId - Order ID
     * @param {string} status - New status
     * @param {string} [userId] - User ID (for permission check)
     * @returns {Promise<Object>} Updated order
     * @throws {AppError} If invalid status transition
     */
    async updateOrderStatus(orderId, status, userId = null) {
        try {
            const order = await this.findByIdOrFail(orderId);

            // Validate status transition
            if (!this.isValidStatusTransition(order.status, status)) {
                throw new AppError(
                    `Cannot change status from ${order.status} to ${status}`,
                    400
                );
            }

            // Update status
            order.status = status;

            // Add status history
            if (!order.statusHistory) order.statusHistory = [];
            order.statusHistory.push({
                status,
                date: new Date(),
                note: `Status changed to ${status}`
            });

            await order.save();

            logger.info(`Order ${orderId} status updated to ${status}`);

            return order;
        } catch (error) {
            if (error instanceof AppError) throw error;
            logger.error('OrderService.updateOrderStatus error:', error);
            throw error;
        }
    }

    /**
     * Validate status transition
     * @private
     * @param {string} currentStatus - Current order status
     * @param {string} newStatus - New order status
     * @returns {boolean} True if transition is valid
     */
    isValidStatusTransition(currentStatus, newStatus) {
        const validTransitions = {
            [ORDER_STATUS.PENDING]: [ORDER_STATUS.PROCESSING, ORDER_STATUS.CANCELLED],
            [ORDER_STATUS.PROCESSING]: [ORDER_STATUS.CONFIRMED, ORDER_STATUS.CANCELLED],
            [ORDER_STATUS.CONFIRMED]: [ORDER_STATUS.SHIPPED, ORDER_STATUS.CANCELLED],
            [ORDER_STATUS.SHIPPED]: [ORDER_STATUS.DELIVERED],
            [ORDER_STATUS.DELIVERED]: [ORDER_STATUS.REFUNDED],
            [ORDER_STATUS.CANCELLED]: [],
            [ORDER_STATUS.REFUNDED]: []
        };

        return validTransitions[currentStatus]?.includes(newStatus) || false;
    }

    /**
     * Cancel order
     * @param {string} orderId - Order ID
     * @param {string} userId - User ID
     * @param {string} [reason] - Cancellation reason
     * @returns {Promise<Object>} Cancelled order
     */
    async cancelOrder(orderId, userId, reason = null) {
        try {
            const order = await this.findByIdOrFail(orderId);

            // Check ownership
            if (order.userId.toString() !== userId) {
                throw new AppError('Unauthorized to cancel this order', 403);
            }

            // Check if cancellable
            if (![ORDER_STATUS.PENDING, ORDER_STATUS.PROCESSING].includes(order.status)) {
                throw new AppError('Order cannot be cancelled at this stage', 400);
            }

            // Restore product stock
            await this.restoreProductStock(order.items);

            // Update order
            order.status = ORDER_STATUS.CANCELLED;
            order.cancelledAt = new Date();
            order.cancellationReason = reason;

            await order.save();

            logger.info(`Order ${orderId} cancelled by user ${userId}`);

            return order;
        } catch (error) {
            if (error instanceof AppError) throw error;
            logger.error('OrderService.cancelOrder error:', error);
            throw error;
        }
    }

    /**
     * Restore product stock after cancellation
     * @private
     * @param {Array} items - Order items
     * @returns {Promise<void>}
     */
    async restoreProductStock(items) {
        const stockUpdates = items.map(item =>
            Product.findByIdAndUpdate(item.productId, {
                $inc: { baseStock: item.quantity, salesCount: -item.quantity }
            })
        );

        await Promise.all(stockUpdates);
    }

    /**
     * Get order statistics
     * @param {Object} [filters] - Filter options
     * @returns {Promise<Object>} Order statistics
     */
    async getOrderStatistics(filters = {}) {
        try {
            const matchStage = {};
            
            if (filters.startDate && filters.endDate) {
                matchStage.createdAt = {
                    $gte: new Date(filters.startDate),
                    $lte: new Date(filters.endDate)
                };
            }

            const stats = await this.model.aggregate([
                { $match: matchStage },
                {
                    $group: {
                        _id: null,
                        totalOrders: { $sum: 1 },
                        totalRevenue: { $sum: '$total' },
                        averageOrderValue: { $avg: '$total' },
                        pendingOrders: {
                            $sum: { $cond: [{ $eq: ['$status', ORDER_STATUS.PENDING] }, 1, 0] }
                        },
                        completedOrders: {
                            $sum: { $cond: [{ $eq: ['$status', ORDER_STATUS.DELIVERED] }, 1, 0] }
                        },
                        cancelledOrders: {
                            $sum: { $cond: [{ $eq: ['$status', ORDER_STATUS.CANCELLED] }, 1, 0] }
                        }
                    }
                }
            ]);

            return stats[0] || {
                totalOrders: 0,
                totalRevenue: 0,
                averageOrderValue: 0,
                pendingOrders: 0,
                completedOrders: 0,
                cancelledOrders: 0
            };
        } catch (error) {
            logger.error('OrderService.getOrderStatistics error:', error);
            throw error;
        }
    }
}
