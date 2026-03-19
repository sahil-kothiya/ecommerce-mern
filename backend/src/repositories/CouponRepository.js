import { BaseRepository } from "./BaseRepository.js";
import { Coupon } from "../models/Coupon.js";

export class CouponRepository extends BaseRepository {
  constructor() {
    super(Coupon);
  }

  async findByCode(code) {
    return this.findOne({ code: String(code).toUpperCase().trim() });
  }

  async findActiveByCode(code) {
    return this.findOne({
      code: String(code).toUpperCase().trim(),
      isActive: true,
      $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
    });
  }

  async incrementUsage(id, userId) {
    return this.findOneAndUpdate(
      { _id: id },
      { $inc: { usedCount: 1 }, $addToSet: { usedBy: userId } },
    );
  }
}
