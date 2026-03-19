import { BaseRepository } from "./BaseRepository.js";
import { Cart } from "../models/Cart.js";

export class CartRepository extends BaseRepository {
  constructor() {
    super(Cart);
  }

  async findByUser(userId, options = {}) {
    return this.findOne({ user: userId }, options);
  }

  async findByUserOrCreate(userId) {
    let cart = await this.findOne({ user: userId }, { lean: false });
    if (!cart) {
      [cart] = await this.model.create([{ user: userId, items: [] }]);
    }
    return cart;
  }

  async clearByUser(userId) {
    return this.findOneAndUpdate({ user: userId }, { items: [] });
  }
}
