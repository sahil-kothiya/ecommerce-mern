import { BaseController } from '../core/BaseController.js';
import { CartService } from '../services/CartService.js';

export class CartController extends BaseController {
    constructor() {
        super(new CartService());
    }

    index = this.catchAsync(async (req, res) => {
            const userId = req.user?.id;
            const sessionId = req.sessionID || req.headers['session-id'];

            if (!userId && !sessionId) {
                return res.status(400).json({
                    success: false,
                    message: 'User ID or session ID is required'
                });
            }

            let cart;

            if (userId) {
                                cart = await Cart.findOne({
                    user: userId,
                    status: 'active'
                }).populate('items.product');
            } else {
                                cart = await Cart.findOne({
                    sessionId,
                    status: 'active'
                }).populate('items.product');
            }

            if (!cart) {
                                cart = new Cart({
                    user: userId || null,
                    sessionId: userId ? null : sessionId,
                    items: [],
                    totals: {
                        subtotal: 0,
                        discount: 0,
                        shipping: 0,
                        tax: 0,
                        total: 0
                    }
                });
                await cart.save();
            }

            await cart.calculateTotals();

            res.json({
                success: true,
                data: cart
            });
        } catch (error) {
            console.error('Cart index error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch cart',
                error: error.message
            });
        }
    }

        async addItem(req, res) {
        try {
            const { productId, variantId = null, quantity = 1 } = req.body;
            const userId = req.user?.id;
            const sessionId = req.sessionID || req.headers['session-id'];

            if (!productId) {
                return res.status(400).json({
                    success: false,
                    message: 'Product ID is required'
                });
            }

            if (quantity <= 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Quantity must be greater than 0'
                });
            }

                        const product = await Product.findById(productId);

            if (!product || product.status !== 'active') {
                return res.status(404).json({
                    success: false,
                    message: 'Product not found or unavailable'
                });
            }

                        let variant = null;
            if (variantId) {
                if (!product.hasVariants) {
                    return res.status(400).json({
                        success: false,
                        message: 'This product does not have variants'
                    });
                }

                variant = product.variants.id(variantId);
                if (!variant || variant.status !== 'active') {
                    return res.status(404).json({
                        success: false,
                        message: 'Variant not found or unavailable'
                    });
                }

                                if (variant.stock < quantity) {
                    return res.status(400).json({
                        success: false,
                        message: `Only ${variant.stock} items available in stock`
                    });
                }
            } else {
                                if (product.hasVariants) {
                    return res.status(400).json({
                        success: false,
                        message: 'Variant ID is required for variant products'
                    });
                }

                if (product.baseStock < quantity) {
                    return res.status(400).json({
                        success: false,
                        message: `Only ${product.baseStock} items available in stock`
                    });
                }
            }

                        let cart = await Cart.findOne({
                $or: [
                    { user: userId, status: 'active' },
                    { sessionId: sessionId, status: 'active' }
                ]
            });

            if (!cart) {
                cart = new Cart({
                    user: userId || null,
                    sessionId: userId ? null : sessionId,
                    items: []
                });
            }

                        const result = await cart.addItem(productId, variantId, quantity);

            res.json({
                success: true,
                message: result.message,
                data: cart
            });
        } catch (error) {
            console.error('Add to cart error:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to add item to cart'
            });
        }
    }

        async updateItem(req, res) {
        try {
            const { itemId } = req.params;
            const { quantity } = req.body;
            const userId = req.user?.id;
            const sessionId = req.sessionID || req.headers['session-id'];

            if (!quantity || quantity <= 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Valid quantity is required'
                });
            }

                        const cart = await Cart.findOne({
                $or: [
                    { user: userId, status: 'active' },
                    { sessionId: sessionId, status: 'active' }
                ]
            });

            if (!cart) {
                return res.status(404).json({
                    success: false,
                    message: 'Cart not found'
                });
            }

            await cart.updateItemQuantity(itemId, quantity);

            res.json({
                success: true,
                message: 'Cart item updated successfully',
                data: cart
            });
        } catch (error) {
            console.error('Update cart item error:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to update cart item'
            });
        }
    }

        async removeItem(req, res) {
        try {
            const { itemId } = req.params;
            const userId = req.user?.id;
            const sessionId = req.sessionID || req.headers['session-id'];

                        const cart = await Cart.findOne({
                $or: [
                    { user: userId, status: 'active' },
                    { sessionId: sessionId, status: 'active' }
                ]
            });

            if (!cart) {
                return res.status(404).json({
                    success: false,
                    message: 'Cart not found'
                });
            }

            await cart.removeItem(itemId);

            res.json({
                success: true,
                message: 'Item removed from cart',
                data: cart
            });
        } catch (error) {
            console.error('Remove cart item error:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to remove cart item'
            });
        }
    }

        async clear(req, res) {
        try {
            const userId = req.user?.id;
            const sessionId = req.sessionID || req.headers['session-id'];

                        const cart = await Cart.findOne({
                $or: [
                    { user: userId, status: 'active' },
                    { sessionId: sessionId, status: 'active' }
                ]
            });

            if (!cart) {
                return res.status(404).json({
                    success: false,
                    message: 'Cart not found'
                });
            }

            await cart.clearCart();

            res.json({
                success: true,
                message: 'Cart cleared successfully',
                data: cart
            });
        } catch (error) {
            console.error('Clear cart error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to clear cart'
            });
        }
    }

        async mergeSessionCart(req, res) {
        try {
            const userId = req.user?.id;
            const sessionId = req.sessionID || req.headers['session-id'];

            if (!userId || !sessionId) {
                return res.status(400).json({
                    success: false,
                    message: 'User ID and session ID are required'
                });
            }

                        const sessionCart = await Cart.findOne({
                sessionId,
                status: 'active'
            });

            if (!sessionCart || sessionCart.items.length === 0) {
                return res.json({
                    success: true,
                    message: 'No session cart to merge',
                    data: null
                });
            }

                        let userCart = await Cart.findOne({
                user: userId,
                status: 'active'
            });

            if (!userCart) {
                                sessionCart.user = userId;
                sessionCart.sessionId = null;
                await sessionCart.save();
                userCart = sessionCart;
            } else {
                                for (const sessionItem of sessionCart.items) {
                    await userCart.addItem(
                        sessionItem.product,
                        sessionItem.variant,
                        sessionItem.quantity
                    );
                }

                                await sessionCart.deleteOne();
            }

            await userCart.calculateTotals();

            res.json({
                success: true,
                message: 'Session cart merged successfully',
                data: userCart
            });
        } catch (error) {
            console.error('Merge session cart error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to merge session cart'
            });
        }
    }

        async count(req, res) {
        try {
            const userId = req.user?.id;
            const sessionId = req.sessionID || req.headers['session-id'];

            const cart = await Cart.findOne({
                $or: [
                    { user: userId, status: 'active' },
                    { sessionId: sessionId, status: 'active' }
                ]
            });

            const count = cart ? cart.itemCount : 0;

            res.json({
                success: true,
                data: { count }
            });
        } catch (error) {
            console.error('Cart count error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get cart count'
            });
        }
    }

        async validate(req, res) {
        try {
            const userId = req.user?.id;
            const sessionId = req.sessionID || req.headers['session-id'];

            const cart = await Cart.findOne({
                $or: [
                    { user: userId, status: 'active' },
                    { sessionId: sessionId, status: 'active' }
                ]
            }).populate('items.product');

            if (!cart) {
                return res.status(404).json({
                    success: false,
                    message: 'Cart not found'
                });
            }

            const validation = await cart.validateItems();

            res.json({
                success: true,
                data: validation
            });
        } catch (error) {
            console.error('Cart validation error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to validate cart'
            });
        }
    }

        async shippingEstimate(req, res) {
        try {
            const { zipCode, country = 'US' } = req.query;
            const userId = req.user?.id;
            const sessionId = req.sessionID || req.headers['session-id'];

            if (!zipCode) {
                return res.status(400).json({
                    success: false,
                    message: 'Zip code is required'
                });
            }

            const cart = await Cart.findOne({
                $or: [
                    { user: userId, status: 'active' },
                    { sessionId: sessionId, status: 'active' }
                ]
            });

            if (!cart || cart.items.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Cart is empty'
                });
            }

                        const estimate = await cart.calculateShipping(zipCode, country);

            res.json({
                success: true,
                data: estimate
            });
        } catch (error) {
            console.error('Shipping estimate error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to calculate shipping estimate'
            });
        }
    }

        async applyCoupon(req, res) {
        try {
            const { couponCode } = req.body;
            const userId = req.user?.id;
            const sessionId = req.sessionID || req.headers['session-id'];

            if (!couponCode) {
                return res.status(400).json({
                    success: false,
                    message: 'Coupon code is required'
                });
            }

            const cart = await Cart.findOne({
                $or: [
                    { user: userId, status: 'active' },
                    { sessionId: sessionId, status: 'active' }
                ]
            });

            if (!cart) {
                return res.status(404).json({
                    success: false,
                    message: 'Cart not found'
                });
            }

            const result = await cart.applyCoupon(couponCode);

            res.json({
                success: true,
                message: result.message,
                data: cart
            });
        } catch (error) {
            console.error('Apply coupon error:', error);
            res.status(400).json({
                success: false,
                message: error.message || 'Failed to apply coupon'
            });
        }
    }

        async removeCoupon(req, res) {
        try {
            const userId = req.user?.id;
            const sessionId = req.sessionID || req.headers['session-id'];

            const cart = await Cart.findOne({
                $or: [
                    { user: userId, status: 'active' },
                    { sessionId: sessionId, status: 'active' }
                ]
            });

            if (!cart) {
                return res.status(404).json({
                    success: false,
                    message: 'Cart not found'
                });
            }

            await cart.removeCoupon();

            res.json({
                success: true,
                message: 'Coupon removed successfully',
                data: cart
            });
        } catch (error) {
            console.error('Remove coupon error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to remove coupon'
            });
        }
    }
}

export const cartController = new CartController();