import { Cart } from "../models/Cart.js";
import { Product } from "../models/Product.js";
import { BaseService } from "../core/BaseService.js";
import { AppError } from "../middleware/errorHandler.js";

const round = (value) => Math.round((Number(value) || 0) * 100) / 100;

const toComparableId = (value) => {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (typeof value === "object" && value._id) return value._id.toString();
  return value.toString();
};

const getSelectedVariant = (product, variantId) => {
  if (!product?.hasVariants || !variantId) return null;
  const targetId = toComparableId(variantId);
  if (!targetId || !Array.isArray(product.variants)) return null;
  return (
    product.variants.find((v) => toComparableId(v?._id) === targetId) || null
  );
};

const resolvePriceAndStock = (product, variantId = null) => {
  if (variantId) {
    const variant = product.variants.find(
      (v) => v._id.toString() === variantId.toString(),
    );
    if (!product.hasVariants || !variant || variant.status !== "active")
      return null;
    return {
      unitPrice: round(variant.price * (1 - (variant.discount || 0) / 100)),
      availableStock: variant.stock || 0,
      variantId: variant._id,
    };
  }
  if (product.hasVariants) return null;
  return {
    unitPrice: round(
      product.basePrice * (1 - (product.baseDiscount || 0) / 100),
    ),
    availableStock: product.baseStock || 0,
    variantId: null,
  };
};

export const buildCartPayload = (items) => {
  const normalized = items.map((item) => {
    const product = item.productId || null;
    const variant = getSelectedVariant(product, item.variantId);
    const variantPrice = Number(variant?.price || 0);
    const variantDiscount = Number(variant?.discount || 0);
    const unitFinalPrice = round(item.price);
    const unitMrpPrice = round(
      variant
        ? variantPrice
        : Number(product?.basePrice || product?.price || unitFinalPrice),
    );
    const unitDiscountPercent = round(
      variant
        ? variantDiscount
        : Number(product?.baseDiscount || product?.discount || 0),
    );
    const unitDiscountAmount = round(
      Math.max(0, unitMrpPrice - unitFinalPrice),
    );
    const lineMrpAmount = round(unitMrpPrice * item.quantity);
    const lineFinalAmount = round(item.amount);
    const lineDiscountAmount = round(
      Math.max(0, lineMrpAmount - lineFinalAmount),
    );

    return {
      _id: item._id,
      userId: item.userId,
      productId: item.productId?._id || item.productId,
      product,
      variantId: item.variantId || null,
      variant: variant
        ? {
            _id: variant._id,
            sku: variant.sku || null,
            displayName: variant.displayName || null,
            options: Array.isArray(variant.options) ? variant.options : [],
            images: Array.isArray(variant.images) ? variant.images : [],
            stock: Number(variant.stock || 0),
            price: round(variantPrice),
            discount: round(variantDiscount),
            finalPrice: round(variantPrice * (1 - variantDiscount / 100)),
          }
        : null,
      quantity: item.quantity,
      price: unitFinalPrice,
      amount: lineFinalAmount,
      unitMrpPrice,
      unitFinalPrice,
      unitDiscountAmount,
      unitDiscountPercent,
      lineMrpAmount,
      lineFinalAmount,
      lineDiscountAmount,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  });

  const summary = normalized.reduce(
    (acc, item) => {
      acc.totalItems += item.quantity;
      acc.subTotal += item.amount;
      acc.mrpTotal += item.lineMrpAmount;
      acc.discountTotal += item.lineDiscountAmount;
      return acc;
    },
    { totalItems: 0, subTotal: 0, mrpTotal: 0, discountTotal: 0 },
  );

  summary.mrpTotal = round(summary.mrpTotal);
  summary.discountTotal = round(summary.discountTotal);
  summary.subTotal = round(summary.subTotal);
  summary.shippingCost =
    summary.subTotal >= 100 || summary.subTotal === 0 ? 0 : 10;
  summary.totalAmount = round(summary.subTotal + summary.shippingCost);

  return { items: normalized, summary };
};

export class CartService extends BaseService {
  constructor() {
    super(Cart);
  }

  async getCartForUser(userId) {
    const items = await Cart.find({ userId })
      .populate(
        "productId",
        "title slug images basePrice baseDiscount baseStock hasVariants variants status",
      )
      .sort({ createdAt: -1 })
      .lean();
    return buildCartPayload(items);
  }

  async addItem(userId, { productId, variantId = null, quantity = 1 }) {
    const parsedQuantity = Number.parseInt(quantity, 10);
    if (!Number.isInteger(parsedQuantity) || parsedQuantity < 1) {
      throw new AppError("Quantity must be at least 1", 400);
    }

    const product = await Product.findById(productId).lean();
    if (!product) throw new AppError("Product not found", 404);
    if (product.status !== "active") {
      throw new AppError(
        "Product is inactive and cannot be added to cart",
        400,
      );
    }

    const pricing = resolvePriceAndStock(product, variantId);
    if (!pricing) throw new AppError("Invalid product variant selection", 400);

    const existing = await Cart.findOne({
      userId,
      productId,
      variantId: pricing.variantId,
    });

    const nextQuantity = (existing?.quantity || 0) + parsedQuantity;
    if (nextQuantity > pricing.availableStock) {
      throw new AppError(
        `Only ${pricing.availableStock} item(s) available in stock`,
        400,
      );
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

    return this.getCartForUser(userId);
  }

  async updateItemQuantity(userId, cartItemId, quantity) {
    const parsedQuantity = Number.parseInt(quantity, 10);
    if (!Number.isInteger(parsedQuantity) || parsedQuantity < 1) {
      throw new AppError("Quantity must be at least 1", 400);
    }

    const cartItem = await Cart.findOne({ _id: cartItemId, userId });
    if (!cartItem) throw new AppError("Cart item not found", 404);

    const product = await Product.findOne({
      _id: cartItem.productId,
      status: "active",
    }).lean();
    if (!product) throw new AppError("Product is no longer available", 404);

    const pricing = resolvePriceAndStock(product, cartItem.variantId);
    if (!pricing) throw new AppError("Invalid product variant selection", 400);

    if (parsedQuantity > pricing.availableStock) {
      throw new AppError(
        `Only ${pricing.availableStock} item(s) available in stock`,
        400,
      );
    }

    cartItem.quantity = parsedQuantity;
    cartItem.price = pricing.unitPrice;
    await cartItem.save();

    return this.getCartForUser(userId);
  }

  async removeItem(userId, cartItemId) {
    await Cart.deleteOne({ _id: cartItemId, userId });
    return this.getCartForUser(userId);
  }

  async clearCart(userId) {
    await Cart.deleteMany({ userId });
    return buildCartPayload([]);
  }
}
