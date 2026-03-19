import { BaseRepository } from "./BaseRepository.js";
import { Wishlist } from "../models/Wishlist.js";

export class WishlistRepository extends BaseRepository {
  constructor() {
    super(Wishlist);
  }

  async findByUser(userId, options = {}) {
    return this.findOne({ user: userId }, options);
  }

  async addItem(userId, productId) {
    return this.findOneAndUpdate(
      { user: userId },
      { $addToSet: { products: productId } },
      { upsert: true },
    );
  }

  async removeItem(userId, productId) {
    return this.findOneAndUpdate(
      { user: userId },
      { $pull: { products: productId } },
    );
  }

  async hasItem(userId, productId) {
    return this.exists({ user: userId, products: productId });
  }
}
