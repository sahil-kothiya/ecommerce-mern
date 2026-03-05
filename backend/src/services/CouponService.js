import { Coupon } from "../models/Coupon.js";
import { BaseService } from "../core/BaseService.js";
import { AppError } from "../middleware/errorHandler.js";
import mongoose from "mongoose";

function parseNum(value, fallback = null) {
  if (value === undefined || value === null || value === "") return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseDate(value, fallback = null) {
  if (value === undefined || value === null || value === "") return fallback;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function escapeRegex(v = "") {
  return String(v).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export class CouponService extends BaseService {
  constructor() {
    super(Coupon);
  }

  normalizeCoupon(coupon = {}) {
    return {
      ...coupon,
      type:
        coupon.type ||
        (coupon.discountType === "percentage" ? "percent" : "fixed"),
      value: Number(coupon.value ?? coupon.discountValue ?? 0),
      maxDiscount: coupon.maxDiscount ?? coupon.maxDiscountAmount ?? null,
      minPurchase: Number(coupon.minPurchase ?? coupon.minOrderAmount ?? 0),
      usedCount: Number(coupon.usedCount ?? coupon.usageCount ?? 0),
      startDate: coupon.startDate ?? coupon.validFrom ?? null,
      expiryDate: coupon.expiryDate ?? coupon.validUntil ?? null,
      userUsageLimit: coupon.userUsageLimit ?? coupon.perUserLimit ?? null,
    };
  }

  async syncExpired() {
    const now = new Date();
    await this.model.updateMany(
      {
        status: "active",
        $or: [
          { expiryDate: { $ne: null, $lt: now } },
          { validUntil: { $ne: null, $lt: now } },
        ],
      },
      { $set: { status: "inactive" } },
    );
  }

  validatePayload(payload, isPartial = false) {
    const errors = [];
    const err = (field, msg) => errors.push({ field, message: msg });

    if (!isPartial || payload.code !== undefined) {
      const code = String(payload.code || "")
        .trim()
        .toUpperCase();
      if (!code) err("code", "Coupon code is required");
      else if (code.length < 3)
        err("code", "Code must be at least 3 characters");
      else if (code.length > 20)
        err("code", "Code cannot exceed 20 characters");
    }
    if (!isPartial || payload.type !== undefined) {
      if (!["fixed", "percent"].includes(payload.type))
        err("type", "Coupon type must be fixed or percent");
    }
    if (
      !isPartial ||
      payload.value !== undefined ||
      payload.type !== undefined
    ) {
      if (
        payload.value === null ||
        payload.value === undefined ||
        Number.isNaN(payload.value)
      )
        err("value", "Discount value is required");
      else if (payload.value <= 0) err("value", "Value must be greater than 0");
      else if (payload.type === "percent" && payload.value > 100)
        err("value", "Percent discount cannot exceed 100");
    }
    if (
      payload.minPurchase !== null &&
      payload.minPurchase !== undefined &&
      payload.minPurchase < 0
    )
      err("minPurchase", "Minimum purchase cannot be negative");
    if (
      payload.maxDiscount !== null &&
      payload.maxDiscount !== undefined &&
      payload.maxDiscount < 0
    )
      err("maxDiscount", "Maximum discount cannot be negative");
    if (
      payload.usageLimit !== null &&
      payload.usageLimit !== undefined &&
      payload.usageLimit < 1
    )
      err("usageLimit", "Usage limit must be at least 1");
    if (
      payload.startDate &&
      payload.expiryDate &&
      payload.startDate >= payload.expiryDate
    )
      err("expiryDate", "Expiry date must be later than start date");
    if (!["active", "inactive"].includes(payload.status))
      err("status", "Status must be active or inactive");

    return errors;
  }

  buildPayload(body, existing = null) {
    const minPurchase =
      body.minPurchase !== undefined || body.minOrderAmount !== undefined
        ? parseNum(body.minPurchase, parseNum(body.minOrderAmount, 0))
        : existing
          ? parseNum(existing.minPurchase, parseNum(existing.minOrderAmount, 0))
          : 0;

    const startDate =
      body.startDate !== undefined || body.validFrom !== undefined
        ? parseDate(body.startDate ?? body.validFrom)
        : existing
          ? existing.startDate || existing.validFrom
          : null;

    const expiryDate =
      body.expiryDate !== undefined || body.validUntil !== undefined
        ? parseDate(body.expiryDate ?? body.validUntil)
        : existing
          ? existing.expiryDate || existing.validUntil
          : null;

    const userUsageLimit =
      body.userUsageLimit !== undefined || body.perUserLimit !== undefined
        ? parseNum(body.userUsageLimit ?? body.perUserLimit, null)
        : existing
          ? parseNum(existing.userUsageLimit ?? existing.perUserLimit, null)
          : null;

    return {
      code:
        body.code !== undefined
          ? String(body.code || "")
              .trim()
              .toUpperCase()
          : existing?.code,
      type:
        body.type !== undefined
          ? String(body.type || "")
              .trim()
              .toLowerCase()
          : existing?.type,
      value: body.value !== undefined ? parseNum(body.value) : existing?.value,
      minPurchase,
      minOrderAmount: minPurchase,
      maxDiscount:
        body.maxDiscount !== undefined
          ? parseNum(body.maxDiscount, null)
          : existing?.maxDiscount,
      usageLimit:
        body.usageLimit !== undefined
          ? parseNum(body.usageLimit, null)
          : existing?.usageLimit,
      userUsageLimit,
      perUserLimit: userUsageLimit,
      startDate,
      validFrom: startDate,
      expiryDate,
      validUntil: expiryDate,
      status:
        body.status !== undefined
          ? String(body.status || "")
              .trim()
              .toLowerCase()
          : existing?.status || "active",
      description:
        body.description !== undefined
          ? String(body.description || "").trim()
          : existing?.description,
    };
  }

  async listCoupons({ page = 1, limit = 20, search, status, type } = {}) {
    await this.syncExpired();
    const query = {};
    if (search) {
      const s = escapeRegex(String(search).trim());
      query.$or = [
        { code: { $regex: s, $options: "i" } },
        { description: { $regex: s, $options: "i" } },
      ];
    }
    if (status && ["active", "inactive"].includes(status))
      query.status = status;
    if (type && ["fixed", "percent"].includes(type)) query.type = type;
    const skip = (page - 1) * limit;
    const [coupons, total] = await Promise.all([
      this.model
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.model.countDocuments(query),
    ]);
    return {
      coupons: coupons.map((c) => this.normalizeCoupon(c)),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  async getCouponById(id) {
    await this.syncExpired();
    if (!mongoose.Types.ObjectId.isValid(id))
      throw new AppError("Invalid coupon ID", 400);
    const coupon = await this.model.findById(id).lean();
    if (!coupon) throw new AppError("Coupon not found", 404);
    return this.normalizeCoupon(coupon);
  }

  async createCoupon(body) {
    const payload = this.buildPayload(body);
    const errors = this.validatePayload(payload, false);
    if (errors.length) throw new AppError("Validation failed", 422, errors);
    const created = await this.model.create(payload);
    return this.normalizeCoupon(created.toObject());
  }

  async updateCoupon(id, body) {
    if (!mongoose.Types.ObjectId.isValid(id))
      throw new AppError("Invalid coupon ID", 400);
    const coupon = await this.model.findById(id);
    if (!coupon) throw new AppError("Coupon not found", 404);

    const payload = this.buildPayload(body, coupon);
    const errors = this.validatePayload(payload, false);
    if (errors.length) throw new AppError("Validation failed", 422, errors);

    Object.assign(coupon, payload);
    await coupon.save();
    return this.normalizeCoupon(coupon.toObject());
  }

  async deleteCoupon(id) {
    if (!mongoose.Types.ObjectId.isValid(id))
      throw new AppError("Invalid coupon ID", 400);
    const coupon = await this.model.findById(id);
    if (!coupon) throw new AppError("Coupon not found", 404);
    await coupon.deleteOne();
  }

  async validateForOrder(code, total) {
    await this.syncExpired();
    const rawCode = String(code || "")
      .trim()
      .toUpperCase();
    if (!rawCode)
      throw new AppError("Coupon code is required", 422, [
        { field: "code", message: "Coupon code is required" },
      ]);

    const coupon = await this.model.findOne({ code: rawCode }).lean();
    if (!coupon)
      throw new AppError("Invalid coupon code", 400, [
        { field: "code", message: "Invalid coupon code" },
      ]);

    const c = this.normalizeCoupon(coupon);
    const now = new Date();
    if (c.status !== "active") throw new AppError("Coupon is inactive", 400);
    if (c.startDate && new Date(c.startDate) > now)
      throw new AppError("Coupon is not yet valid", 400);
    if (c.expiryDate && new Date(c.expiryDate) < now)
      throw new AppError("Coupon has expired", 400);
    if (c.usageLimit && c.usedCount >= c.usageLimit)
      throw new AppError("Coupon usage limit reached", 400);
    if (c.minPurchase && total < c.minPurchase)
      throw new AppError(
        `Minimum order amount of $${c.minPurchase} required`,
        400,
      );

    const discount =
      c.type === "percent"
        ? Math.min(
            (total * c.value) / 100,
            c.maxDiscount || Number.MAX_SAFE_INTEGER,
          )
        : c.value;

    return {
      couponId: c._id,
      code: c.code,
      type: c.type,
      value: c.value,
      discount: Math.min(Math.round(discount * 100) / 100, total),
    };
  }

  async validateCoupon(code, userId, orderAmount) {
    const rawCoupon = await this.model
      .findOne({ code: code.toUpperCase(), status: "active" })
      .lean();
    if (!rawCoupon) throw new AppError("Invalid coupon code", 400);
    const coupon = this.normalizeCoupon(rawCoupon);
    const now = new Date();
    if (coupon.startDate && new Date(coupon.startDate) > now)
      throw new AppError("Coupon is not yet valid", 400);
    if (coupon.expiryDate && new Date(coupon.expiryDate) < now)
      throw new AppError("Coupon has expired", 400);
    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit)
      throw new AppError("Coupon usage limit reached", 400);
    if (coupon.userUsageLimit && userId) {
      const userUsage =
        coupon.usedBy?.filter((u) => u.toString() === userId.toString())
          .length || 0;
      if (userUsage >= coupon.userUsageLimit)
        throw new AppError(
          "You have reached the usage limit for this coupon",
          400,
        );
    }
    if (coupon.minPurchase && orderAmount < coupon.minPurchase)
      throw new AppError(
        `Minimum order amount of $${coupon.minPurchase} required`,
        400,
      );
    return coupon;
  }

  async applyCoupon(code, userId, orderAmount) {
    const coupon = await this.validateCoupon(code, userId, orderAmount);
    let discount =
      coupon.type === "percent"
        ? (orderAmount * coupon.value) / 100
        : coupon.value;
    if (
      coupon.type === "percent" &&
      coupon.maxDiscount &&
      discount > coupon.maxDiscount
    )
      discount = coupon.maxDiscount;
    discount = Math.min(Math.round(discount * 100) / 100, orderAmount);
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
    )
      coupon.usedBy.push(userId);
    await coupon.save();
    return coupon;
  }

  async getActiveCoupons(options = {}) {
    const now = new Date();
    return this.findAll({
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
