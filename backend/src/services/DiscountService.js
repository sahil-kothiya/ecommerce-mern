import mongoose from "mongoose";
import { BaseService } from "../core/BaseService.js";
import { Discount } from "../models/Discount.js";
import { Category } from "../models/Category.js";
import { Product } from "../models/Product.js";
import { AppError } from "../middleware/errorHandler.js";

export class DiscountService extends BaseService {
  constructor() {
    super(Discount);
  }

  normalizeType(value) {
    if (value === "amount") return "fixed";
    return value;
  }

  parseBoolean(value, fallback = false) {
    if (typeof value === "boolean") return value;
    if (typeof value === "string") {
      const normalized = value.trim().toLowerCase();
      if (["true", "1", "yes", "on"].includes(normalized)) return true;
      if (["false", "0", "no", "off", ""].includes(normalized)) return false;
    }
    if (typeof value === "number") return value === 1;
    return fallback;
  }

  parseObjectIdArray(value) {
    if (value === undefined || value === null || value === "") return [];

    let parsed = value;
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (!trimmed) return [];

      if (trimmed.startsWith("[")) {
        try {
          parsed = JSON.parse(trimmed);
        } catch {
          parsed = trimmed.split(",").map((item) => item.trim());
        }
      } else {
        parsed = trimmed.split(",").map((item) => item.trim());
      }
    }

    if (!Array.isArray(parsed)) parsed = [parsed];

