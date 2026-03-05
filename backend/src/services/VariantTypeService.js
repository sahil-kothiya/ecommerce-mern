import { VariantType } from "../models/VariantType.js";
import { VariantOption } from "../models/VariantOption.js";
import { BaseService } from "../core/BaseService.js";
import { AppError } from "../middleware/errorHandler.js";
import { logger } from "../utils/logger.js";
import { isValidObjectId, normalizeStatus } from "../utils/shared.js";

const VALID_STATUS = ["active", "inactive"];

export class VariantTypeService extends BaseService {
  constructor() {
    super(VariantType);
  }

  normalizeName(name = "") {
    return String(name).trim().toLowerCase();
  }

  normalizeDisplayName(displayName = "") {
    return String(displayName).trim();
  }

  normalizeSortOrder(sortOrder) {
    const parsed = Number(sortOrder);
    if (!Number.isFinite(parsed) || parsed < 0) return 0;
    return Math.floor(parsed);
  }

  async list(options = {}) {
    const { page = 1, limit = 20, search, status } = options;
    const skip = (page - 1) * limit;
    const query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { displayName: { $regex: search, $options: "i" } },
      ];
    }

    const normalizedStatus = normalizeStatus(
      status || "all",
      VALID_STATUS,
      "all",
    );
    if (normalizedStatus !== "all") query.status = normalizedStatus;

    const [items, total] = await Promise.all([
      this.model
        .find(query)
        .sort({ sortOrder: 1, displayName: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.model.countDocuments(query),
    ]);

    const ids = items.map((item) => item._id);
    const optionCountsRaw = await VariantOption.aggregate([
      { $match: { variantTypeId: { $in: ids } } },
      { $group: { _id: "$variantTypeId", count: { $sum: 1 } } },
    ]);
    const optionCountMap = new Map(
      optionCountsRaw.map((item) => [String(item._id), item.count]),
    );

    const rows = items.map((item) => ({
      ...item,
      optionsCount: optionCountMap.get(String(item._id)) || 0,
    }));

    return {
      items: rows,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  async listActive() {
    return this.model
      .find({ status: "active" })
      .sort({ sortOrder: 1, displayName: 1 })
      .select("_id name displayName sortOrder")
      .lean();
  }

  async getById(id) {
    if (!isValidObjectId(id))
      throw new AppError("Invalid variant type ID", 400);

    const item = await this.model.findById(id).lean();
    if (!item) throw new AppError("Variant type not found", 404);

    const optionsCount = await VariantOption.countDocuments({
      variantTypeId: item._id,
    });
    return { ...item, optionsCount };
  }

  validateData(data, excludeId = null) {
    const errors = [];
    if (!data.name || data.name.length < 2) {
      errors.push({
        field: "name",
        message: "Name must be at least 2 characters",
      });
    }
    if (!data.displayName || data.displayName.length < 2) {
      errors.push({
        field: "displayName",
        message: "Display name must be at least 2 characters",
      });
    }
    if (data.name && !/^[a-z0-9-_\s]+$/.test(data.name)) {
      errors.push({
        field: "name",
        message:
          "Name can contain lowercase letters, numbers, spaces, dashes, and underscores only",
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

  async createVariantType(body) {
    const data = {
      name: this.normalizeName(body.name),
      displayName: this.normalizeDisplayName(body.displayName || body.title),
      sortOrder: this.normalizeSortOrder(body.sortOrder ?? body.position),
      status: normalizeStatus(body.status, VALID_STATUS, "active"),
    };

    const errors = this.validateData(data);

    if (data.name) {
      const exists = await this.model.findOne({ name: data.name }).lean();
      if (exists)
        errors.push({
          field: "name",
          message: "Variant type already exists with this name",
        });
    }

    if (errors.length > 0) throw new AppError("Validation failed", 422, errors);

    const item = await this.model.create(data);
    logger.info("Variant type created", { id: item._id });
    return item;
  }

  async updateVariantType(id, body) {
    if (!isValidObjectId(id))
      throw new AppError("Invalid variant type ID", 400);

    const item = await this.model.findById(id);
    if (!item) throw new AppError("Variant type not found", 404);

    const data = {
      name: body.name !== undefined ? this.normalizeName(body.name) : item.name,
      displayName:
        body.displayName !== undefined
          ? this.normalizeDisplayName(body.displayName)
          : item.displayName,
      sortOrder:
        body.sortOrder !== undefined || body.position !== undefined
          ? this.normalizeSortOrder(body.sortOrder ?? body.position)
          : item.sortOrder,
      status:
        body.status !== undefined
          ? normalizeStatus(body.status, VALID_STATUS, item.status)
          : item.status,
    };

    const errors = this.validateData(data, id);

    if (data.name) {
      const exists = await this.model.findOne({ name: data.name }).lean();
      if (exists && String(exists._id) !== String(id)) {
        errors.push({
          field: "name",
          message: "Variant type already exists with this name",
        });
      }
    }

    if (errors.length > 0) throw new AppError("Validation failed", 422, errors);

    Object.assign(item, data);
    await item.save();
    logger.info("Variant type updated", { id });
    return item;
  }

  async deleteVariantType(id) {
    if (!isValidObjectId(id))
      throw new AppError("Invalid variant type ID", 400);

    const item = await this.model.findById(id);
    if (!item) throw new AppError("Variant type not found", 404);

    const linkedOptions = await VariantOption.countDocuments({
      variantTypeId: id,
    });
    if (linkedOptions > 0) {
      throw new AppError(
        "Cannot delete variant type that still has options. Delete options first.",
        400,
      );
    }

    await item.deleteOne();
    logger.info("Variant type deleted", { id });
  }
}

export const variantTypeService = new VariantTypeService();
