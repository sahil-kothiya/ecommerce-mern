import { Wishlist } from "../models/Wishlist.js";
import { Cart } from "../models/Cart.js";
import { Product } from "../models/Product.js";
import { BaseService } from "../core/BaseService.js";
import { AppError } from "../middleware/errorHandler.js";

const round = (value) => Math.round((Number(value) || 0) * 100) / 100;

export class WishlistService extends BaseService {
  constructor() {
    super(Wishlist);
  }

  async getWishlist(userId) {
    const items = await Wishlist.find({ userId })
      .populate(
        "productId",
        "title slug images basePrice baseDiscount baseStock hasVariants variants status",
      )
      .sort({ createdAt: -1 })
      .lean();
    return { items, count: items.length };
  }

  async addItem(userId, productId) {
    const item = await Wishlist.findOneAndUpdate(
      { userId, productId },
      { $setOnInsert: { userId, productId } },
      { new: true, upsert: true },
    )
      .populate(
        "productId",
        "title slug images basePrice baseDiscount baseStock hasVariants variants status",
      )
      .lean();
    return item;
  }

  async removeItem(userId, id) {
    const deleteQuery = { userId, $or: [{ _id: id }, { productId: id }] };
    const deleted = await Wishlist.findOneAndDelete(deleteQuery);
    if (!deleted) throw new AppError("Wishlist item not found", 404);
  }

  async moveToCart(userId, wishlistItemId) {
    const wishlistItem = await Wishlist.findOne({
      _id: wishlistItemId,
      userId,
    }).lean();
    if (!wishlistItem) throw new AppError("Wishlist item not found", 404);

    const product = await Product.findOne({
      _id: wishlistItem.productId,
      status: "active",
    }).lean();
    if (!product) throw new AppError("Product is no longer available", 404);
    if (product.hasVariants) {
      throw new AppError(
        "Please select a variant from product page before adding to cart",
        400,
      );
    }

    const unitPrice = round(
      product.basePrice * (1 - (product.baseDiscount || 0) / 100),
    );
    const availableStock = Number(product.baseStock || 0);
    if (availableStock < 1) throw new AppError("Product is out of stock", 400);

    const existingCartItem = await Cart.findOne({
      userId,
      productId: product._id,
      variantId: null,
    });

    const nextQuantity = (existingCartItem?.quantity || 0) + 1;
    if (nextQuantity > availableStock) {
      throw new AppError(
        `Only ${availableStock} item(s) available in stock`,
        400,
      );
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
  }

  async clearWishlist(userId) {
    await Wishlist.deleteMany({ userId });
  }
}
