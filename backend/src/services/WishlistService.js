import { Wishlist } from '../models/Wishlist.js';
import { Product } from '../models/Product.js';
import { BaseService } from '../core/BaseService.js';
import { AppError } from '../middleware/errorHandler.js';

export class WishlistService extends BaseService {
    constructor() {
        super(Wishlist);
    }

    async getWishlist(userId) {
        let wishlist = await this.model.findOne({ userId })
            .populate('items.productId')
            .lean();
        
        if (!wishlist) {
            wishlist = await this.model.create({ userId, items: [] });
            return wishlist.toObject();
        }

        return wishlist;
    }

    async addItem(userId, productId, variantId = null) {
        const product = await Product.findById(productId).lean();
        
        if (!product) {
            throw new AppError('Product not found', 404);
        }

        let wishlist = await this.model.findOne({ userId });
        
        if (!wishlist) {
            wishlist = await this.model.create({ userId, items: [] });
        }

        const existingItem = wishlist.items.find(item => 
            item.productId.toString() === productId &&
            (!variantId || item.variantId?.toString() === variantId)
        );

        if (existingItem) {
            throw new AppError('Item already in wishlist', 400);
        }

        wishlist.items.push({ productId, variantId });
        await wishlist.save();
        
        return await this.getWishlist(userId);
    }

    async removeItem(userId, itemId) {
        const wishlist = await this.model.findOne({ userId });
        
        if (!wishlist) {
            throw new AppError('Wishlist not found', 404);
        }

        const item = wishlist.items.id(itemId);
        
        if (item) {
            item.deleteOne();
            await wishlist.save();
        }

        return await this.getWishlist(userId);
    }

    async clearWishlist(userId) {
        const wishlist = await this.model.findOne({ userId });
        
        if (wishlist) {
            wishlist.items = [];
            await wishlist.save();
        }

        return await this.getWishlist(userId);
    }

    async isInWishlist(userId, productId, variantId = null) {
        const wishlist = await this.model.findOne({ userId }).lean();
        
        if (!wishlist) {
            return false;
        }

        return wishlist.items.some(item => 
            item.productId.toString() === productId &&
            (!variantId || item.variantId?.toString() === variantId)
        );
    }
}
