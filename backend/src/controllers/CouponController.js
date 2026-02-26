import mongoose from "mongoose";
import { Coupon } from "../models/Coupon.js";
import { AppError } from "../middleware/errorHandler.js";
import { logger } from "../utils/logger.js";

export class CouponController {
  normalizeCouponPayload(rawCoupon = {}) {
    const minPurchase = this.parseNumber(
      rawCoupon.minPurchase,
      this.parseNumber(rawCoupon.minOrderAmount, 0),
    );
    const startDate = rawCoupon.startDate ?? rawCoupon.validFrom ?? null;
    const expiryDate = rawCoupon.expiryDate ?? rawCoupon.validUntil ?? null;
    const usedCount = this.parseNumber(
      rawCoupon.usedCount,
      this.parseNumber(rawCoupon.usageCount, 0),
    );
    const userUsageLimit = this.parseNumber(
      rawCoupon.userUsageLimit,
      this.parseNumber(rawCoupon.perUserLimit, null),
    );

    return {
      ...rawCoupon,
      minPurchase,
      startDate,
      expiryDate,
      usedCount,
      userUsageLimit,
    };
  }

  async syncExpiredCouponsStatus() {
    const now = new Date();
    await Coupon.updateMany(
      {
        status: "active",
        $or: [
          { expiryDate: { $ne: null, $lt: now } },
          { validUntil: { $ne: null, $lt: now } },
        ],
      },
      {
        $set: { status: "inactive" },
      },
    );
  }

  createFieldError(field, message) {
    return { field, message };
  }

