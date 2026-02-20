import { Router } from 'express';
import mongoose from 'mongoose';
import { protect } from '../middleware/auth.js';
import { Wishlist } from '../models/Wishlist.js';
import { Cart } from '../models/Cart.js';
import { Product } from '../models/Product.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();
const round = (value) => Math.round((Number(value) || 0) * 100) / 100;

router.use(protect);

router.get('/', async (req, res, next) => {
    try {
        const userId = req.user?._id || req.user?.id;
        const items = await Wishlist.find({ userId })
            .populate('productId')
            .sort({ createdAt: -1 })
            .lean();

        res.json({
            success: true,
            data: {
                items,
                count: items.length,
            },
        });
    } catch (error) {
        next(new AppError('Failed to fetch wishlist', 500));
    }
});

router.post('/', async (req, res, next) => {
    try {
        const userId = req.user?._id || req.user?.id;
        const { productId } = req.body;

        if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
            return next(new AppError('Valid productId is required', 400));
        }

        const item = await Wishlist.findOneAndUpdate(
            { userId, productId },
            { $setOnInsert: { userId, productId } },
            { new: true, upsert: true }
        ).populate('productId');

        res.status(201).json({
            success: true,
            message: 'Added to wishlist',
            data: item,
        });
    } catch (error) {
        next(new AppError('Failed to add to wishlist', 500));
    }
});

router.delete('/:id', async (req, res, next) => {
    try {
        const userId = req.user?._id || req.user?.id;
        const { id } = req.params;

        const deleteQuery = mongoose.Types.ObjectId.isValid(id)
            ? { userId, $or: [{ _id: id }, { productId: id }] }
            : { userId, _id: null };

        const deleted = await Wishlist.findOneAndDelete(deleteQuery);
        if (!deleted) {
            return next(new AppError('Wishlist item not found', 404));
        }

        res.json({
            success: true,
            message: 'Removed from wishlist',
        });
    } catch (error) {
        next(new AppError('Failed to remove wishlist item', 500));
    }
});

router.post('/:id/move-to-cart', async (req, res, next) => {
    try {
        const userId = req.user?._id || req.user?.id;
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return next(new AppError('Invalid wishlist item ID', 400));
        }

        const wishlistItem = await Wishlist.findOne({ _id: id, userId }).lean();
        if (!wishlistItem) {
            return next(new AppError('Wishlist item not found', 404));
        }

        const product = await Product.findOne({ _id: wishlistItem.productId, status: 'active' }).lean();
        if (!product) {
            return next(new AppError('Product is no longer available', 404));
        }

        if (product.hasVariants) {
            return next(new AppError('Please select a variant from product page before adding to cart', 400));
        }

        const unitPrice = round(product.basePrice * (1 - (product.baseDiscount || 0) / 100));
        const availableStock = Number(product.baseStock || 0);

        if (availableStock < 1) {
            return next(new AppError('Product is out of stock', 400));
        }

        const existingCartItem = await Cart.findOne({
            userId,
            productId: product._id,
            variantId: null,
        });

        const nextQuantity = (existingCartItem?.quantity || 0) + 1;
        if (nextQuantity > availableStock) {
            return next(new AppError(`Only ${availableStock} item(s) available in stock`, 400));
        }

        if (existingCartItem) {
            existingCartItem.quantity = nextQuantity;
            existingCartItem.price = unitPrice;
            existingCartItem.amount = round(unitPrice * nextQuantity);
            await existingCartItem.save();
        } else {
            await Cart.create({
                userId,
                productId: product._id,
                variantId: null,
                quantity: 1,
                price: unitPrice,
                amount: unitPrice,
            });
        }

        await Wishlist.deleteOne({ _id: wishlistItem._id, userId });

        res.json({
            success: true,
            message: 'Item moved to cart',
        });
    } catch (error) {
        next(new AppError('Failed to move wishlist item to cart', 500));
    }
});

router.delete('/', async (req, res, next) => {
    try {
        const userId = req.user?._id || req.user?.id;
        await Wishlist.deleteMany({ userId });

        res.json({
            success: true,
            message: 'Wishlist cleared',
        });
    } catch (error) {
        next(new AppError('Failed to clear wishlist', 500));
    }
});

export default router;
