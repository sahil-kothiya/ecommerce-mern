import { Product } from "../models/Product.js";
import { Category } from "../models/Category.js";
import { Brand } from "../models/Brand.js";
import { VariantType } from "../models/VariantType.js";
import { VariantOption } from "../models/VariantOption.js";
import mongoose from "mongoose";
import slugify from "slugify";
import { logger } from "../utils/logger.js";
import {
  getCachedResponse,
  setCachedResponse,
  invalidateCacheByPrefix,
} from "../utils/requestCache.js";

async function generateUniqueSlug(title, excludeId = null) {
  const base = slugify(title, { lower: true, strict: true });
  let candidate = base;
  let counter = 1;
  while (true) {
    const query = { slug: candidate };
    if (excludeId) query._id = { $ne: excludeId };
    const existing = await Product.findOne(query).select("_id").lean();
    if (!existing) return candidate;
    candidate = `${base}-${counter++}`;
  }
}

const MAX_PAGE_SIZE = 100;
const PRODUCT_INDEX_CACHE_TTL_MS = 15000;
const PRODUCT_LIST_SELECT = [
  "title",
  "slug",
  "summary",
  "condition",
  "status",
  "isFeatured",
  "hasVariants",
  "basePrice",
  "baseDiscount",
  "baseStock",
  "variants",
  "images",
  "category",
  "brand",
  "ratings",
  "viewCount",
  "salesCount",
  "createdAt",
].join(" ");

const ALLOWED_SORT_FIELDS = new Set([
  "createdAt",
  "basePrice",
  "viewCount",
  "salesCount",
  "ratings.average",
  "title",
]);

const SORT_ALIASES = {
  newest: "-createdAt",
  oldest: "createdAt",
  "price-low": "basePrice",
  "price-high": "-basePrice",
  rating: "-ratings.average",
  popular: "-salesCount",
  popularity: "-salesCount",
};

const parseSort = (sort = "-createdAt") => {
  const normalized = String(sort || "").trim();
  const value = SORT_ALIASES[normalized] || normalized || "-createdAt";
  const descending = value.startsWith("-");
  const field = descending ? value.slice(1) : value;

  if (!ALLOWED_SORT_FIELDS.has(field)) {
    return { createdAt: -1 };
  }

  return { [field]: descending ? -1 : 1 };
};

