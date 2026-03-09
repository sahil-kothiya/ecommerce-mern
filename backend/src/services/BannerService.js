import { Banner } from "../models/Banner.js";
import { Discount } from "../models/Discount.js";
import { BaseService } from "../core/BaseService.js";
import { AppError } from "../middleware/errorHandler.js";
import { imageProcessingService } from "./ImageProcessingService.js";
import { logger } from "../utils/logger.js";
import mongoose from "mongoose";

function parseJsonField(value, fallback, fieldName) {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    throw new AppError(`Invalid JSON format for "${fieldName}"`, 400);
  }
}

function normalizeSingle(value, fallback = null) {
  if (Array.isArray(value))
    return value.length > 0 ? value[value.length - 1] : fallback;
  return value ?? fallback;
}

async function ensureUniqueSlug(base, excludeId = null) {
  const cleaned =
    (base || "")
      .toString()
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || "banner";
  let slug = cleaned;
  let counter = 1;
  while (true) {
    const existing = await Banner.findOne({
      slug,
      ...(excludeId ? { _id: { $ne: excludeId } } : {}),
    }).lean();
    if (!existing) return slug;
    counter++;
    slug = `${cleaned}-${counter}`;
  }
}

function resolveDiscountIds(discountIds, discounts) {
  const raw = discountIds ?? discounts;
  if (!raw) return [];
  const arr = Array.isArray(raw) ? raw : parseJsonField(raw, [], "discounts");
  return arr.filter((v) => mongoose.Types.ObjectId.isValid(v));
}

export class BannerService extends BaseService {
  constructor() {
    super(Banner);
  }

