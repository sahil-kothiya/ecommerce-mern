import { Order } from '../models/Order.js';
import { Cart } from '../models/Cart.js';
import { Product } from '../models/Product.js';
import { User } from '../models/User.js';
import mongoose from 'mongoose';

export class OrderController {
    // GET /api/orders - List user's orders
    async index(req, res) {
        try {
            const userId = req.user.id;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const status = req.query.status;
            const sort = req.query.sort || '-createdAt';

            const skip = (page - 1) * limit;
            const query = { user: userId };

            if (status) {
                query.status = status;
            }

            const [orders, total] = await Promise.all([
                Order.find(query)
                    .sort(sort)
                    .skip(skip)
                    .limit(limit)
                    .lean(),
                Order.countDocuments(query)
            ]);

            res.json({
                success: true,
                data: {
                    orders,
                    pagination: {
                        page,
                        limit,
                        total,
                        pages: Math.ceil(total / limit)
                    }
                }
            });
        } catch (error) {
            console.error('Orders index error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch orders'
            });
        }
    }

    // GET /api/orders/:id - Get single order
    async show(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user.id;

            const order = await Order.findOne({
                _id: id,
                user: userId
            });

            if (!order) {
                return res.status(404).json({
                    success: false,
                    message: 'Order not found'
                });
            }

            res.json({
                success: true,
                data: order
            });
        } catch (error) {
            console.error('Order show error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch order'
            });
        }
    }

    // POST /api/orders - Create new order from cart
    async store(req, res) {
        try {
            const userId = req.user.id;
            const {
                shippingAddress,
                billingAddress,
                paymentMethod,
                shippingMethod = 'standard',
                notes = ''
            } = req.body;

            // Validate required fields
            if (!shippingAddress || !paymentMethod) {
                return res.status(400).json({
                    success: false,
                    message: 'Shipping address and payment method are required'
                });
            }

            // Get user's active cart
            const cart = await Cart.findOne({
                user: userId,
                status: 'active'
            }).populate('items.product');

            if (!cart || cart.items.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Cart is empty'
                });
            }

            // Validate cart items
            const validation = await cart.validateItems();
            if (!validation.isValid) {
                return res.status(400).json({
                    success: false,
                    message: 'Cart contains invalid items',
                    errors: validation.errors
                });
            }

            // Create order number
            const orderNumber = await this.generateOrderNumber();

            // Prepare order items
            const orderItems = cart.items.map(item => ({
                product: {
                    id: item.product._id,
                    title: item.product.title,
                    slug: item.product.slug,
                    image: item.product.images[0] || null
                },
                variant: item.variant ? {
                    id: item.variant._id,
                    title: item.variant.title,
                    sku: item.variant.sku,
                    options: item.variant.options
                } : null,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                totalPrice: item.totalPrice
            }));

            // Create order
            const order = new Order({
                orderNumber,
                user: userId,
                items: orderItems,
                totals: cart.totals,
                status: 'pending',
                shippingAddress,
                billingAddress: billingAddress || shippingAddress,
                paymentMethod,
                shippingMethod,
                notes,
                tracking: {
                    orderPlaced: new Date()
                }
            });

            // Start transaction for order creation and stock update
            const session = await mongoose.startSession();

            try {
                await session.withTransaction(async () => {
                    // Save order
                    await order.save({ session });

                    // Update product stock
                    for (const item of cart.items) {
                        const product = await Product.findById(item.product._id).session(session);

                        if (item.variant) {
                            await product.updateStock(item.variant._id, -item.quantity, session);
                        } else {
                            await product.updateStock(null, -item.quantity, session);
                        }
                    }

                    // Clear cart
                    await cart.clearCart({ session });
                });

                await session.commitTransaction();
            } catch (error) {
                await session.abortTransaction();
                throw error;
            } finally {
                session.endSession();
            }

            // Process payment (implement your payment gateway here)
            try {
                const paymentResult = await this.processPayment(order, paymentMethod);

                if (paymentResult.success) {
                    order.paymentStatus = 'paid';
                    order.status = 'confirmed';
                    order.tracking.paymentConfirmed = new Date();
                    await order.save();
                } else {
                    order.paymentStatus = 'failed';
                    order.paymentFailureReason = paymentResult.error;
                    await order.save();

                    return res.status(402).json({
                        success: false,
                        message: 'Payment failed',
                        error: paymentResult.error
                    });
                }
            } catch (paymentError) {
                console.error('Payment processing error:', paymentError);
                order.paymentStatus = 'failed';
                order.paymentFailureReason = paymentError.message;
                await order.save();

                return res.status(500).json({
                    success: false,
                    message: 'Payment processing failed'
                });
            }

            res.status(201).json({
                success: true,
                message: 'Order created successfully',
                data: order
            });
        } catch (error) {
            console.error('Order creation error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to create order',
                error: error.message
            });
        }
    }

    // PUT /api/orders/:id/cancel - Cancel order
    async cancel(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user.id;
            const { reason } = req.body;

            const order = await Order.findOne({
                _id: id,
                user: userId
            });

            if (!order) {
                return res.status(404).json({
                    success: false,
                    message: 'Order not found'
                });
            }

            if (!order.canBeCancelled()) {
                return res.status(400).json({
                    success: false,
                    message: 'Order cannot be cancelled at this stage'
                });
            }

            await order.cancel(reason);

            res.json({
                success: true,
                message: 'Order cancelled successfully',
                data: order
            });
        } catch (error) {
            console.error('Order cancel error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to cancel order'
            });
        }
    }

    // GET /api/orders/:id/tracking - Get order tracking
    async tracking(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user.id;

            const order = await Order.findOne({
                _id: id,
                user: userId
            }).select('orderNumber status tracking shippingDetails');

            if (!order) {
                return res.status(404).json({
                    success: false,
                    message: 'Order not found'
                });
            }

            const trackingInfo = order.getTrackingInfo();

            res.json({
                success: true,
                data: trackingInfo
            });
        } catch (error) {
            console.error('Order tracking error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch tracking information'
            });
        }
    }

    // GET /api/orders/summary - Get order summary stats
    async summary(req, res) {
        try {
            const userId = req.user.id;

            const [
                totalOrders,
                pendingOrders,
                completedOrders,
                totalSpent
            ] = await Promise.all([
                Order.countDocuments({ user: userId }),
                Order.countDocuments({ user: userId, status: 'pending' }),
                Order.countDocuments({ user: userId, status: 'delivered' }),
                Order.aggregate([
                    { $match: { user: new mongoose.Types.ObjectId(userId) } },
                    { $group: { _id: null, total: { $sum: '$totals.total' } } }
                ])
            ]);

            res.json({
                success: true,
                data: {
                    totalOrders,
                    pendingOrders,
                    completedOrders,
                    totalSpent: totalSpent[0]?.total || 0
                }
            });
        } catch (error) {
            console.error('Order summary error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch order summary'
            });
        }
    }

    // Admin methods

    // GET /api/admin/orders - List all orders (admin)
    async adminIndex(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;
            const status = req.query.status;
            const search = req.query.search;
            const sort = req.query.sort || '-createdAt';

            const skip = (page - 1) * limit;
            const query = {};

            if (status) {
                query.status = status;
            }

            if (search) {
                query.$or = [
                    { orderNumber: new RegExp(search, 'i') },
                    { 'user.email': new RegExp(search, 'i') },
                    { 'user.firstName': new RegExp(search, 'i') },
                    { 'user.lastName': new RegExp(search, 'i') }
                ];
            }

            const [orders, total] = await Promise.all([
                Order.find(query)
                    .populate('user', 'firstName lastName email')
                    .sort(sort)
                    .skip(skip)
                    .limit(limit)
                    .lean(),
                Order.countDocuments(query)
            ]);

            res.json({
                success: true,
                data: {
                    orders,
                    pagination: {
                        page,
                        limit,
                        total,
                        pages: Math.ceil(total / limit)
                    }
                }
            });
        } catch (error) {
            console.error('Admin orders index error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch orders'
            });
        }
    }

    // PUT /api/admin/orders/:id/status - Update order status (admin)
    async updateStatus(req, res) {
        try {
            const { id } = req.params;
            const { status, notes } = req.body;

            const order = await Order.findById(id);

            if (!order) {
                return res.status(404).json({
                    success: false,
                    message: 'Order not found'
                });
            }

            await order.updateStatus(status, notes);

            res.json({
                success: true,
                message: 'Order status updated successfully',
                data: order
            });
        } catch (error) {
            console.error('Update order status error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update order status'
            });
        }
    }

    // PUT /api/admin/orders/:id/shipping - Update shipping info (admin)
    async updateShipping(req, res) {
        try {
            const { id } = req.params;
            const { carrier, trackingNumber, estimatedDelivery } = req.body;

            const order = await Order.findById(id);

            if (!order) {
                return res.status(404).json({
                    success: false,
                    message: 'Order not found'
                });
            }

            order.shippingDetails = {
                carrier,
                trackingNumber,
                estimatedDelivery: estimatedDelivery ? new Date(estimatedDelivery) : null
            };

            if (trackingNumber && order.status === 'confirmed') {
                order.status = 'shipped';
                order.tracking.shipped = new Date();
            }

            await order.save();

            res.json({
                success: true,
                message: 'Shipping information updated successfully',
                data: order
            });
        } catch (error) {
            console.error('Update shipping error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update shipping information'
            });
        }
    }

    // Helper methods

    async generateOrderNumber() {
        const prefix = 'ORD';
        const timestamp = Date.now().toString(36).toUpperCase();
        const random = Math.random().toString(36).substr(2, 4).toUpperCase();
        return `${prefix}-${timestamp}-${random}`;
    }

    async processPayment(order, paymentMethod) {
        // Implement your payment gateway integration here
        // This is a mock implementation

        try {
            // Mock payment processing delay
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Mock success/failure (90% success rate)
            const success = Math.random() > 0.1;

            if (success) {
                return {
                    success: true,
                    transactionId: `txn_${Date.now()}`
                };
            } else {
                return {
                    success: false,
                    error: 'Payment declined by bank'
                };
            }
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
}

export const orderController = new OrderController();