import { Cart } from '../models/Cart.js';
import { Product } from '../models/Product.js';
import { BaseService } from '../core/BaseService.js';
import { AppError } from '../middleware/errorHandler.js';

export class CartService extends BaseService {
    constructor() {
        super(Cart);
    }

    async getCart(userId) {
        let cart = await this.model.findOne({ userId }).populate('items.productId').lean();
        
        if (!cart) {
            cart = await this.model.create({ userId, items: [] });
            return cart.toObject();
        }

        return cart;
    }

    async addItem(userId, { productId, variantId, quantity }) {
        const product = await Product.findById(productId).lean();
        
        if (!product) {
            throw new AppError('Product not found', 404);
        }

        if (product.status !== 'active') {
            throw new AppError('Product is not available', 400);
        }

                let availableStock = product.stock;
        if (product.hasVariants && variantId) {
            const variant = product.variants.find(v => v._id.toString() === variantId);
            if (!variant) {
                throw new AppError('Product variant not found', 404);
            }
            availableStock = variant.stock;
        }

        if (availableStock < quantity) {
            throw new AppError('Insufficient stock', 400);
        }

        let cart = await this.model.findOne({ userId });
        
        if (!cart) {
            cart = await this.model.create({ userId, items: [] });
        }

        const existingItemIndex = cart.items.findIndex(item => 
            item.productId.toString() === productId && 
            (!variantId || item.variantId?.toString() === variantId)
        );

        if (existingItemIndex > -1) {
            cart.items[existingItemIndex].quantity += quantity;
        } else {
            cart.items.push({ productId, variantId, quantity });
        }

        await cart.save();
        return await this.getCart(userId);
    }

    async updateItemQuantity(userId, itemId, quantity) {
        if (quantity < 1) {
            throw new AppError('Quantity must be at least 1', 400);
        }

        const cart = await this.model.findOne({ userId });
        
        if (!cart) {
            throw new AppError('Cart not found', 404);
        }

        const item = cart.items.id(itemId);
        
        if (!item) {
            throw new AppError('Item not found in cart', 404);
        }

        const product = await Product.findById(item.productId).lean();
        let availableStock = product.stock;
        
        if (product.hasVariants && item.variantId) {
            const variant = product.variants.find(v => v._id.toString() === item.variantId.toString());
            availableStock = variant?.stock || 0;
        }

        if (availableStock < quantity) {
            throw new AppError('Insufficient stock', 400);
        }

        item.quantity = quantity;
        await cart.save();
        return await this.getCart(userId);
    }

    async removeItem(userId, itemId) {
        const cart = await this.model.findOne({ userId });
        
        if (!cart) {
            throw new AppError('Cart not found', 404);
        }

        const item = cart.items.id(itemId);
        
        if (item) {
            item.deleteOne();
            await cart.save();
        }

        return await this.getCart(userId);
    }

    async clearCart(userId) {
        const cart = await this.model.findOne({ userId });
        
        if (cart) {
            cart.items = [];
            await cart.save();
        }

        return await this.getCart(userId);
    }

    async getCartSummary(userId) {
        const cart = await this.getCart(userId);
        
        const subtotal = cart.items.reduce((sum, item) => {
            const price = item.productId?.hasVariants && item.variantId 
                ? item.productId.variants.find(v => v._id.toString() === item.variantId.toString())?.price || 0
                : item.productId?.price || 0;
            return sum + (price * item.quantity);
        }, 0);

        const itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);

        return {
            cart,
            itemCount,
            subtotal: Math.round(subtotal * 100) / 100
        };
    }
}
