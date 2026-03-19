import { BaseRepository } from "./BaseRepository.js";
import { Discount } from "../models/Discount.js";

export class DiscountRepository extends BaseRepository {
  constructor() {
    super(Discount);
  }

  async findActiveForProduct(productId) {
    return this.find({
      products: productId,
      isActive: true,
      $and: [
        { $or: [{ endDate: null }, { endDate: { $gt: new Date() } }] },
        { $or: [{ startDate: null }, { startDate: { $lte: new Date() } }] },
      ],
    });
  }

  async findActiveForCategory(categoryId) {
    return this.find({
      categories: categoryId,
      isActive: true,
      $or: [{ endDate: null }, { endDate: { $gt: new Date() } }],
    });
  }
}
