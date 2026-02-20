import { Router } from 'express';
import mongoose from 'mongoose';
import { protect } from '../middleware/auth.js';
import { Cart } from '../models/Cart.js';
import { Product } from '../models/Product.js';

const router = Router();

const round = (value) => Math.round((Number(value) || 0) * 100) / 100;

const resolvePriceAndStock = (product, variantId = null) => {
    if (variantId) {
        const variant = product.variants.find((item) => item._id.toString() === variantId.toString());
        if (!product.hasVariants || !variant || variant.status !== 'active') {
            return null;
        }

        const unitPrice = round(variant.price * (1 - (variant.discount || 0) / 100));
        return {
            unitPrice,
            availableStock: variant.stock || 0,
            variantId: variant._id,
        };
    }

    if (product.hasVariants) {
        return null;
    }

    const unitPrice = round(product.basePrice * (1 - (product.baseDiscount || 0) / 100));
    return {
        unitPrice,
        availableStock: product.baseStock || 0,
        variantId: null,
    };
};

const buildCartPayload = (items) => {
    const normalized = items.map((item) => ({
        _id: item._id,
        userId: item.userId,
        productId: item.productId?._id || item.productId,
        product: item.productId || null,
        variantId: item.variantId || null,
        quantity: item.quantity,
        price: round(item.price),
        amount: round(item.amount),
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
    }));

    const summary = normalized.reduce(
        (acc, item) => {
            acc.totalItems += item.quantity;
            acc.subTotal += item.amount;
            return acc;
        },
        { totalItems: 0, subTotal: 0 }
    );

    summary.subTotal = round(summary.subTotal);
    summary.shippingCost = summary.subTotal >= 100 || summary.subTotal === 0 ? 0 : 10;
    summary.totalAmount = round(summary.subTotal + summary.shippingCost);

    return { items: normalized, summary };
};

router.use(protect);

router.get('/', async (req, res, next) => {
    try {
        const userId = req.user.id;
        const items = await Cart.find({ userId }).populate('productId').sort({ createdAt: -1 }).lean();

        return res.json({
            success: true,
            data: buildCartPayload(items),
        });
    } catch (error) {
        return next(error);
    }
});

router.post('/', async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { productId, variantId = null, quantity = 1 } = req.body;
        const parsedQuantity = Number.parseInt(quantity, 10);

        if (!mongoose.Types.ObjectId.isValid(productId)) {
            return res.status(400).json({ success: false, message: 'Invalid product ID' });
        }

        if (variantId && !mongoose.Types.ObjectId.isValid(variantId)) {
            return res.status(400).json({ success: false, message: 'Invalid variant ID' });
        }

        if (!Number.isInteger(parsedQuantity) || parsedQuantity < 1) {
            return res.status(400).json({ success: false, message: 'Quantity must be at least 1' });
        }

        const product = await Product.findOne({ _id: productId, status: 'active' });
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        const pricing = resolvePriceAndStock(product, variantId);
        if (!pricing) {
            return res.status(400).json({ success: false, message: 'Invalid product variant selection' });
        }

        const existing = await Cart.findOne({
            userId,
            productId,
            variantId: pricing.variantId,
        });

        const nextQuantity = (existing?.quantity || 0) + parsedQuantity;
        if (nextQuantity > pricing.availableStock) {
            return res.status(400).json({
                success: false,
                message: `Only ${pricing.availableStock} item(s) available in stock`,
            });
        }

        if (existing) {
            existing.quantity = nextQuantity;
            existing.price = pricing.unitPrice;
            await existing.save();
        } else {
            await Cart.create({
                userId,
                productId,
                variantId: pricing.variantId,
                quantity: parsedQuantity,
                price: pricing.unitPrice,
                amount: round(pricing.unitPrice * parsedQuantity),
            });
        }

        const items = await Cart.find({ userId }).populate('productId').sort({ createdAt: -1 }).lean();
        return res.status(201).json({
            success: true,
            message: 'Item added to cart',
            data: buildCartPayload(items),
        });
    } catch (error) {
        return next(error);
    }
});

router.put('/:id', async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const { quantity } = req.body;
        const parsedQuantity = Number.parseInt(quantity, 10);

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'Invalid cart item ID' });
        }

        if (!Number.isInteger(parsedQuantity) || parsedQuantity < 1) {
            return res.status(400).json({ success: false, message: 'Quantity must be at least 1' });
        }

        const cartItem = await Cart.findOne({ _id: id, userId });
        if (!cartItem) {
            return res.status(404).json({ success: false, message: 'Cart item not found' });
        }

        const product = await Product.findOne({ _id: cartItem.productId, status: 'active' });
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product is no longer available' });
        }

        const pricing = resolvePriceAndStock(product, cartItem.variantId);
        if (!pricing) {
            return res.status(400).json({ success: false, message: 'Invalid product variant selection' });
        }

        if (parsedQuantity > pricing.availableStock) {
            return res.status(400).json({
                success: false,
                message: `Only ${pricing.availableStock} item(s) available in stock`,
            });
        }

        cartItem.quantity = parsedQuantity;
        cartItem.price = pricing.unitPrice;
        await cartItem.save();

        const items = await Cart.find({ userId }).populate('productId').sort({ createdAt: -1 }).lean();
        return res.json({
            success: true,
            message: 'Cart item updated',
            data: buildCartPayload(items),
        });
    } catch (error) {
        return next(error);
    }
});

router.delete('/:id', async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'Invalid cart item ID' });
        }

        await Cart.deleteOne({ _id: id, userId });

        const items = await Cart.find({ userId }).populate('productId').sort({ createdAt: -1 }).lean();
        return res.json({
            success: true,
            message: 'Item removed from cart',
            data: buildCartPayload(items),
        });
    } catch (error) {
        return next(error);
    }
});

router.delete('/', async (req, res, next) => {
    try {
        const userId = req.user.id;
        await Cart.deleteMany({ userId });
        return res.json({
            success: true,
            message: 'Cart cleared',
            data: buildCartPayload([]),
        });
    } catch (error) {
        return next(error);
    }
});

export default router;
