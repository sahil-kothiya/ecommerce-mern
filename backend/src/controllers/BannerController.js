import { BaseController } from "../core/BaseController.js";
import { BannerService } from "../services/BannerService.js";
import { deleteUploadedFile } from "../middleware/uploadEnhanced.js";
import mongoose from "mongoose";
import { Banner } from "../models/Banner.js";
import { Discount } from "../models/Discount.js";
import { logger } from "../utils/logger.js";

export class BannerController extends BaseController {
  constructor() {
    super(new BannerService());
  }

  async ensureUniqueSlug(baseSlug, excludeId = null) {
    const cleaned =
      (baseSlug || "")
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
      counter += 1;
      slug = `${cleaned}-${counter}`;
    }
  }

  parseJsonField(fieldValue, fallback, fieldName) {
    if (fieldValue === undefined || fieldValue === null || fieldValue === "")
      return fallback;
    if (typeof fieldValue === "object") return fieldValue;
    try {
      return JSON.parse(fieldValue);
    } catch {
      throw new Error(`Invalid JSON format for "${fieldName}"`);
    }
  }

  normalizeSingleValue(value, fallback = null) {
    if (Array.isArray(value)) {
      return value.length > 0 ? value[value.length - 1] : fallback;
    }
    if (value === undefined || value === null) return fallback;
    return value;
  }

  async index(req, res) {
    try {
      const {
        page = 1,
        limit = 20,
        status,
        sortBy = "sortOrder",
        sortOrder = "asc",
      } = req.query;

      const skip = (page - 1) * limit;
      const query = {};

      if (status) query.status = status;

      const sort = { [sortBy]: sortOrder === "desc" ? -1 : 1 };

      const [banners, total] = await Promise.all([
        Banner.find(query)
          .sort(sort)
          .skip(skip)
          .limit(parseInt(limit))
          .populate("discountIds", "title type value startsAt endsAt isActive")
          .lean(),
        Banner.countDocuments(query),
      ]);

      const pages = Math.ceil(total / limit);

      res.json({
        success: true,
        data: {
          banners,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages,
            hasNext: page < pages,
            hasPrev: page > 1,
          },
        },
      });
    } catch (error) {
      logger.error("Banner index error", { error: error.message });
      res.status(500).json({
        success: false,
        message: "Failed to fetch banners",
      });
    }
  }

  async getDiscountOptions(req, res) {
    try {
      const now = new Date();
      const discounts = await Discount.find({
        isActive: true,
        startsAt: { $lte: now },
        endsAt: { $gte: now },
      })
        .select("_id title type value startsAt endsAt")
        .sort({ startsAt: -1 })
        .lean();

      res.json({
        success: true,
        data: discounts,
      });
    } catch (error) {
      logger.error("Get discount options error", { error: error.message });
      res.status(500).json({
        success: false,
        message: "Failed to fetch discount options",
      });
    }
  }

  async show(req, res) {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid banner ID",
        });
      }

      const banner = await Banner.findById(id)
        .populate("discountIds", "title type value startsAt endsAt isActive")
        .lean();

      if (!banner) {
        return res.status(404).json({
          success: false,
          message: "Banner not found",
        });
      }

      res.json({
        success: true,
        data: banner,
      });
    } catch (error) {
      logger.error("Banner show error", { error: error.message });
      res.status(500).json({
        success: false,
        message: "Failed to fetch banner",
      });
    }
  }

  async create(req, res) {
    try {
      const {
        title,
        slug,
        description,
        link,
        linkType,
        link_type,
        linkTarget,
        sortOrder,
        status,
        startDate,
        endDate,
        metadata,
        discounts,
        discountIds,
      } = req.body;

      const normalizedLinkType = this.normalizeSingleValue(
        linkType || link_type,
        null,
      );

      if (!title) {
        return res.status(400).json({
          success: false,
          message: "Title is required",
        });
      }

      const incomingImagePath = req.file
        ? `banners/${req.file.filename}`
        : req.body.image || req.body.photo || null;

      let parsedDiscountIds = [];
      const discountsPayload = discountIds ?? discounts;
      if (discountsPayload) {
        const normalized = Array.isArray(discountsPayload)
          ? discountsPayload
          : this.parseJsonField(discountsPayload, [], "discounts");

        parsedDiscountIds = normalized.filter((v) =>
          mongoose.Types.ObjectId.isValid(v),
        );
      }

      const bannerData = {
        title,
        slug: await this.ensureUniqueSlug(slug || title),
        description,
        image: incomingImagePath,
        link: link || "",
        linkType: normalizedLinkType,
        linkTarget: linkTarget || "_self",
        sortOrder: sortOrder ? parseInt(sortOrder) : 0,
        status: status || "inactive",
        startDate: startDate || null,
        endDate: endDate || null,
        metadata: this.parseJsonField(metadata, {}, "metadata"),
        discountIds: parsedDiscountIds,
      };

      const banner = await Banner.create(bannerData);

      res.status(201).json({
        success: true,
        message: "Banner created successfully",
        data: banner,
      });
    } catch (error) {
      if (req.file) {
        await deleteUploadedFile(`banners/${req.file.filename}`);
      }

      if (error.message && error.message.startsWith("Invalid JSON format")) {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }

      if (error.name === "ValidationError") {
        return res.status(400).json({
          success: false,
          message: error.message,
          errors: Object.values(error.errors || {}).map((e) => ({
            field: e.path,
            message: e.message,
          })),
        });
      }

      if (error.code === 11000) {
        return res.status(400).json({
          success: false,
          message: "Banner slug already exists",
        });
      }

      logger.error("Banner create error", { error: error.message });
      res.status(500).json({
        success: false,
        message: "Failed to create banner",
      });
    }
  }

  async update(req, res) {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid banner ID",
        });
      }

      const banner = await Banner.findById(id);

      if (!banner) {
        if (req.file) {
          await deleteUploadedFile(`banners/${req.file.filename}`);
        }
        return res.status(404).json({
          success: false,
          message: "Banner not found",
        });
      }

      const oldImage = banner.image;

      const {
        title,
        slug,
        description,
        link,
        linkType,
        link_type,
        linkTarget,
        sortOrder,
        status,
        startDate,
        endDate,
        metadata,
        discounts,
        discountIds,
      } = req.body;

      const normalizedLinkType = this.normalizeSingleValue(
        linkType || link_type,
        null,
      );

      if (title !== undefined) banner.title = title;
      if (slug !== undefined || title !== undefined) {
        banner.slug = await this.ensureUniqueSlug(
          slug || title || banner.title,
          id,
        );
      }
      if (description !== undefined) banner.description = description;
      if (link !== undefined) banner.link = link;
      if (linkType !== undefined || link_type !== undefined)
        banner.linkType = normalizedLinkType;
      if (linkTarget !== undefined) banner.linkTarget = linkTarget;
      if (sortOrder !== undefined) banner.sortOrder = parseInt(sortOrder);
      if (status !== undefined) banner.status = status;
      if (startDate !== undefined) banner.startDate = startDate || null;
      if (endDate !== undefined) banner.endDate = endDate || null;
      if (metadata !== undefined)
        banner.metadata = this.parseJsonField(metadata, {}, "metadata");
      if (discountIds !== undefined || discounts !== undefined) {
        const discountsPayload = discountIds ?? discounts;
        const normalized = Array.isArray(discountsPayload)
          ? discountsPayload
          : this.parseJsonField(discountsPayload, [], "discounts");
        banner.discountIds = normalized.filter((v) =>
          mongoose.Types.ObjectId.isValid(v),
        );
      }
      if (req.body.image !== undefined || req.body.photo !== undefined) {
        banner.image = req.body.image || req.body.photo || null;
      }

      if (req.file) {
        banner.image = `banners/${req.file.filename}`;
      }

      await banner.save();

      if (req.file && oldImage) {
        await deleteUploadedFile(oldImage);
      }

      res.json({
        success: true,
        message: "Banner updated successfully",
        data: banner,
      });
    } catch (error) {
      if (req.file) {
        await deleteUploadedFile(`banners/${req.file.filename}`);
      }

      if (error.message && error.message.startsWith("Invalid JSON format")) {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }

      if (error.name === "ValidationError") {
        return res.status(400).json({
          success: false,
          message: error.message,
          errors: Object.values(error.errors || {}).map((e) => ({
            field: e.path,
            message: e.message,
          })),
        });
      }

      if (error.code === 11000) {
        return res.status(400).json({
          success: false,
          message: "Banner slug already exists",
        });
      }

      logger.error("Banner update error", { error: error.message });
      res.status(500).json({
        success: false,
        message: "Failed to update banner",
      });
    }
  }

  async destroy(req, res) {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid banner ID",
        });
      }

      const banner = await Banner.findById(id);

      if (!banner) {
        return res.status(404).json({
          success: false,
          message: "Banner not found",
        });
      }

      if (banner.image) {
        await deleteUploadedFile(banner.image);
      }

      await banner.deleteOne();

      res.json({
        success: true,
        message: "Banner deleted successfully",
      });
    } catch (error) {
      logger.error("Banner delete error", { error: error.message });
      res.status(500).json({
        success: false,
        message: "Failed to delete banner",
      });
    }
  }

  async trackView(req, res) {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid banner ID",
        });
      }

      const banner = await Banner.findById(id);

      if (!banner) {
        return res.status(404).json({
          success: false,
          message: "Banner not found",
        });
      }

      await banner.incrementViewCount();

      res.json({
        success: true,
        message: "View tracked",
      });
    } catch (error) {
      logger.error("Track view error", { error: error.message });
      res.status(500).json({
        success: false,
        message: "Failed to track view",
      });
    }
  }

  async trackClick(req, res) {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid banner ID",
        });
      }

      const banner = await Banner.findById(id);

      if (!banner) {
        return res.status(404).json({
          success: false,
          message: "Banner not found",
        });
      }

      await banner.incrementClickCount();

      res.json({
        success: true,
        message: "Click tracked",
      });
    } catch (error) {
      logger.error("Track click error", { error: error.message });
      res.status(500).json({
        success: false,
        message: "Failed to track click",
      });
    }
  }

  async getAnalytics(req, res) {
    try {
      const { startDate, endDate } = req.query;

      const start = startDate
        ? new Date(startDate)
        : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate) : new Date();

      const analytics = await Banner.getAnalytics(start, end);

      res.json({
        success: true,
        data: analytics,
      });
    } catch (error) {
      logger.error("Get analytics error", { error: error.message });
      res.status(500).json({
        success: false,
        message: "Failed to fetch analytics",
      });
    }
  }
}