export class ProductController {
  async index(req, res) {
    try {
      const shouldBypassCache =
        String(req.query.noCache || "")
          .trim()
          .toLowerCase() === "true";
      const cacheKey = `products:index:${req.originalUrl}`;
      const cached = shouldBypassCache ? null : getCachedResponse(cacheKey);

      if (cached) {
        res.set("X-Cache", "HIT");
        return res.json(cached);
      }

      const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
      const limit = Math.min(
        MAX_PAGE_SIZE,
        Math.max(1, Number.parseInt(req.query.limit, 10) || 20),
      );
      const skip = (page - 1) * limit;

      const {
        search,
        category,
        categoryId,
        brand,
        brandId,
        minPrice,
        maxPrice,
        condition,
        isFeatured,
        status,
        hasVariants,
        includeCount = "true",
        sort = "-createdAt",
      } = req.query;

      const baseQuery = {};

      if (search) {
        const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        baseQuery.$or = [
          { title: { $regex: escaped, $options: "i" } },
          { "brand.title": { $regex: escaped, $options: "i" } },
          { tags: { $regex: escaped, $options: "i" } },
          { summary: { $regex: escaped, $options: "i" } },
        ];
      }

      if (categoryId && mongoose.Types.ObjectId.isValid(categoryId)) {
        baseQuery["category.id"] = new mongoose.Types.ObjectId(categoryId);
      } else if (category && category !== "all") {
        baseQuery["category.slug"] = String(category).trim();
      }

      if (brandId && mongoose.Types.ObjectId.isValid(brandId)) {
        baseQuery["brand.id"] = new mongoose.Types.ObjectId(brandId);
      } else if (brand && brand !== "all") {
        baseQuery["brand.slug"] = String(brand).trim();
      }

      if (minPrice || maxPrice) {
        baseQuery.basePrice = {};
        const parsedMin = Number.parseFloat(minPrice);
        const parsedMax = Number.parseFloat(maxPrice);
        if (Number.isFinite(parsedMin)) baseQuery.basePrice.$gte = parsedMin;
        if (Number.isFinite(parsedMax)) baseQuery.basePrice.$lte = parsedMax;
        if (Object.keys(baseQuery.basePrice).length === 0) {
          delete baseQuery.basePrice;
        }
      }

      if (condition) {
        baseQuery.condition = condition;
      }

      if (isFeatured !== undefined) {
        baseQuery.isFeatured = isFeatured === "true";
      }

      const query = { ...baseQuery };
      if (status && status !== "all") {
        query.status = status;
      }
      if (hasVariants === "true" || hasVariants === true) {
        query.hasVariants = true;
      } else if (hasVariants === "false" || hasVariants === false) {
        query.hasVariants = false;
      }

      const shouldIncludeCount =
        String(includeCount).trim().toLowerCase() !== "false";

      const productsPromise = Product.find(query)
        .select(PRODUCT_LIST_SELECT)
        .sort(parseSort(sort))
        .skip(skip)
        .limit(limit)
        .lean();

      const countPromise = shouldIncludeCount
        ? Product.countDocuments(query)
        : Promise.resolve(null);
      const filterCountsPromise = Promise.all([
        Product.countDocuments(baseQuery),
        Product.countDocuments({ ...baseQuery, status: "active" }),
        Product.countDocuments({ ...baseQuery, status: "inactive" }),
        Product.countDocuments({ ...baseQuery, hasVariants: true }),
        Product.countDocuments({ ...baseQuery, hasVariants: false }),
      ]);

      const [products, totalCount, filterCounts] = await Promise.all([
        productsPromise,
        countPromise,
        filterCountsPromise,
      ]);

      const total =
        typeof totalCount === "number"
          ? totalCount
          : skip + products.length + (products.length === limit ? 1 : 0);

      const pages = Math.ceil(total / limit);

      const payload = {
        success: true,
        data: {
          products,
          pagination: {
            page,
            limit,
            total,
            pages,
            hasNext: page < pages,
            hasPrev: page > 1,
          },
          filterCounts: {
            all: filterCounts[0],
            active: filterCounts[1],
            inactive: filterCounts[2],
            withVariants: filterCounts[3],
            withoutVariants: filterCounts[4],
          },
        },
      };

      if (!shouldBypassCache) {
        setCachedResponse(cacheKey, payload, PRODUCT_INDEX_CACHE_TTL_MS);
      }

      res.set("X-Cache", shouldBypassCache ? "BYPASS" : "MISS");

      res.json(payload);
    } catch (error) {
      logger.error("Product index error", { error: error.message });
      res.status(500).json({
        success: false,
        message: "Failed to fetch products",
        error: error.message,
      });
    }
  }