  parseNumber(value, fallback = null) {
    if (value === undefined || value === null || value === "") return fallback;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  escapeRegex(value = "") {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  parseDate(value, fallback = null) {
    if (value === undefined || value === null || value === "") return fallback;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  validatePayload(payload, isPartial = false) {
    const errors = [];

    if (!isPartial || payload.code !== undefined) {
      const code = String(payload.code || "")
        .trim()
        .toUpperCase();
      if (!code)
        errors.push(this.createFieldError("code", "Coupon code is required"));
      else if (code.length < 3)
        errors.push(
          this.createFieldError("code", "Code must be at least 3 characters"),
        );
      else if (code.length > 20)
        errors.push(
          this.createFieldError("code", "Code cannot exceed 20 characters"),
        );
    }

    if (!isPartial || payload.type !== undefined) {
      if (!["fixed", "percent"].includes(payload.type)) {
        errors.push(
          this.createFieldError("type", "Coupon type must be fixed or percent"),
        );
      }
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
      ) {
        errors.push(
          this.createFieldError("value", "Discount value is required"),
        );
      } else if (payload.value <= 0) {
        errors.push(
          this.createFieldError("value", "Value must be greater than 0"),
        );
      } else if (payload.type === "percent" && payload.value > 100) {
        errors.push(
          this.createFieldError("value", "Percent discount cannot exceed 100"),
        );
      }
    }

    if (
      payload.minPurchase !== null &&
      payload.minPurchase !== undefined &&
      payload.minPurchase < 0
    ) {
      errors.push(
        this.createFieldError(
          "minPurchase",
          "Minimum purchase cannot be negative",
        ),
      );
    }

    if (
      payload.maxDiscount !== null &&
      payload.maxDiscount !== undefined &&
      payload.maxDiscount < 0
    ) {
      errors.push(
        this.createFieldError(
          "maxDiscount",
          "Maximum discount cannot be negative",
        ),
      );
    }

    if (
      payload.usageLimit !== null &&
      payload.usageLimit !== undefined &&
      payload.usageLimit < 1
    ) {
      errors.push(
        this.createFieldError("usageLimit", "Usage limit must be at least 1"),
      );
    }

    if (
      payload.startDate &&
      payload.expiryDate &&
      payload.startDate >= payload.expiryDate
    ) {
      errors.push(
        this.createFieldError(
          "expiryDate",
          "Expiry date must be later than start date",
        ),
      );
    }

    if (!["active", "inactive"].includes(payload.status)) {
      errors.push(
        this.createFieldError("status", "Status must be active or inactive"),
      );
    }

    return errors;
  }

  async index(req, res, next) {
    try {
      await this.syncExpiredCouponsStatus();
      res.set(
        "Cache-Control",
        "no-store, no-cache, must-revalidate, proxy-revalidate",
      );
      res.set("Pragma", "no-cache");
      res.set("Expires", "0");

      const page = Math.max(1, Number(req.query.page) || 1);
      const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 20));
      const skip = (page - 1) * limit;

      const query = {};
      if (req.query.search) {
        const search = this.escapeRegex(String(req.query.search).trim());
        query.$or = [
          { code: { $regex: search, $options: "i" } },
          { description: { $regex: search, $options: "i" } },
        ];
      }
      if (
        req.query.status &&
        ["active", "inactive"].includes(req.query.status)
      ) {
        query.status = req.query.status;
      }
      if (req.query.type && ["fixed", "percent"].includes(req.query.type)) {
        query.type = req.query.type;
      }

      const [coupons, total] = await Promise.all([
        Coupon.find(query)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        Coupon.countDocuments(query),
      ]);

      const normalizedCoupons = coupons.map((coupon) =>
        this.normalizeCouponPayload(coupon),
      );

      res.json({
        success: true,
        data: {
          coupons: normalizedCoupons,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
          },
        },
      });
    } catch (error) {
      next(new AppError("Failed to fetch coupons", 500));
    }
  }

  async show(req, res, next) {
    try {
      await this.syncExpiredCouponsStatus();
      res.set(
        "Cache-Control",
        "no-store, no-cache, must-revalidate, proxy-revalidate",
      );
      res.set("Pragma", "no-cache");
      res.set("Expires", "0");

      const { id } = req.params;
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return next(new AppError("Invalid coupon ID", 400));
      }

      const coupon = await Coupon.findById(id).lean();
      if (!coupon) {
        return next(new AppError("Coupon not found", 404));
      }

      res.json({ success: true, data: this.normalizeCouponPayload(coupon) });
    } catch (error) {
      next(new AppError("Failed to fetch coupon", 500));
    }
  }

  async create(req, res, next) {
    try {
      const minPurchaseValue = this.parseNumber(
        req.body.minPurchase,
        this.parseNumber(req.body.minOrderAmount, 0),
      );
      const startDateValue = this.parseDate(
        req.body.startDate ?? req.body.validFrom,
        null,
      );
      const expiryDateValue = this.parseDate(
        req.body.expiryDate ?? req.body.validUntil,
        null,
      );

      const payload = {
        code: String(req.body.code || "")
          .trim()
          .toUpperCase(),
        type: String(req.body.type || "")
          .trim()
          .toLowerCase(),
        value: this.parseNumber(req.body.value),
        minPurchase: minPurchaseValue,
        minOrderAmount: minPurchaseValue,
        maxDiscount: this.parseNumber(req.body.maxDiscount, null),
        usageLimit: this.parseNumber(req.body.usageLimit, null),
        startDate: startDateValue,
        validFrom: startDateValue,
        expiryDate: expiryDateValue,
        validUntil: expiryDateValue,
        status: String(req.body.status || "active")
          .trim()
          .toLowerCase(),
        description: String(req.body.description || "").trim(),
      };

      const errors = this.validatePayload(payload, false);
      if (errors.length > 0) {
        return next(new AppError("Validation failed", 422, errors));
      }

      const created = await Coupon.create(payload);
      return res.status(201).json({
        success: true,
        message: "Coupon created successfully",
        data: this.normalizeCouponPayload(created.toObject()),
      });
    } catch (error) {
      if (error?.code === 11000) {
        return next(
          new AppError("Coupon code already exists", 409, [
            this.createFieldError("code", "Coupon code already exists"),
          ]),
        );
      }
      if (error?.name === "ValidationError") {
        const errors = Object.entries(error.errors || {}).map(
          ([field, item]) => ({
            field,
            message: item?.message || "Invalid value",
          }),
        );
        return next(new AppError("Validation failed", 422, errors));
      }
      return next(new AppError("Failed to create coupon", 500));
    }
  }

  async update(req, res, next) {
    try {
      const { id } = req.params;
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return next(new AppError("Invalid coupon ID", 400));
      }

      logger.debug(
        `[Coupon:update] id=${id} incoming minPurchase=${req.body?.minPurchase} minOrderAmount=${req.body?.minOrderAmount}`,
      );

      const coupon = await Coupon.findById(id);
      if (!coupon) {
        return next(new AppError("Coupon not found", 404));
      }

      const minPurchaseValue =
        req.body.minPurchase !== undefined ||
        req.body.minOrderAmount !== undefined
          ? this.parseNumber(
              req.body.minPurchase,
              this.parseNumber(req.body.minOrderAmount, 0),
            )
          : this.parseNumber(
              coupon.minPurchase,
              this.parseNumber(coupon.minOrderAmount, 0),
            );
      const startDateValue =
        req.body.startDate !== undefined || req.body.validFrom !== undefined
          ? this.parseDate(req.body.startDate ?? req.body.validFrom, null)
          : coupon.startDate || coupon.validFrom;
      const expiryDateValue =
        req.body.expiryDate !== undefined || req.body.validUntil !== undefined
          ? this.parseDate(req.body.expiryDate ?? req.body.validUntil, null)
          : coupon.expiryDate || coupon.validUntil;

      logger.debug(
        `[Coupon:update] id=${id} resolved minPurchase=${minPurchaseValue} current minPurchase=${coupon.minPurchase} current minOrderAmount=${coupon.minOrderAmount}`,
      );

      const payload = {
        code:
          req.body.code !== undefined
            ? String(req.body.code || "")
                .trim()
                .toUpperCase()
            : coupon.code,
        type:
          req.body.type !== undefined
            ? String(req.body.type || "")
                .trim()
                .toLowerCase()
            : coupon.type,
        value:
          req.body.value !== undefined
            ? this.parseNumber(req.body.value)
            : coupon.value,
        minPurchase: minPurchaseValue,
        minOrderAmount: minPurchaseValue,
        maxDiscount:
          req.body.maxDiscount !== undefined
            ? this.parseNumber(req.body.maxDiscount, null)
            : coupon.maxDiscount,
        usageLimit:
          req.body.usageLimit !== undefined
            ? this.parseNumber(req.body.usageLimit, null)
            : coupon.usageLimit,
        userUsageLimit:
          req.body.userUsageLimit !== undefined ||
          req.body.perUserLimit !== undefined
            ? this.parseNumber(
                req.body.userUsageLimit ?? req.body.perUserLimit,
                null,
              )
            : this.parseNumber(
                coupon.userUsageLimit ?? coupon.perUserLimit,
                null,
              ),
        perUserLimit:
          req.body.userUsageLimit !== undefined ||
          req.body.perUserLimit !== undefined
            ? this.parseNumber(
                req.body.userUsageLimit ?? req.body.perUserLimit,
                null,
              )
            : this.parseNumber(
                coupon.userUsageLimit ?? coupon.perUserLimit,
                null,
              ),
        startDate: startDateValue,
        validFrom: startDateValue,
        expiryDate: expiryDateValue,
        validUntil: expiryDateValue,
        status:
          req.body.status !== undefined
            ? String(req.body.status || "")
                .trim()
                .toLowerCase()
            : coupon.status,
        description:
          req.body.description !== undefined
            ? String(req.body.description || "").trim()
            : coupon.description,
      };

      const errors = this.validatePayload(payload, false);
      if (errors.length > 0) {
        return next(new AppError("Validation failed", 422, errors));
      }

      Object.assign(coupon, payload);
      await coupon.save();

      logger.info(
        `[Coupon:update] id=${id} saved minPurchase=${coupon.minPurchase} minOrderAmount=${coupon.minOrderAmount}`,
      );

      return res.json({
        success: true,
        message: "Coupon updated successfully",
        data: this.normalizeCouponPayload(coupon.toObject()),
      });
    } catch (error) {
      if (error?.code === 11000) {
        return next(
          new AppError("Coupon code already exists", 409, [
            this.createFieldError("code", "Coupon code already exists"),
          ]),
        );
      }
      if (error?.name === "ValidationError") {
        const errors = Object.entries(error.errors || {}).map(
          ([field, item]) => ({
            field,
            message: item?.message || "Invalid value",
          }),
        );
        return next(new AppError("Validation failed", 422, errors));
      }
      return next(new AppError("Failed to update coupon", 500));
    }
  }

  async destroy(req, res, next) {
    try {
      const { id } = req.params;
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return next(new AppError("Invalid coupon ID", 400));
      }

      const coupon = await Coupon.findById(id);
      if (!coupon) {
        return next(new AppError("Coupon not found", 404));
      }

      await coupon.deleteOne();
      return res.json({
        success: true,
        message: "Coupon deleted successfully",
      });
    } catch (error) {
      return next(new AppError("Failed to delete coupon", 500));
    }
  }

  async validate(req, res, next) {
    try {
      await this.syncExpiredCouponsStatus();

      const code = String(req.body.code || req.body.couponCode || "")
        .trim()
        .toUpperCase();
      const total = this.parseNumber(req.body.total ?? req.body.orderAmount, 0);

      if (!code) {
        return next(
          new AppError("Coupon code is required", 422, [
            this.createFieldError("code", "Coupon code is required"),
          ]),
        );
      }

      const coupon = await Coupon.findOne({ code }).lean();
      if (!coupon) {
        return next(
          new AppError("Invalid coupon code", 400, [
            this.createFieldError("code", "Invalid coupon code"),
          ]),
        );
      }

      const normalizedCoupon = this.normalizeCouponPayload(coupon);

      const now = new Date();
      if (normalizedCoupon.status !== "active") {
        return next(new AppError("Coupon is inactive", 400));
      }
      if (
        normalizedCoupon.startDate &&
        new Date(normalizedCoupon.startDate) > now
      ) {
        return next(new AppError("Coupon is not yet valid", 400));
      }
      if (
        normalizedCoupon.expiryDate &&
        new Date(normalizedCoupon.expiryDate) < now
      ) {
        return next(new AppError("Coupon has expired", 400));
      }
      if (
        normalizedCoupon.usageLimit &&
        normalizedCoupon.usedCount >= normalizedCoupon.usageLimit
      ) {
        return next(new AppError("Coupon usage limit reached", 400));
      }
      if (
        normalizedCoupon.minPurchase &&
        total < normalizedCoupon.minPurchase
      ) {
        return next(
          new AppError(
            `Minimum order amount of $${normalizedCoupon.minPurchase} required`,
            400,
          ),
        );
      }

      const discount =
        normalizedCoupon.type === "percent"
          ? Math.min(
              (total * normalizedCoupon.value) / 100,
              normalizedCoupon.maxDiscount || Number.MAX_SAFE_INTEGER,
            )
          : normalizedCoupon.value;

      return res.json({
        success: true,
        message: "Coupon is valid",
        data: {
          couponId: normalizedCoupon._id,
          code: normalizedCoupon.code,
          type: normalizedCoupon.type,
          value: normalizedCoupon.value,
          discount: Math.min(Math.round(discount * 100) / 100, total),
        },
      });
    } catch (error) {
      return next(new AppError("Failed to validate coupon", 500));
    }
  }
}

export const couponController = new CouponController();
