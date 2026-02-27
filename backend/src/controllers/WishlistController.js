import { BaseController } from "../core/BaseController.js";
import { WishlistService } from "../services/WishlistService.js";
import mongoose from "mongoose";
import { AppError } from "../middleware/errorHandler.js";

class WishlistController extends BaseController {
  constructor() {
    super(new WishlistService());
  }

  index = this.catchAsync(async (req, res) => {
    const userId = this.getUserId(req);
    const data = await this.service.getWishlist(userId);
    this.sendSuccess(res, data);
  });

  addItem = this.catchAsync(async (req, res) => {
    const userId = this.getUserId(req);
    const { productId } = req.body;

    if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
      throw new AppError("Valid productId is required", 400);
    }

    const data = await this.service.addItem(userId, productId);
    this.sendSuccess(res, data, 201, "Added to wishlist");
  });

  removeItem = this.catchAsync(async (req, res) => {
    const userId = this.getUserId(req);
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError("Invalid wishlist item ID", 400);
    }

    await this.service.removeItem(userId, id);
    this.sendSuccess(res, null, 200, "Removed from wishlist");
  });

  moveToCart = this.catchAsync(async (req, res) => {
    const userId = this.getUserId(req);
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError("Invalid wishlist item ID", 400);
    }

    await this.service.moveToCart(userId, id);
    this.sendSuccess(res, null, 200, "Item moved to cart");
  });

  clear = this.catchAsync(async (req, res) => {
    const userId = this.getUserId(req);
    await this.service.clearWishlist(userId);
    this.sendSuccess(res, null, 200, "Wishlist cleared");
  });
}

export const wishlistController = new WishlistController();
