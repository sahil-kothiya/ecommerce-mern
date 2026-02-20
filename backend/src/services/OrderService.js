

import { Order } from '../models/Order.js';
import { Product } from '../models/Product.js';
import { BaseService } from '../core/BaseService.js';
import { AppError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';
import { ORDER_STATUS, PAYMENT_STATUS } from '../constants/index.js';

export class OrderService extends BaseService {
    constructor() {
        super(Order);
    }

async createOrder(userId, orderData) {
        try {
            const { items, shippingAddress, paymentMethod, couponCode } = orderData;

                        if (!items || items.length === 0) {
                throw new AppError('Order must contain at least one item', 400);
            }

                        const validatedItems = await this.validateAndPrepareItems(items);

                        const totals = this.calculateOrderTotals(validatedItems, couponCode);

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

                        await this.reduceProductStock(validatedItems);

            logger.info('Order created successfully:', order._id);

            return order;
        } catch (error) {
            if (error instanceof AppError) throw error;
            logger.error('OrderService.createOrder error:', error);
            throw new AppError('Failed to create order', 500);
        }
    }

async validateAndPrepareItems(items) {
        const validatedItems = [];

        for (const item of items) {
                        const product = await Product.findById(item.productId);

            if (!product) {
                throw new AppError(`Product not found: ${item.productId}`, 404);
            }

                        if (product.status !== 'active') {
                throw new AppError(`Product is not available: ${product.title}`, 400);
            }

                        if (product.baseStock < item.quantity) {
                throw new AppError(
                    `Insufficient stock for ${product.title}. Available: ${product.baseStock}`,
                    400
                );
            }

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

calculateOrderTotals(items, couponCode = null) {
                const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);

                const taxRate = 0.10;
        const tax = subtotal * taxRate;

                const shippingThreshold = 100;
        const shippingCost = subtotal >= shippingThreshold ? 0 : 10;

                let discount = 0;
        if (couponCode) {
            const CouponService = require('./CouponService').CouponService;
            const couponService = new CouponService();
            const couponData = await couponService.applyCoupon(couponCode, userId, subtotal);
            discount = couponData.discount;
        }

                const total = subtotal + tax + shippingCost - discount;

        return {
            subtotal: Math.round(subtotal * 100) / 100,
            tax: Math.round(tax * 100) / 100,
            shipping: shippingCost,
            discount,
            total: Math.round(total * 100) / 100
        };
    }

async reduceProductStock(items) {
        const stockUpdates = items.map(item =>
            Product.findByIdAndUpdate(item.productId, {
                $inc: { baseStock: -item.quantity, salesCount: item.quantity }
            })
        );

        await Promise.all(stockUpdates);
    }

async generateOrderNumber() {
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        return `ORD-${timestamp}-${random}`;
    }

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

async updateOrderStatus(orderId, status, userId = null) {
        try {
            const order = await this.findByIdOrFail(orderId);

                        if (!this.isValidStatusTransition(order.status, status)) {
                throw new AppError(
                    `Cannot change status from ${order.status} to ${status}`,
                    400
                );
            }

                        order.status = status;

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

async cancelOrder(orderId, userId, reason = null) {
        try {
            const order = await this.findByIdOrFail(orderId);

                        if (order.userId.toString() !== userId) {
                throw new AppError('Unauthorized to cancel this order', 403);
            }

                        if (![ORDER_STATUS.PENDING, ORDER_STATUS.PROCESSING].includes(order.status)) {
                throw new AppError('Order cannot be cancelled at this stage', 400);
            }

                        await this.restoreProductStock(order.items);

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

async restoreProductStock(items) {
        const stockUpdates = items.map(item =>
            Product.findByIdAndUpdate(item.productId, {
                $inc: { baseStock: item.quantity, salesCount: -item.quantity }
            })
        );

        await Promise.all(stockUpdates);
    }

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
