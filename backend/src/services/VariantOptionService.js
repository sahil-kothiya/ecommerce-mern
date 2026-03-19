import mongoose from "mongoose";
import { VariantType } from "../models/VariantType.js";
import { VariantOption } from "../models/VariantOption.js";
import { BaseService } from "../core/BaseService.js";
import { AppError } from '../utils/AppError.js';
import { logger } from "../utils/logger.js";
import { isValidObjectId, normalizeStatus } from "../utils/shared.js";
import { VariantOptionRepository } from '../repositories/index.js';

const VALID_STATUS = ["active", "inactive"];

export class VariantOptionService extends BaseService {
  constructor(repository = new VariantOptionRepository()) {
    super();
    this.repository = repository;
  }

  normalizeValue(value = "") {
    return String(value).trim().toLowerCase();
  }

  normalizeDisplayValue(displayValue = "") {
    return String(displayValue).trim();
  }

  normalizeSortOrder(sortOrder) {
    const parsed = Number(sortOrder);
    if (!Number.isFinite(parsed) || parsed < 0) return 0;
    return Math.floor(parsed);
  }

  normalizeHexColor(hexColor) {
    const value = String(hexColor || "").trim();
    if (!value) return null;
    return value.toUpperCase();
  }

  async list(options = {}) {
    const { page = 1, limit = 20, search, status, variantTypeId } = options;
    const skip = (page - 1) * limit;
    const query = {};

    if (variantTypeId && isValidObjectId(variantTypeId)) {
      query.variantTypeId = new mongoose.Types.ObjectId(variantTypeId);
    }

    const normalizedStatus = normalizeStatus(
      status || "all",
      VALID_STATUS,
      "all",
    );
    if (normalizedStatus !== "all") query.status = normalizedStatus;

    if (search) {
      query.$or = [
        {
          value: {
            $regex: search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
            $options: "i",
          },
        },
        {
          displayValue: {
            $regex: search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
            $options: "i",
          },
        },
      ];
    }

    const [items, total] = await Promise.all([
      this.model
        .find(query)
        .populate("variantTypeId", "name displayName status")
        .sort({ sortOrder: 1, displayValue: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.repository.model.countDocuments(query),
    ]);

    return {
      items,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  async getById(id) {
    if (!isValidObjectId(id))
      throw new AppError("Invalid variant option ID", 400);

    const item = await this.model
      .findById(id)
      .populate("variantTypeId", "name displayName status")
      .lean();
    if (!item) throw new AppError("Variant option not found", 404);
    return item;
  }

  validateData(data) {
    const errors = [];

    if (!data.variantTypeId || !isValidObjectId(data.variantTypeId)) {
      errors.push({
        field: "variantTypeId",
        message: "Variant type is required",
      });
    }
    if (!data.value || data.value.length < 1) {
      errors.push({ field: "value", message: "Value is required" });
    }
    if (!data.displayValue || data.displayValue.length < 1) {
      errors.push({
        field: "displayValue",
        message: "Display value is required",
      });
    }
    if (data.value && !/^[a-z0-9-_\s]+$/.test(data.value)) {
      errors.push({
        field: "value",
        message:
          "Value can contain lowercase letters, numbers, spaces, dashes, and underscores only",
      });
    }
    if (data.hexColor && !/^#[0-9A-F]{6}$/i.test(data.hexColor)) {
      errors.push({
        field: "hexColor",
        message: "Hex color must be in format #RRGGBB",
      });
    }
    if (!VALID_STATUS.includes(data.status)) {
      errors.push({
        field: "status",
        message: "Status must be active or inactive",
      });
    }

    return errors;
  }

  async createOption(body) {
    const data = {
      variantTypeId: String(
        body.variantTypeId || body.variantType || "",
      ).trim(),
      value: this.normalizeValue(body.value),
      displayValue: this.normalizeDisplayValue(body.displayValue || body.title),
      hexColor: this.normalizeHexColor(body.hexColor),
      sortOrder: this.normalizeSortOrder(body.sortOrder ?? body.position),
      status: normalizeStatus(body.status, VALID_STATUS, "active"),
    };

    const errors = this.validateData(data);

    if (data.variantTypeId && isValidObjectId(data.variantTypeId)) {
      const type = await VariantType.findById(data.variantTypeId).lean();
      if (!type)
        errors.push({
          field: "variantTypeId",
          message: "Selected variant type does not exist",
        });
    }

    if (
      data.variantTypeId &&
      isValidObjectId(data.variantTypeId) &&
      data.value
    ) {
      const exists = await this.model
        .findOne({
          variantTypeId: new mongoose.Types.ObjectId(data.variantTypeId),
          value: data.value,
        })
        .lean();
      if (exists)
        errors.push({
          field: "value",
          message: "Option already exists for this variant type",
        });
    }

    if (errors.length > 0) throw new AppError("Validation failed", 422, errors);

    const item = await this.repository.model.create(data);
    const populated = await this.model
      .findById(item._id)
      .populate("variantTypeId", "name displayName status")
      .lean();

    logger.info("Variant option created", { id: item._id });
    return populated;
  }

  async updateOption(id, body) {
    if (!isValidObjectId(id))
      throw new AppError("Invalid variant option ID", 400);

    const item = await this.repository.model.findById(id);
    if (!item) throw new AppError("Variant option not found", 404);

    const data = {
      variantTypeId:
        body.variantTypeId !== undefined || body.variantType !== undefined
          ? String(body.variantTypeId || body.variantType || "").trim()
          : String(item.variantTypeId),
      value:
        body.value !== undefined ? this.normalizeValue(body.value) : item.value,
      displayValue:
        body.displayValue !== undefined
          ? this.normalizeDisplayValue(body.displayValue)
          : item.displayValue,
      hexColor:
        body.hexColor !== undefined
          ? this.normalizeHexColor(body.hexColor)
          : item.hexColor,
      sortOrder:
        body.sortOrder !== undefined || body.position !== undefined
          ? this.normalizeSortOrder(body.sortOrder ?? body.position)
          : item.sortOrder,
      status:
        body.status !== undefined
          ? normalizeStatus(body.status, VALID_STATUS, item.status)
          : item.status,
    };

    const errors = this.validateData(data);

    if (data.variantTypeId && isValidObjectId(data.variantTypeId)) {
      const type = await VariantType.findById(data.variantTypeId).lean();
      if (!type)
        errors.push({
          field: "variantTypeId",
          message: "Selected variant type does not exist",
        });
    }

    if (
      data.variantTypeId &&
      isValidObjectId(data.variantTypeId) &&
      data.value
    ) {
      const exists = await this.model
        .findOne({
          variantTypeId: new mongoose.Types.ObjectId(data.variantTypeId),
          value: data.value,
        })
        .lean();
      if (exists && String(exists._id) !== String(id)) {
        errors.push({
          field: "value",
          message: "Option already exists for this variant type",
        });
      }
    }

    if (errors.length > 0) throw new AppError("Validation failed", 422, errors);

    Object.assign(item, data);
    await item.save();

    const populated = await this.model
      .findById(item._id)
      .populate("variantTypeId", "name displayName status")
      .lean();

    logger.info("Variant option updated", { id });
    return populated;
  }

  async deleteOption(id) {
    if (!isValidObjectId(id))
      throw new AppError("Invalid variant option ID", 400);

    const item = await this.repository.model.findById(id);
    if (!item) throw new AppError("Variant option not found", 404);

    await item.deleteOne();
    logger.info("Variant option deleted", { id });
  }
}

export const variantOptionService = new VariantOptionService();
