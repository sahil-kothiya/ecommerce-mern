import { BaseRepository } from "./BaseRepository.js";
import { Review } from "../models/Review.js";

export class ReviewRepository extends BaseRepository {
  constructor() {
    super(Review);
  }

  async findByProduct(productId, options = {}) {
    return this.findAll({ filter: { product: productId }, ...options });
  }

  async findByUser(userId, options = {}) {
    return this.findAll({ filter: { user: userId }, ...options });
  }

  async findByProductAndUser(productId, userId) {
    return this.findOne({ product: productId, user: userId });
  }

  async getAverageRating(productId) {
    const result = await this.aggregate([
      { $match: { product: productId } },
      {
        $group: { _id: null, average: { $avg: "$rating" }, count: { $sum: 1 } },
      },
    ]);
    return result[0] || { average: 0, count: 0 };
  }

  async getRatingDistribution(productId) {
    const result = await this.aggregate([
      { $match: { product: productId } },
      { $group: { _id: "$rating", count: { $sum: 1 } } },
    ]);
    const dist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    result.forEach(({ _id, count }) => {
      dist[_id] = count;
    });
    return dist;
  }
}