  async featured(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 10;

      const products = await Product.find({
        status: "active",
        isFeatured: true,
      })
        .select(PRODUCT_LIST_SELECT)
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();

      res.json({
        success: true,
        data: products,
      });
    } catch (error) {
      logger.error("Featured products error", { error: error.message });
      res.status(500).json({
        success: false,
        message: "Failed to fetch featured products",
      });
    }
  }

  async search(req, res) {
    try {
      const { q, ...filters } = req.query;

      if (!q) {
        return res.status(400).json({
          success: false,
          message: "Search query is required",
        });
      }

      const result = await Product.searchProducts(q, filters);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error("Product search error", { error: error.message });
      res.status(500).json({
        success: false,
        message: "Search failed",
      });
    }
  }

  async show(req, res) {
    try {
      const { slug } = req.params;
      const byIdQuery =
        mongoose.Types.ObjectId.isValid(slug) && slug.length === 24
          ? { _id: slug }
          : null;
      const query = byIdQuery || { slug };
      const product = await Product.findOneAndUpdate(
        { ...query, status: "active" },
        { $inc: { viewCount: 1 } },
        { new: true },
      );

      if (!product || product.status !== "active") {
        return res.status(404).json({
          success: false,
          message: "Product not found",
        });
      }

      res.json({
        success: true,
        data: product,
      });
    } catch (error) {
      logger.error("Product show error", { error: error.message });
      res.status(500).json({
        success: false,
        message: "Failed to fetch product",
      });
    }
  }

  async showBySlug(req, res) {
    try {
      const { slug } = req.params;

      const product = await Product.findOneAndUpdate(
        { slug, status: "active" },
        { $inc: { viewCount: 1 } },
        { new: true },
      );

      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Product not found",
        });
      }

      res.json({
        success: true,
        data: product,
      });
    } catch (error) {
      logger.error("Product show by slug error", { error: error.message });
      res.status(500).json({
        success: false,
        message: "Failed to fetch product",
      });
    }
  }

  async store(req, res) {
    try {
      const {
        title,
        summary,
        description,
        categoryId,
        childCategoryId,
        brandId,
        condition = "default",
        status = "draft",
        isFeatured = false,
        hasVariants = false,
        basePrice,
        baseDiscount = 0,
        baseStock,
        baseSku,
        size = [],
        variants = [],
        tags = [],
      } = req.body;

      let images = [];
      if (req.files && req.files.length > 0) {
        const productImgFiles = req.files.filter(
          (f) => f.fieldname === "images",
        );
        images = productImgFiles.map((file, index) => ({
          path: `products/${file.filename}`,
          url: `/uploads/products/${file.filename}`,
          isPrimary: index === 0,
          sortOrder: index,
        }));
      }

      const parsedSize = Array.isArray(size)
        ? size
        : size
          ? JSON.parse(size)
          : [];
      const parsedVariants = Array.isArray(variants)
        ? variants
        : variants
          ? JSON.parse(variants)
          : [];
      const parsedTags = Array.isArray(tags)
        ? tags
        : tags
          ? JSON.parse(tags)
          : [];

      if (req.files && req.files.length > 0) {
        const variantImgFiles = req.files.filter((f) =>
          /^variantImages_\d+$/.test(f.fieldname),
        );
        variantImgFiles.forEach((file) => {
          const idx = parseInt(file.fieldname.split("_")[1], 10);
          if (parsedVariants[idx]) {
            if (!parsedVariants[idx].images) parsedVariants[idx].images = [];
            parsedVariants[idx].images.push({
              path: `products/${file.filename}`,
              isPrimary: parsedVariants[idx].images.length === 0,
              sortOrder: parsedVariants[idx].images.length,
            });
          }
        });
      }

      if (!title) {
        return res.status(400).json({
          success: false,
          message: "Title is required",
        });
      }

      let finalBaseSku = baseSku;
      if (hasVariants === true || hasVariants === "true") {
        if (!parsedVariants || parsedVariants.length === 0) {
          return res.status(400).json({
            success: false,
            message: "At least one variant is required for variant products",
          });
        }
      } else {
        if (!basePrice) {
          return res.status(400).json({
            success: false,
            message: "Base price is required for non-variant products",
          });
        }

        if (!baseSku) {
          const timestamp = Date.now();
          const randomNum = Math.floor(Math.random() * 1000);
          finalBaseSku = `PRD-${timestamp}-${randomNum}`;
        }
      }

      const uniqueSlug = await generateUniqueSlug(title);

      let categoryInfo = null;
      let brandInfo = null;

      if (categoryId) {
        const category = await Category.findById(categoryId).lean();
        if (category) {
          categoryInfo = {
            id: category._id,
            title: category.title,
            slug: category.slug,
            path: category.pathNames || category.title,
          };
        }
      }

      if (brandId) {
        const brand = await Brand.findById(brandId).lean();
        if (brand) {
          brandInfo = {
            id: brand._id,
            title: brand.title,
            slug: brand.slug,
          };
        }
      }

      const product = new Product({
        title,
        slug: uniqueSlug,
        summary: summary || title,
        description,
        condition,
        status,
        isFeatured: isFeatured === true || isFeatured === "true",
        hasVariants: hasVariants === true || hasVariants === "true",
        basePrice:
          hasVariants === true || hasVariants === "true"
            ? null
            : parseFloat(basePrice),
        baseDiscount:
          hasVariants === true || hasVariants === "true"
            ? 0
            : parseFloat(baseDiscount) || 0,
        baseStock:
          hasVariants === true || hasVariants === "true"
            ? null
            : parseInt(baseStock) || 0,
        // undefined (not null) so Mongoose omits the field entirely —
        // sparse unique index only indexes present fields, not absent ones
        baseSku:
          hasVariants === true || hasVariants === "true"
            ? undefined
            : finalBaseSku,
        size: parsedSize,
        variants: parsedVariants,
        images,
        category: categoryInfo,
        childCategory: childCategoryId ? { id: childCategoryId } : null,
        brand: brandInfo,
        tags: parsedTags,
        ratings: {
          average: 0,
          count: 0,
          distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        },
      });

      await product.save();
      invalidateCacheByPrefix("products:index:");

      res.status(201).json({
        success: true,
        message: "Product created successfully",
        data: product,
      });
    } catch (error) {
      logger.error("Product store error", { error: error.message });

      if (error.name === "ValidationError") {
        const errors = Object.keys(error.errors).reduce((acc, key) => {
          acc[key] = error.errors[key].message;
          return acc;
        }, {});

        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors,
        });
      }

      if (error.code === 11000) {
        const field = Object.keys(error.keyValue || {})[0] || "slug or SKU";
        const value = error.keyValue?.[field];
        return res.status(409).json({
          success: false,
          message: `Duplicate value for field: ${field}${value ? ` ('${value}')` : ""}`,
        });
      }

      res.status(500).json({
        success: false,
        message: "Failed to create product",
        error: error.message,
      });
    }
  }

  async update(req, res) {
    try {
      const { id } = req.params;
      const {
        title,
        summary,
        description,
        categoryId,
        childCategoryId,
        brandId,
        condition,
        status,
        isFeatured,
        hasVariants,
        basePrice,
        baseDiscount,
        baseStock,
        baseSku,
        size,
        variants,
        tags,
        existingImages,
      } = req.body;

      const product = await Product.findById(id);

      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Product not found",
        });
      }

      let images = [];

      if (existingImages) {
        try {
          const parsedExisting =
            typeof existingImages === "string"
              ? JSON.parse(existingImages)
              : existingImages;
          images = Array.isArray(parsedExisting) ? parsedExisting : [];
        } catch (e) {
          logger.error("Error parsing existing images", { error: e.message });
          images = [];
        }
      }

      const parsedSize = size
        ? Array.isArray(size)
          ? size
          : JSON.parse(size)
        : [];
      const parsedVariants = variants
        ? Array.isArray(variants)
          ? variants
          : JSON.parse(variants)
        : [];
      const parsedTags = tags
        ? Array.isArray(tags)
          ? tags
          : JSON.parse(tags)
        : [];

      if (req.files && req.files.length > 0) {
        const productImgFiles = req.files.filter(
          (f) => f.fieldname === "images",
        );
        const newImages = productImgFiles.map((file, index) => ({
          path: `products/${file.filename}`,
          url: `/uploads/products/${file.filename}`,
          isPrimary: images.length === 0 && index === 0,
          sortOrder: images.length + index,
        }));
        images = [...images, ...newImages];

        const variantImgFiles = req.files.filter((f) =>
          /^variantImages_\d+$/.test(f.fieldname),
        );
        variantImgFiles.forEach((file) => {
          const idx = parseInt(file.fieldname.split("_")[1], 10);
          if (parsedVariants[idx]) {
            if (!parsedVariants[idx].images) parsedVariants[idx].images = [];
            parsedVariants[idx].images.push({
              path: `products/${file.filename}`,
              isPrimary: parsedVariants[idx].images.length === 0,
              sortOrder: parsedVariants[idx].images.length,
            });
          }
        });
      }

      let categoryInfo = product.category;
      let brandInfo = product.brand;

      if (categoryId && categoryId !== product.category?.id?.toString()) {
        const category = await Category.findById(categoryId).lean();
        if (category) {
          categoryInfo = {
            id: category._id,
            title: category.title,
            slug: category.slug,
            path: category.pathNames || category.title,
          };
        }
      }

      if (brandId && brandId !== product.brand?.id?.toString()) {
        const brand = await Brand.findById(brandId).lean();
        if (brand) {
          brandInfo = {
            id: brand._id,
            title: brand.title,
            slug: brand.slug,
          };
        }
      }

      const parseOptionalBoolean = (value) => {
        if (value === undefined) return undefined;
        if (value === true || value === "true" || value === 1 || value === "1")
          return true;
        if (
          value === false ||
          value === "false" ||
          value === 0 ||
          value === "0"
        )
          return false;
        return undefined;
      };

      const parsedIsFeatured = parseOptionalBoolean(isFeatured);
      const parsedHasVariants = parseOptionalBoolean(hasVariants);

      const resolvedHasVariants = parsedHasVariants ?? product.hasVariants;
      const parsedBasePrice =
        basePrice !== undefined ? Number.parseFloat(basePrice) : undefined;
      const parsedBaseDiscount =
        baseDiscount !== undefined
          ? Number.parseFloat(baseDiscount)
          : undefined;
      const parsedBaseStock =
        baseStock !== undefined ? Number.parseInt(baseStock, 10) : undefined;

      product.title = title ?? product.title;
      product.summary = summary ?? title ?? product.summary;
      product.description = description ?? product.description;
      product.condition = condition ?? product.condition;
      product.status = status ?? product.status;

      if (parsedIsFeatured !== undefined) {
        product.isFeatured = parsedIsFeatured;
      }

      if (parsedHasVariants !== undefined) {
        product.hasVariants = parsedHasVariants;
      }

      if (resolvedHasVariants) {
        product.basePrice = null;
        product.baseDiscount = 0;
        product.baseStock = null;
        // Do NOT set baseSku here — handled via $unset after save
        // to avoid sparse unique index collision on null values
      } else {
        if (basePrice !== undefined && Number.isFinite(parsedBasePrice)) {
          product.basePrice = parsedBasePrice;
        }

        if (baseDiscount !== undefined && Number.isFinite(parsedBaseDiscount)) {
          product.baseDiscount = parsedBaseDiscount;
        }

        if (baseStock !== undefined && Number.isFinite(parsedBaseStock)) {
          product.baseStock = parsedBaseStock;
        }

        if (baseSku !== undefined) {
          product.baseSku = baseSku;
        }
      }

      product.size = parsedSize;
      product.variants = parsedVariants;
      product.images = images;
      product.category = categoryInfo;
      product.childCategory = childCategoryId
        ? { id: childCategoryId }
        : product.childCategory;
      product.brand = brandInfo;
      product.tags = parsedTags;

      await product.save();

      // $unset baseSku for variant products — setting to null would conflict
      // with the sparse unique index on subsequent variant products
      if (resolvedHasVariants) {
        await Product.updateOne(
          { _id: product._id },
          { $unset: { baseSku: 1 } },
        );
        product.baseSku = undefined;
      }

      invalidateCacheByPrefix("products:index:");

      res.json({
        success: true,
        message: "Product updated successfully",
        data: product,
      });
    } catch (error) {
      logger.error("Product update error", { error: error.message });

      if (error.name === "ValidationError") {
        const errors = Object.keys(error.errors).reduce((acc, key) => {
          acc[key] = error.errors[key].message;
          return acc;
        }, {});

        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors,
        });
      }

      res.status(500).json({
        success: false,
        message: "Failed to update product",
        error: error.message,
      });
    }
  }

  async destroy(req, res) {
    try {
      const { id } = req.params;

      const product = await Product.findById(id);

      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Product not found",
        });
      }

      await product.deleteOne();
      invalidateCacheByPrefix("products:index:");

      res.json({
        success: true,
        message: "Product deleted successfully",
      });
    } catch (error) {
      logger.error("Product delete error", { error: error.message });
      res.status(500).json({
        success: false,
        message: "Failed to delete product",
      });
    }
  }

  async byCategory(req, res) {
    try {
      const { categoryId } = req.params;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const sort = req.query.sort || "-createdAt";

      const result = await Product.findByCategory(categoryId, {
        page,
        limit,
        sort,
      });

      const total = await Product.countDocuments({
        "category.id": categoryId,
        status: "active",
      });

      res.json({
        success: true,
        data: {
          products: result,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
          },
        },
      });
    } catch (error) {
      logger.error("Products by category error", { error: error.message });
      res.status(500).json({
        success: false,
        message: "Failed to fetch products by category",
      });
    }
  }

  async byBrand(req, res) {
    try {
      const { brandId } = req.params;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const sort = req.query.sort || "-createdAt";

      const result = await Product.findByBrand(brandId, {
        page,
        limit,
        sort,
      });

      const total = await Product.countDocuments({
        "brand.id": brandId,
        status: "active",
      });

      res.json({
        success: true,
        data: {
          products: result,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
          },
        },
      });
    } catch (error) {
      logger.error("Products by brand error", { error: error.message });
      res.status(500).json({
        success: false,
        message: "Failed to fetch products by brand",
      });
    }
  }

  async updateStock(req, res) {
    try {
      const { id } = req.params;
      const { variantId, quantity } = req.body;

      const product = await Product.findById(id);

      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Product not found",
        });
      }

      await product.updateStock(variantId, quantity);

      res.json({
        success: true,
        message: "Stock updated successfully",
        data: product,
      });
    } catch (error) {
      logger.error("Update stock error", { error: error.message });
      res.status(400).json({
        success: false,
        message: error.message || "Failed to update stock",
      });
    }
  }

  async lowStock(req, res) {
    try {
      const threshold = parseInt(req.query.threshold) || 10;

      const products = await Product.getLowStockProducts(threshold);

      res.json({
        success: true,
        data: products,
      });
    } catch (error) {
      logger.error("Low stock error", { error: error.message });
      res.status(500).json({
        success: false,
        message: "Failed to fetch low stock products",
      });
    }
  }

  async related(req, res) {
    try {
      const { id } = req.params;
      const limit = Math.min(
        20,
        Math.max(1, Number.parseInt(req.query.limit, 10) || 8),
      );

      const product = await Product.findById(id).lean();

      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Product not found",
        });
      }

      const query = {
        _id: { $ne: product._id },
        status: "active",
        $or: [],
      };

      if (product.category?.id) {
        query.$or.push({ "category.id": product.category.id });
      }

      if (product.brand?.id) {
        query.$or.push({ "brand.id": product.brand.id });
      }

      if (query.$or.length === 0 && product.tags?.length > 0) {
        query.tags = { $in: product.tags };
        delete query.$or;
      }

      const relatedProducts = await Product.find(query)
        .select(PRODUCT_LIST_SELECT)
        .sort({ salesCount: -1, "ratings.average": -1 })
        .limit(limit)
        .lean();

      res.json({
        success: true,
        data: relatedProducts,
      });
    } catch (error) {
      logger.error("Related products error", { error: error.message });
      res.status(500).json({
        success: false,
        message: "Failed to fetch related products",
      });
    }
  }

  async adminShow(req, res) {
    try {
      const { id } = req.params;
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid product ID" });
      }
      const product = await Product.findById(id).lean();
      if (!product) {
        return res
          .status(404)
          .json({ success: false, message: "Product not found" });
      }
      res.json({ success: true, data: product });
    } catch (error) {
      logger.error("adminShow error", { error: error.message });
      res
        .status(500)
        .json({ success: false, message: "Failed to fetch product" });
    }
  }
}

export const productController = new ProductController();
