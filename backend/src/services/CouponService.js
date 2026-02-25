import { Coupon } from "../models/Coupon.js";
import { BaseService } from "../core/BaseService.js";
import { AppError } from "../middleware/errorHandler.js";

export class CouponService extends BaseService {
  constructor() {
    super(Coupon);
  }

  normalizeCoupon(coupon = {}) {
    const type =
      coupon.type ||
      (coupon.discountType === "percentage" ? "percent" : "fixed");
    const value = Number(coupon.value ?? coupon.discountValue ?? 0);
    const maxDiscount = coupon.maxDiscount ?? coupon.maxDiscountAmount ?? null;
    const minPurchase = Number(
      coupon.minPurchase ?? coupon.minOrderAmount ?? 0,
    );
    const usedCount = Number(coupon.usedCount ?? coupon.usageCount ?? 0);
    const startDate = coupon.startDate ?? coupon.validFrom ?? null;
    const expiryDate = coupon.expiryDate ?? coupon.validUntil ?? null;

    return {
      ...coupon,
      type,
      value,
      maxDiscount,
      minPurchase,
      usedCount,
      startDate,
      expiryDate,
    };
  }

  async createCoupon(couponData) {
    const existing = await this.model.findOne({ code: couponData.code }).lean();

    if (existing) {
      throw new AppError("Coupon code already exists", 400);
    }

    const startDate = couponData.startDate ?? couponData.validFrom;
    const expiryDate = couponData.expiryDate ?? couponData.validUntil;

    if (startDate && expiryDate) {
      if (new Date(startDate) >= new Date(expiryDate)) {
        throw new AppError(
          "Valid until date must be after valid from date",
          400,
        );
      }
    }

    return await this.create({
      ...couponData,
      minPurchase: couponData.minPurchase ?? couponData.minOrderAmount ?? 0,
      minOrderAmount: couponData.minPurchase ?? couponData.minOrderAmount ?? 0,
      startDate,
      validFrom: startDate,
      expiryDate,
      validUntil: expiryDate,
    });
  }

  async validateCoupon(code, userId, orderAmount) {
    const rawCoupon = await this.model
      .findOne({
        code: code.toUpperCase(),
        status: "active",
      })
      .lean();

    const coupon = this.normalizeCoupon(rawCoupon);

    if (!coupon) {
      throw new AppError("Invalid coupon code", 400);
    }

    const now = new Date();

    if (coupon.startDate && new Date(coupon.startDate) > now) {
      throw new AppError("Coupon is not yet valid", 400);
    }

    if (coupon.expiryDate && new Date(coupon.expiryDate) < now) {
      throw new AppError("Coupon has expired", 400);
    }

    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      throw new AppError("Coupon usage limit reached", 400);
    }

    if (coupon.userUsageLimit && userId) {
      const userUsage =
        coupon.usedBy?.filter((u) => u.toString() === userId.toString())
          .length || 0;

      if (userUsage >= coupon.userUsageLimit) {
        throw new AppError(
          "You have reached the usage limit for this coupon",
          400,
        );
      }
    }

    if (coupon.minPurchase && orderAmount < coupon.minPurchase) {
      throw new AppError(
        `Minimum order amount of $${coupon.minPurchase} required`,
        400,
      );
    }

    return coupon;
  }

  async applyCoupon(code, userId, orderAmount) {
    const coupon = await this.validateCoupon(code, userId, orderAmount);

    let discount = 0;

    if (coupon.type === "percent") {
      discount = (orderAmount * coupon.value) / 100;

      if (coupon.maxDiscount && discount > coupon.maxDiscount) {
        discount = coupon.maxDiscount;
      }
    } else {
      discount = coupon.value;
    }

    discount = Math.round(discount * 100) / 100;

    return {
      couponId: coupon._id,
      code: coupon.code,
      discount,
      discountType: coupon.type,
      discountValue: coupon.value,
    };
  }

  async markCouponAsUsed(couponId, userId) {
    const coupon = await this.findByIdOrFail(couponId);

    coupon.usedCount = Number(coupon.usedCount ?? coupon.usageCount ?? 0) + 1;
    coupon.usageCount = coupon.usedCount;

    if (
      userId &&
      Array.isArray(coupon.usedBy) &&
      !coupon.usedBy.includes(userId)
    ) {
      coupon.usedBy.push(userId);
    }

    await coupon.save();
    return coupon;
  }

  async getActiveCoupons(options = {}) {
    const now = new Date();

    return await this.findAll({
      ...options,
      filter: {
        status: "active",
        $or: [
          { startDate: null, expiryDate: null },
          { validFrom: null, validUntil: null },
          { startDate: { $lte: now }, expiryDate: { $gte: now } },
          { validFrom: { $lte: now }, validUntil: { $gte: now } },
        ],
        ...options.filter,
      },
    });
  }
}