  async listBanners({
    page = 1,
    limit = 20,
    status,
    sortBy = "sortOrder",
    sortOrder = "asc",
  } = {}) {
    const skip = (page - 1) * limit;
    const query = {};
    if (status) query.status = status;
    const sort = { [sortBy]: sortOrder === "desc" ? -1 : 1 };
    const [banners, total] = await Promise.all([
      this.model
        .find(query)
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .populate("discountIds", "title type value startsAt endsAt isActive")
        .lean(),
      this.model.countDocuments(query),
    ]);
    const pages = Math.ceil(total / limit);
    return {
      banners,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages,
        hasNext: page < pages,
        hasPrev: page > 1,
      },
    };
  }

  async getDiscountOptions() {
    const now = new Date();
    return Discount.find({
      isActive: true,
      startsAt: { $lte: now },
      endsAt: { $gte: now },
    })
      .select("_id title type value startsAt endsAt")
      .sort({ startsAt: -1 })
      .lean();
  }

  async getBannerById(id) {
    if (!mongoose.Types.ObjectId.isValid(id))
      throw new AppError("Invalid banner ID", 400);
    const banner = await this.model
      .findById(id)
      .populate("discountIds", "title type value startsAt endsAt isActive")
      .lean();
    if (!banner) throw new AppError("Banner not found", 404);
    return banner;
  }

  async createBanner(body, file) {
    if (!body.title) throw new AppError("Title is required", 400);
    let image = body.image || body.photo || null;
    let processedPath = null;
    if (file) {
      const result = await imageProcessingService.processAndSave(
        file,
        "banner",
        "banners",
        "banner-",
      );
      image = result.path;
      processedPath = result.path;
    }
    const data = {
      title: body.title,
      slug: await ensureUniqueSlug(body.slug || body.title),
      description: body.description,
      image,
      link: body.link || "",
      linkType: normalizeSingle(body.linkType || body.link_type, null),
      linkTarget: body.linkTarget || "_self",
      sortOrder: body.sortOrder ? parseInt(body.sortOrder) : 0,
      status: body.status || "inactive",
      startDate: body.startDate || null,
      endDate: body.endDate || null,
      metadata: parseJsonField(body.metadata, {}, "metadata"),
      discountIds: resolveDiscountIds(body.discountIds, body.discounts),
    };
    try {
      return await this.model.create(data);
    } catch (error) {
      if (processedPath) await imageProcessingService.deleteFile(processedPath);
      if (error.code === 11000)
        throw new AppError("Banner slug already exists", 409);
      throw error;
    }
  }

  async updateBanner(id, body, file) {
    if (!mongoose.Types.ObjectId.isValid(id))
      throw new AppError("Invalid banner ID", 400);
    let processedPath = null;
    if (file) {
      const result = await imageProcessingService.processAndSave(
        file,
        "banner",
        "banners",
        "banner-",
      );
      processedPath = result.path;
    }
    const banner = await this.model.findById(id);
    if (!banner) {
      if (processedPath) await imageProcessingService.deleteFile(processedPath);
      throw new AppError("Banner not found", 404);
    }
    const oldImage = banner.image;

    if (body.title !== undefined) banner.title = body.title;
    if (body.slug !== undefined || body.title !== undefined) {
      banner.slug = await ensureUniqueSlug(
        body.slug || body.title || banner.title,
        id,
      );
    }
    if (body.description !== undefined) banner.description = body.description;
    if (body.link !== undefined) banner.link = body.link;
    if (body.linkType !== undefined || body.link_type !== undefined) {
      banner.linkType = normalizeSingle(body.linkType || body.link_type, null);
    }
    if (body.linkTarget !== undefined) banner.linkTarget = body.linkTarget;
    if (body.sortOrder !== undefined)
      banner.sortOrder = parseInt(body.sortOrder);
    if (body.status !== undefined) banner.status = body.status;
    if (body.startDate !== undefined) banner.startDate = body.startDate || null;
    if (body.endDate !== undefined) banner.endDate = body.endDate || null;
    if (body.metadata !== undefined)
      banner.metadata = parseJsonField(body.metadata, {}, "metadata");
    if (body.discountIds !== undefined || body.discounts !== undefined) {
      banner.discountIds = resolveDiscountIds(body.discountIds, body.discounts);
    }
    if (body.image !== undefined || body.photo !== undefined)
      banner.image = body.image || body.photo || null;
    if (processedPath) banner.image = processedPath;

    try {
      await banner.save();
      if (processedPath && oldImage) await imageProcessingService.deleteFile(oldImage);
      return banner;
    } catch (error) {
      if (processedPath) await imageProcessingService.deleteFile(processedPath);
      if (error.code === 11000)
        throw new AppError("Banner slug already exists", 409);
      throw error;
    }
  }

  async deleteBanner(id) {
    if (!mongoose.Types.ObjectId.isValid(id))
      throw new AppError("Invalid banner ID", 400);
    const banner = await this.model.findById(id);
    if (!banner) throw new AppError("Banner not found", 404);
    if (banner.image) await imageProcessingService.deleteFile(banner.image);
    await banner.deleteOne();
  }

  async trackView(id) {
    if (!mongoose.Types.ObjectId.isValid(id))
      throw new AppError("Invalid banner ID", 400);
    const banner = await this.model.findById(id);
    if (!banner) throw new AppError("Banner not found", 404);
    await banner.incrementViewCount();
  }

  async trackClick(id) {
    if (!mongoose.Types.ObjectId.isValid(id))
      throw new AppError("Invalid banner ID", 400);
    const banner = await this.model.findById(id);
    if (!banner) throw new AppError("Banner not found", 404);
    await banner.incrementClickCount();
  }

  async getAnalytics({ startDate, endDate } = {}) {
    const start = startDate
      ? new Date(startDate)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();
    return Banner.getAnalytics(start, end);
  }

  async getActiveBanners(position = null) {
    const now = new Date();
    const filter = {
      status: "active",
      $or: [
        { startDate: { $lte: now }, endDate: { $gte: now } },
        { startDate: null, endDate: null },
      ],
    };
    if (position) filter.position = position;
    return this.findAll({ filter, sort: { sortOrder: 1, createdAt: -1 } });
  }
}
