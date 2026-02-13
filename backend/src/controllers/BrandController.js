import { BaseController } from "../core/BaseController.js";
import { BrandService } from "../services/BrandService.js";
import { Brand } from "../models/Brand.js";
import { Product } from "../models/Product.js";
import { deleteUploadedFile } from "../middleware/uploadEnhanced.js";
import { AppError } from "../middleware/errorHandler.js";
import { logger } from "../utils/logger.js";
import mongoose from "mongoose";

export class BrandController extends BaseController {
  constructor() {
    super(new BrandService());
  }

  index = this.catchAsync(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const { search, status } = req.query;

    const query = {};
    if (status && status !== "all") {
      query.status = status;
    }
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { slug: { $regex: search, $options: "i" } },
      ];
    }

    const brands = await this.service.model
      .find(query)
      .select("title slug logo banners status description")
      .skip(skip)
      .limit(limit)
      .sort({ title: 1 })
      .lean();

    const total = await this.service.model.countDocuments(query);

    this.sendPaginatedResponse(res, brands, {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    });
  });

  // GET /api/brands/:slug - Get brand by slug or ID
  show = this.catchAsync(async (req, res) => {
    const { slug } = req.params;

    // Support lookup by both slug and ObjectId
    let brand;
    if (mongoose.Types.ObjectId.isValid(slug)) {
      brand = await Brand.findById(slug).lean();
    }
    if (!brand) {
      brand = await Brand.findOne({ slug }).lean();
    }

    if (!brand) {
      throw new AppError("Brand not found", 404);
    }

    this.sendSuccess(res, brand);
  });

  // GET /api/brands/:slug/products - Get products by brand
  getProducts = this.catchAsync(async (req, res) => {
    const { slug } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Find brand first
    const brand = await Brand.findOne({ slug, status: "active" }).lean();
    if (!brand) {
      throw new AppError("Brand not found", 404);
    }

    // Get products for this brand (Product model stores brand ref as brand.id)
    const products = await Product.find({
      "brand.id": brand._id,
      status: "active",
    })
      .populate("category", "name slug")
      .select(
        "title slug shortDescription sku price comparePrice discount isFeatured images createdAt",
      )
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .lean();

    const total = await Product.countDocuments({
      "brand.id": brand._id,
      status: "active",
    });

    this.sendSuccess(res, {
      brand,
      products,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  });

  // POST /api/brands - Create brand (Admin only)
  store = this.catchAsync(async (req, res) => {
    const { title, description, status } = req.body;

    // Note: Validation is handled by express-validator middleware
    // See brandValidators.js for validation rules

    // Handle uploaded files
    let logo = null;
    let banners = [];

    if (req.files) {
      // Handle logo (single file)
      if (req.files.logo && req.files.logo.length > 0) {
        logo = `uploads/brands/${req.files.logo[0].filename}`;
      }

      // Handle banners (multiple files)
      if (req.files.banners && req.files.banners.length > 0) {
        banners = req.files.banners.map(
          (file) => `uploads/brands/${file.filename}`,
        );
      }
    }

    const brandData = {
      title,
      description,
      status: status || "active",
      logo,
      banners,
    };

    const brand = await this.service.createBrand(brandData);

    logger.info(`Brand created: ${brand.title}`);

    this.sendSuccess(res, brand, 201, "Brand created successfully");
  });

  // PUT /api/brands/:id - Update brand (Admin only)
  update = this.catchAsync(async (req, res) => {
    const { id } = req.params;
    const { title, description, status, existingBanners, keepExistingLogo } =
      req.body;

    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError("Invalid brand ID", 400);
    }

    const brand = await Brand.findById(id);

    if (!brand) {
      throw new AppError("Brand not found", 404);
    }

    // Prepare update data
    const updateData = {
      title: title || brand.title,
      description: description || brand.description,
      status: status || brand.status,
    };

    // Handle logo update
    if (req.files && req.files.logo && req.files.logo.length > 0) {
      // New logo uploaded - replace old one
      updateData.logo = `uploads/brands/${req.files.logo[0].filename}`;

      // Delete old logo if exists
      if (brand.logo) {
        await deleteUploadedFile(brand.logo);
      }
    } else if (keepExistingLogo === "false") {
      // Explicitly requested logo removal
      updateData.logo = null;
      if (brand.logo) {
        await deleteUploadedFile(brand.logo);
      }
    } else {
      // Keep existing logo by default
      updateData.logo = brand.logo;
    }

    // Handle banners update
    let existingBannersArray = [];
    if (existingBanners) {
      try {
        existingBannersArray =
          typeof existingBanners === "string"
            ? JSON.parse(existingBanners)
            : Array.isArray(existingBanners)
              ? existingBanners
              : [];
      } catch (e) {
        logger.error("Error parsing existing banners:", e);
        existingBannersArray = [];
      }
    }

    // Add new banners
    const newBanners =
      req.files && req.files.banners && req.files.banners.length > 0
        ? req.files.banners.map((file) => `uploads/brands/${file.filename}`)
        : [];

    updateData.banners = [...existingBannersArray, ...newBanners];

    // Update brand using service
    const updatedBrand = await this.service.updateBrand(id, updateData);

    logger.info(`Brand updated: ${updatedBrand.title}`);

    this.sendSuccess(res, updatedBrand, 200, "Brand updated successfully");
  });

  // DELETE /api/brands/:id - Delete brand (Admin only)
  destroy = this.catchAsync(async (req, res) => {
    const { id } = req.params;

    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError("Invalid brand ID", 400);
    }

    // Get brand first to delete files
    const brand = await Brand.findById(id);

    if (!brand) {
      throw new AppError("Brand not found", 404);
    }

    // Delete brand using service (checks for products)
    await this.service.deleteBrand(id);

    // Delete associated files
    if (brand.logo) {
      await deleteUploadedFile(brand.logo);
    }

    if (brand.banners && brand.banners.length > 0) {
      for (const banner of brand.banners) {
        await deleteUploadedFile(banner);
      }
    }

    logger.info(`Brand deleted: ${brand.title}`);

    this.sendSuccess(res, null, 200, "Brand deleted successfully");
  });
}