    return [
      ...new Set(
        parsed
          .map((item) => String(item).trim())
          .filter((item) => mongoose.Types.ObjectId.isValid(item)),
      ),
    ];
  }

  parseNumber(value, fallback = null) {
    if (value === undefined || value === null || value === "") return fallback;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  validatePayload(payload, isPartial = false) {
    const errors = [];

    if (!isPartial || payload.title !== undefined) {
      if (!payload.title || !String(payload.title).trim()) {
        errors.push({ field: "title", message: "Title is required" });
      }
    }

    if (!isPartial || payload.type !== undefined) {
      if (!["percentage", "fixed"].includes(payload.type)) {
        errors.push({
          field: "type",
          message: "Discount type must be percentage or fixed",
        });
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
        errors.push({ field: "value", message: "Discount value is required" });
      } else if (payload.type === "percentage") {
        if (!Number.isInteger(payload.value)) {
          errors.push({
            field: "value",
            message: "Percentage value must be an integer",
          });
        }
        if (payload.value < 1 || payload.value > 100) {
          errors.push({
            field: "value",
            message: "Percentage value must be between 1 and 100",
          });
        }
      } else if (payload.type === "fixed" && payload.value <= 0) {
        errors.push({
          field: "value",
          message: "Fixed amount must be greater than 0",
        });
      }
    }

    if (
      !isPartial ||
      payload.startsAt !== undefined ||
      payload.endsAt !== undefined
    ) {
      if (!payload.startsAt || Number.isNaN(payload.startsAt.getTime())) {
        errors.push({
          field: "startsAt",
          message: "Start date is required and must be valid",
        });
      }

      if (!payload.endsAt || Number.isNaN(payload.endsAt.getTime())) {
        errors.push({
          field: "endsAt",
          message: "End date is required and must be valid",
        });
      }

      if (
        payload.startsAt &&
        payload.endsAt &&
        payload.startsAt >= payload.endsAt
      ) {
        errors.push({
          field: "endsAt",
          message: "End date must be after start date",
        });
      }
    }

    return errors;
  }

  async validateCategories(categoryIds) {
    if (!categoryIds.length) return [];

    const categories = await Category.find({
      _id: { $in: categoryIds },
      status: "active",
    }).lean();

    return categories.map((cat) => cat._id);
  }

  async validateProducts(productIds) {
    if (!productIds.length) return [];

    const products = await Product.find({
      _id: { $in: productIds },
      status: "active",
    }).lean();

    return products.map((prod) => prod._id);
  }

  async createDiscount(data) {
    const payload = {
      title: String(data.title || "").trim(),
      type: this.normalizeType(
        String(data.type || "")
          .trim()
          .toLowerCase(),
      ),
      value: this.parseNumber(data.value, null),
      startsAt: data.startsAt ? new Date(data.startsAt) : null,
      endsAt: data.endsAt ? new Date(data.endsAt) : null,
      status: ["active", "inactive"].includes(data.status)
        ? data.status
        : "active",
      applyToCategories: this.parseBoolean(data.applyToCategories, false),
      applyToProducts: this.parseBoolean(data.applyToProducts, false),
      categoryIds: this.parseObjectIdArray(data.categoryIds),
      productIds: this.parseObjectIdArray(data.productIds),
    };

    const validationErrors = this.validatePayload(payload, false);
    if (validationErrors.length > 0) {
      throw new AppError(validationErrors[0].message, 422, validationErrors);
    }

    if (payload.applyToCategories) {
      payload.categoryIds = await this.validateCategories(payload.categoryIds);
      if (!payload.categoryIds.length) {
        throw new AppError(
          "At least one valid category is required when applying to categories",
          400,
        );
      }
    }

    if (payload.applyToProducts) {
      payload.productIds = await this.validateProducts(payload.productIds);
      if (!payload.productIds.length) {
        throw new AppError(
          "At least one valid product is required when applying to products",
          400,
        );
      }
    }

    const discount = await Discount.create(payload);
    return discount.toObject();
  }

  async updateDiscount(id, data, isPartial = true) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError("Invalid discount ID", 400);
    }

    const existing = await Discount.findById(id);
    if (!existing) {
      throw new AppError("Discount not found", 404);
    }

    const payload = {};
    if (data.title !== undefined) payload.title = String(data.title).trim();
    if (data.type !== undefined)
      payload.type = this.normalizeType(String(data.type).trim().toLowerCase());
    if (data.value !== undefined)
      payload.value = this.parseNumber(data.value, null);
    if (data.startsAt !== undefined) payload.startsAt = new Date(data.startsAt);
    if (data.endsAt !== undefined) payload.endsAt = new Date(data.endsAt);
    if (
      data.status !== undefined &&
      ["active", "inactive"].includes(data.status)
    )
      payload.status = data.status;
    if (data.applyToCategories !== undefined)
      payload.applyToCategories = this.parseBoolean(data.applyToCategories);
    if (data.applyToProducts !== undefined)
      payload.applyToProducts = this.parseBoolean(data.applyToProducts);
    if (data.categoryIds !== undefined)
      payload.categoryIds = this.parseObjectIdArray(data.categoryIds);
    if (data.productIds !== undefined)
      payload.productIds = this.parseObjectIdArray(data.productIds);

    const merged = { ...existing.toObject(), ...payload };
    const validationErrors = this.validatePayload(merged, isPartial);
    if (validationErrors.length > 0) {
      throw new AppError(validationErrors[0].message, 422, validationErrors);
    }

    if (payload.applyToCategories) {
      payload.categoryIds = await this.validateCategories(payload.categoryIds);
      if (!payload.categoryIds.length) {
        throw new AppError(
          "At least one valid category is required when applying to categories",
          400,
        );
      }
    }

    if (payload.applyToProducts) {
      payload.productIds = await this.validateProducts(payload.productIds);
      if (!payload.productIds.length) {
        throw new AppError(
          "At least one valid product is required when applying to products",
          400,
        );
      }
    }

    Object.assign(existing, payload);
    await existing.save();
    return existing.toObject();
  }

  async getDiscounts(filters = {}) {
    const { page = 1, limit = 20, status, type, search } = filters;

    const skip = (page - 1) * limit;
    const query = {};

    if (status && ["active", "inactive"].includes(status)) {
      query.status = status;
    }

    if (type && ["percentage", "fixed"].includes(type)) {
      query.type = type;
    }

    if (search) {
      const trimmed = String(search).trim();
      if (trimmed) {
        query.title = { $regex: trimmed, $options: "i" };
      }
    }

    const [discounts, total] = await Promise.all([
      Discount.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Discount.countDocuments(query),
    ]);

    return {
      discounts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasPrev: page > 1,
        hasNext: page * limit < total,
      },
    };
  }

  async getDiscountById(id) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError("Invalid discount ID", 400);
    }

    const discount = await Discount.findById(id).lean();
    if (!discount) {
      throw new AppError("Discount not found", 404);
    }

    return discount;
  }

  async deleteDiscount(id) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError("Invalid discount ID", 400);
    }

    const discount = await Discount.findByIdAndDelete(id);
    if (!discount) {
      throw new AppError("Discount not found", 404);
    }

    return discount.toObject();
  }
}
