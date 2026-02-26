import mongoose from "mongoose";
import { BaseController } from "../core/BaseController.js";
import { DiscountService } from "../services/DiscountService.js";
import { Discount } from "../models/Discount.js";
import { Category } from "../models/Category.js";
import { Product } from "../models/Product.js";
import { AppError } from "../middleware/errorHandler.js";
import { logger } from "../utils/logger.js";

export class DiscountController extends BaseController {
  constructor() {
    super();
    this.discountService = new DiscountService();
  }

  async index(req, res, next) {
    try {
      const now = new Date();

      await Discount.updateMany(
        {
          isActive: true,
          endsAt: { $lt: now },
        },
        {
          $set: { isActive: false },
        },
      );

      const result = await this.discountService.getDiscounts({
        page: req.query.page,
        limit: req.query.limit,
        status:
          req.query.isActive !== undefined
            ? req.query.isActive === "true"
              ? "active"
              : "inactive"
            : undefined,
        type: req.query.type,
        search: req.query.search,
      });

      const discounts = await Discount.find({
        _id: { $in: result.discounts.map((d) => d._id) },
      })
        .populate("categories", "_id title slug")
        .populate("products", "_id title slug status")
        .lean();

      res.json({
        success: true,
        data: {
          discounts,
          pagination: result.pagination,
        },
      });
    } catch (error) {
      logger.error("Discount index error", { error: error.message });
      next(new AppError("Failed to fetch discounts", 500));
    }
  }

  async getFormOptions(req, res, next) {
    try {
      const [categories, products] = await Promise.all([
        Category.find({ status: "active" })
          .select("_id title slug")
          .sort({ title: 1 })
          .lean(),
        Product.find({ status: "active" })
          .select("_id title slug baseSku status")
          .sort({ title: 1, createdAt: -1 })
          .lean(),
      ]);

      res.json({
        success: true,
        data: {
          categories,
          products,
        },
      });
    } catch (error) {
      logger.error("Discount form options error", { error: error.message });
      next(new AppError("Failed to fetch form options", 500));
    }
  }

  async show(req, res, next) {
    try {
      const discount = await this.discountService.getDiscountById(
        req.params.id,
      );

      const populated = await Discount.findById(discount._id)
        .populate("categories", "_id title slug")
        .populate("products", "_id title slug status")
        .lean();

      return res.json({ success: true, data: populated });
    } catch (error) {
      if (error instanceof AppError) {
        return next(error);
      }
      logger.error("Discount show error", { error: error.message });
      return next(new AppError("Failed to fetch discount", 500));
    }
  }

  async create(req, res, next) {
    try {
      const created = await this.discountService.createDiscount({
        title: req.body.title,
        type: req.body.type,
        value: req.body.value,
        startsAt: req.body.startsAt,
        endsAt: req.body.endsAt,
        status: req.body.isActive === false ? "inactive" : "active",
        applyToCategories: req.body.categories !== undefined,
        applyToProducts: req.body.products !== undefined,
        categoryIds: req.body.categories,
        productIds: req.body.products,
      });

      const populated = await Discount.findById(created._id)
        .populate("categories", "_id title slug")
        .populate("products", "_id title slug status")
        .lean();

      return res.status(201).json({
        success: true,
        message: "Discount created successfully",
        data: populated,
      });
    } catch (error) {
      if (error instanceof AppError) {
        return next(error);
      }
      logger.error("Discount create error", { error: error.message });
      return next(
        new AppError(error.message || "Failed to create discount", 500),
      );
    }
  }

  async update(req, res, next) {
    try {
      const updated = await this.discountService.updateDiscount(req.params.id, {
        title: req.body.title,
        type: req.body.type,
        value: req.body.value,
        startsAt: req.body.startsAt,
        endsAt: req.body.endsAt,
        status:
          req.body.isActive !== undefined
            ? req.body.isActive
              ? "active"
              : "inactive"
            : undefined,
        applyToCategories: req.body.categories !== undefined,
        applyToProducts: req.body.products !== undefined,
        categoryIds: req.body.categories,
        productIds: req.body.products,
      });

      const populated = await Discount.findById(updated._id)
        .populate("categories", "_id title slug")
        .populate("products", "_id title slug status")
        .lean();

      return res.json({
        success: true,
        message: "Discount updated successfully",
        data: populated,
      });
    } catch (error) {
      if (error instanceof AppError) {
        return next(error);
      }
      logger.error("Discount update error", { error: error.message });
      return next(
        new AppError(error.message || "Failed to update discount", 500),
      );
    }
  }

  async destroy(req, res, next) {
    try {
      await this.discountService.deleteDiscount(req.params.id);

      return res.json({
        success: true,
        message: "Discount deleted successfully",
      });
    } catch (error) {
      if (error instanceof AppError) {
        return next(error);
      }
      logger.error("Discount delete error", { error: error.message });
      return next(new AppError("Failed to delete discount", 500));
    }
  }
}

export const discountController = new DiscountController();
