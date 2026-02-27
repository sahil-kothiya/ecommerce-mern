import { BaseController } from "../core/BaseController.js";
import { CartService } from "../services/CartService.js";
import mongoose from "mongoose";

export class CartController extends BaseController {
  constructor() {
    super(new CartService());
  }

  index = this.catchAsync(async (req, res) => {
    const userId = this.getUserId(req);
    const data = await this.service.getCartForUser(userId);
    this.sendSuccess(res, data);
  });

  addItem = this.catchAsync(async (req, res) => {
    const userId = this.getUserId(req);
    const { productId, variantId = null, quantity = 1 } = req.body;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid product ID" });
    }
    if (variantId && !mongoose.Types.ObjectId.isValid(variantId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid variant ID" });
    }

    const data = await this.service.addItem(userId, {
      productId,
      variantId,
      quantity,
    });
    this.sendSuccess(res, data, 201, "Item added to cart");
  });

  updateItem = this.catchAsync(async (req, res) => {
    const userId = this.getUserId(req);
    const { id } = req.params;
    const { quantity } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid cart item ID" });
    }

    const data = await this.service.updateItemQuantity(userId, id, quantity);
    this.sendSuccess(res, data, 200, "Cart item updated");
  });

  removeItem = this.catchAsync(async (req, res) => {
    const userId = this.getUserId(req);
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid cart item ID" });
    }

    const data = await this.service.removeItem(userId, id);
    this.sendSuccess(res, data, 200, "Item removed from cart");
  });

  clear = this.catchAsync(async (req, res) => {
    const userId = this.getUserId(req);
    const data = await this.service.clearCart(userId);
    this.sendSuccess(res, data, 200, "Cart cleared");
  });
}

export const cartController = new CartController();
