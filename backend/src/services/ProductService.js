import { Product } from "../models/Product.js";
import { Category } from "../models/Category.js";
import { Brand } from "../models/Brand.js";
import { BaseService } from "../core/BaseService.js";
import { AppError } from "../middleware/errorHandler.js";
import { logger } from "../utils/logger.js";
import { generateUniqueSlug, parseBoolean } from "../utils/shared.js";
import {
  getCachedResponse,
  setCachedResponse,
  invalidateCacheByPrefix,
} from "../utils/requestCache.js";
import { imageProcessingService } from "./ImageProcessingService.js";
import mongoose from "mongoose";

const MAX_PAGE_SIZE = 100;
const CACHE_TTL_MS = 15_000;

const LISTING_SELECT = [
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

function parseSort(sort = "-createdAt") {
  const value =
    SORT_ALIASES[String(sort).trim()] || String(sort).trim() || "-createdAt";
  const desc = value.startsWith("-");
  const field = desc ? value.slice(1) : value;
  return ALLOWED_SORT_FIELDS.has(field)
    ? { [field]: desc ? -1 : 1 }
    : { createdAt: -1 };
}

export class ProductService extends BaseService {
  constructor() {
    super(Product);
  }

  async listProducts(options = {}, cacheKey = null) {
    if (cacheKey) {
      const cached = getCachedResponse(cacheKey);
      if (cached) return { ...cached, cacheHit: true };
    }

    const {
      page = 1,
      limit = 20,
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
      includeCount = true,
      sort = "-createdAt",
    } = options;

    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.min(MAX_PAGE_SIZE, Math.max(1, Number(limit) || 20));
    const skip = (safePage - 1) * safeLimit;

    const baseQuery = {};
    if (search) {
      const escaped = String(search)
        .trim()
        .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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
      const pMin = Number.parseFloat(minPrice);
      const pMax = Number.parseFloat(maxPrice);
      if (Number.isFinite(pMin)) baseQuery.basePrice.$gte = pMin;
      if (Number.isFinite(pMax)) baseQuery.basePrice.$lte = pMax;
      if (!Object.keys(baseQuery.basePrice).length) delete baseQuery.basePrice;
    }
    if (condition) baseQuery.condition = condition;
    if (isFeatured !== undefined)
      baseQuery.isFeatured = isFeatured === "true" || isFeatured === true;

    const query = { ...baseQuery };
    if (status && status !== "all") query.status = status;
    if (hasVariants === "true" || hasVariants === true)
      query.hasVariants = true;
    else if (hasVariants === "false" || hasVariants === false)
      query.hasVariants = false;

    const [products, totalCount, filterCounts] = await Promise.all([
      this.model
        .find(query)
        .select(LISTING_SELECT)
        .sort(parseSort(sort))
        .skip(skip)
        .limit(safeLimit)
        .lean(),
      includeCount ? this.model.countDocuments(query) : Promise.resolve(null),
      Promise.all([
        this.model.countDocuments(baseQuery),
        this.model.countDocuments({ ...baseQuery, status: "active" }),
        this.model.countDocuments({ ...baseQuery, status: "inactive" }),
        this.model.countDocuments({ ...baseQuery, hasVariants: true }),
        this.model.countDocuments({ ...baseQuery, hasVariants: false }),
      ]),
    ]);

    const total =
      typeof totalCount === "number"
        ? totalCount
        : skip + products.length + (products.length === safeLimit ? 1 : 0);
    const pages = Math.ceil(total / safeLimit);

    const payload = {
      products,
      pagination: {
        page: safePage,
        limit: safeLimit,
        total,
        pages,
        hasNext: safePage < pages,
        hasPrev: safePage > 1,
      },
      filterCounts: {
        all: filterCounts[0],
        active: filterCounts[1],
        inactive: filterCounts[2],
        withVariants: filterCounts[3],
        withoutVariants: filterCounts[4],
      },
    };

    if (cacheKey)
      setCachedResponse(
        cacheKey,
        { success: true, data: payload },
        CACHE_TTL_MS,
      );
    return { success: true, data: payload, cacheHit: false };
  }

  async getProducts(options = {}) {
    const {
      page = 1,
      limit = 20,
      search,
      categoryId,
      brandId,
      minPrice,
      maxPrice,
      condition,
      isFeatured,
      status = "active",
      sort = "-createdAt",
    } = options;

    const filter = { status };
    if (search) filter.$text = { $search: search };
    if (categoryId && mongoose.Types.ObjectId.isValid(categoryId)) {
      filter["category.id"] = new mongoose.Types.ObjectId(categoryId);
    }
    if (brandId && mongoose.Types.ObjectId.isValid(brandId)) {
      filter["brand.id"] = new mongoose.Types.ObjectId(brandId);
    }
    if (minPrice || maxPrice) {
      filter.basePrice = {};
      if (minPrice) filter.basePrice.$gte = parseFloat(minPrice);
      if (maxPrice) filter.basePrice.$lte = parseFloat(maxPrice);
    }
    if (condition) filter.condition = condition;
    if (isFeatured !== undefined)
      filter.isFeatured = isFeatured === "true" || isFeatured === true;

    const skip = (page - 1) * limit;
    const isFiltered =
      search ||
      categoryId ||
      brandId ||
      minPrice ||
      maxPrice ||
      condition ||
      isFeatured !== undefined;

    const [products, total] = await Promise.all([
      this.model
        .find(filter)
        .select(LISTING_SELECT)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      isFiltered
        ? this.model.countDocuments(filter)
        : this.model.estimatedDocumentCount(),
    ]);

    return {
      items: products,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  async getFeaturedProducts(limit = 10) {
    return this.model
      .find({ status: "active", isFeatured: true })
      .select(LISTING_SELECT)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
  }

  async searchProducts(query, filters = {}, page = 1, limit = 20) {
    if (!query) throw new AppError("Search query is required", 400);
    const safeLimit = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
    const safePage = Math.max(1, parseInt(page, 10) || 1);
    const skip = (safePage - 1) * safeLimit;

    const searchFilter = {
      $text: { $search: query },
      status: "active",
      ...filters,
    };
    const [products, total] = await Promise.all([
      this.model
        .find(searchFilter, { score: { $meta: "textScore" } })
        .select(LISTING_SELECT)
        .sort({ score: { $meta: "textScore" } })
        .skip(skip)
        .limit(safeLimit)
        .lean(),
      this.model.countDocuments(searchFilter),
    ]);

    return {
      items: products,
      pagination: {
        page: safePage,
        limit: safeLimit,
        total,
        pages: Math.ceil(total / safeLimit),
      },
    };
  }

  async getProductBySlugOrId(identifier, filterActive = true) {
    let product;
    if (mongoose.Types.ObjectId.isValid(identifier)) {
      const query = filterActive
        ? { _id: identifier, status: "active" }
        : { _id: identifier };
      product = await this.model.findOne(query).lean();
    }
    if (!product) {
      const query = filterActive
        ? { slug: identifier, status: "active" }
        : { slug: identifier };
      product = await this.model.findOne(query).lean();
    }
    if (!product) {
      const skuQuery = {
        $or: [{ baseSku: identifier }, { "variants.sku": identifier }],
      };
      if (filterActive) skuQuery.status = "active";
      product = await this.model.findOne(skuQuery).lean();
    }
    if (!product) throw new AppError("Product not found", 404);

    this.model
      .findByIdAndUpdate(product._id, { $inc: { viewCount: 1 } })
      .exec();
    return product;
  }

  async getProductAdmin(id) {
    if (!mongoose.Types.ObjectId.isValid(id))
      throw new AppError("Invalid product ID", 400);
    const product = await this.model.findById(id).lean();
    if (!product) throw new AppError("Product not found", 404);
    return product;
  }

  async extractImages(files = []) {
    const productImgFiles = files.filter((f) => f.fieldname === "images");
    const results = await imageProcessingService.processAndSaveMany(
      productImgFiles,
      "product",
      "products",
      "product-",
    );
    return results.map((r, index) => ({
      path: r.path,
      url: `/uploads/${r.path}`,
      thumbnailPath: r.thumbnailPath ? `/uploads/${r.thumbnailPath}` : null,
      isPrimary: index === 0,
      sortOrder: index,
    }));
  }

  async mergeVariantImages(files = [], variants = []) {
    const variantImgFiles = files.filter((f) =>
      /^variantImages_\d+$/.test(f.fieldname),
    );
    for (const file of variantImgFiles) {
      const idx = parseInt(file.fieldname.split("_")[1], 10);
      if (variants[idx]) {
        if (!variants[idx].images) variants[idx].images = [];
        const result = await imageProcessingService.processAndSave(
          file,
          "product",
          "products",
          "variant-",
        );
        variants[idx].images.push({
          path: result.path,
          isPrimary: variants[idx].images.length === 0,
          sortOrder: variants[idx].images.length,
        });
      }
    }
    return variants;
  }

  parseJsonField(value) {
    if (Array.isArray(value)) return value;
    if (!value) return [];
    try {
      return JSON.parse(value);
    } catch {
      return [];
    }
  }

  async resolveCategory(categoryId) {
    if (!categoryId) return null;
    const cat = await Category.findById(categoryId).lean();
    if (!cat) return null;
    return {
      id: cat._id,
      title: cat.title,
      slug: cat.slug,
      path: cat.pathNames || cat.title,
    };
  }

  async resolveBrand(brandId) {
    if (!brandId) return null;
    const brand = await Brand.findById(brandId).lean();
    if (!brand) return null;
    return { id: brand._id, title: brand.title, slug: brand.slug };
  }

  async storeProduct(body, files = []) {
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
      size,
      variants,
      tags,
    } = body;

    if (!title) throw new AppError("Title is required", 400);

    const isVariant = parseBoolean(hasVariants);
    const parsedVariants = await this.mergeVariantImages(
      files,
      this.parseJsonField(variants),
    );
    const parsedSize = this.parseJsonField(size);
    const parsedTags = this.parseJsonField(tags);
    const images = await this.extractImages(files);

    if (isVariant && (!parsedVariants || parsedVariants.length === 0)) {
      throw new AppError(
        "At least one variant is required for variant products",
        400,
      );
    }
    if (!isVariant && !basePrice) {
      throw new AppError(
        "Base price is required for non-variant products",
        400,
      );
    }

    let finalBaseSku = baseSku;
    if (!isVariant && !baseSku) {
      finalBaseSku = `PRD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    }

    const slug = await generateUniqueSlug(Product, title);
    const [categoryInfo, brandInfo] = await Promise.all([
      this.resolveCategory(categoryId),
      this.resolveBrand(brandId),
    ]);

    const product = new Product({
      title,
      slug,
      summary: summary || title,
      description,
      condition,
      status,
      isFeatured: parseBoolean(isFeatured),
      hasVariants: isVariant,
      basePrice: isVariant ? null : parseFloat(basePrice),
      baseDiscount: isVariant ? 0 : parseFloat(baseDiscount) || 0,
      baseStock: isVariant ? null : parseInt(baseStock) || 0,
      baseSku: isVariant ? undefined : finalBaseSku,
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
    return product;
  }

  async updateFullProduct(id, body, files = []) {
    const product = await this.model.findById(id);
    if (!product) throw new AppError("Product not found", 404);

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
    } = body;

    let images = [];
    if (existingImages) {
      try {
        const parsed =
          typeof existingImages === "string"
            ? JSON.parse(existingImages)
            : existingImages;
        images = Array.isArray(parsed) ? parsed : [];
      } catch {
        images = [];
      }
    }

    const parsedVariants = await this.mergeVariantImages(
      files,
      this.parseJsonField(variants),
    );
    const parsedSize = this.parseJsonField(size);
    const parsedTags = this.parseJsonField(tags);

    if (files.length > 0) {
      const newImageFiles = files.filter((f) => f.fieldname === "images");
      const processedImages = await imageProcessingService.processAndSaveMany(
        newImageFiles,
        "product",
        "products",
        "product-",
      );
      const newImages = processedImages.map((r, i) => ({
        path: r.path,
        url: `/uploads/${r.path}`,
        thumbnailPath: r.thumbnailPath ? `/uploads/${r.thumbnailPath}` : null,
        isPrimary: images.length === 0 && i === 0,
        sortOrder: images.length + i,
      }));
      images = [...images, ...newImages];
    }

    const parseBool = (v) => {
      if (v === undefined) return undefined;
      if (v === true || v === "true" || v === 1 || v === "1") return true;
      if (v === false || v === "false" || v === 0 || v === "0") return false;
      return undefined;
    };

    const resolvedHasVariants = parseBool(hasVariants) ?? product.hasVariants;

    if (categoryId && categoryId !== product.category?.id?.toString()) {
      product.category =
        (await this.resolveCategory(categoryId)) || product.category;
    }
    if (brandId && brandId !== product.brand?.id?.toString()) {
      product.brand = (await this.resolveBrand(brandId)) || product.brand;
    }

    product.title = title ?? product.title;
    product.summary = summary ?? title ?? product.summary;
    product.description = description ?? product.description;
    product.condition = condition ?? product.condition;
    product.status = status ?? product.status;
    if (parseBool(isFeatured) !== undefined)
      product.isFeatured = parseBool(isFeatured);
    if (parseBool(hasVariants) !== undefined)
      product.hasVariants = parseBool(hasVariants);

    if (resolvedHasVariants) {
      product.basePrice = null;
      product.baseDiscount = 0;
      product.baseStock = null;
    } else {
      if (basePrice !== undefined) {
        const p = Number.parseFloat(basePrice);
        if (Number.isFinite(p)) product.basePrice = p;
      }
      if (baseDiscount !== undefined) {
        const d = Number.parseFloat(baseDiscount);
        if (Number.isFinite(d)) product.baseDiscount = d;
      }
      if (baseStock !== undefined) {
        const s = Number.parseInt(baseStock, 10);
        if (Number.isFinite(s)) product.baseStock = s;
      }
      if (baseSku !== undefined) product.baseSku = baseSku;
    }

    product.size = parsedSize;
    product.variants = parsedVariants;
    product.images = images;
    product.tags = parsedTags;
    if (childCategoryId) product.childCategory = { id: childCategoryId };

    await product.save();

    if (resolvedHasVariants) {
      await Product.updateOne({ _id: product._id }, { $unset: { baseSku: 1 } });
      product.baseSku = undefined;
    }

    invalidateCacheByPrefix("products:index:");
    return product;
  }

  async appendImages(productId, files = [], variantIndexMap = {}) {
    const product = await this.model.findById(productId);
    if (!product) throw new AppError("Product not found", 404);

    const productImgFiles = files.filter((f) => f.fieldname === "images");
    if (productImgFiles.length) {
      const currentCount = product.images?.length || 0;
      const processedImages = await imageProcessingService.processAndSaveMany(
        productImgFiles,
        "product",
        "products",
        "product-",
      );
      const newImages = processedImages.map((r, i) => ({
        path: r.path,
        isPrimary: currentCount === 0 && i === 0,
        sortOrder: currentCount + i,
      }));
      product.images = [...(product.images || []), ...newImages];
    }

    const variantImgFiles = files.filter((f) =>
      /^variantImages_\d+$/.test(f.fieldname),
    );
    for (const file of variantImgFiles) {
      const idx = parseInt(file.fieldname.split("_")[1], 10);
      if (product.variants?.[idx]) {
        if (!product.variants[idx].images) product.variants[idx].images = [];
        const result = await imageProcessingService.processAndSave(
          file,
          "product",
          "products",
          "variant-",
        );
        product.variants[idx].images.push({
          path: result.path,
          isPrimary: product.variants[idx].images.length === 0,
          sortOrder: product.variants[idx].images.length,
        });
      }
    }

    await product.save();
    return product;
  }

  async deleteProduct(id) {
    const product = await this.model.findById(id);
    if (!product) throw new AppError("Product not found", 404);
    await product.deleteOne();
    invalidateCacheByPrefix("products:index:");
  }

  async createProduct(productData) {
    if (!productData.slug && productData.title) {
      productData.slug = await generateUniqueSlug(Product, productData.title);
    }
    if (productData.categoryId) {
      const info = await this.resolveCategory(productData.categoryId);
      if (!info) throw new AppError("Category not found", 404);
      productData.category = info;
    }
    if (productData.brandId) {
      const info = await this.resolveBrand(productData.brandId);
      if (!info) throw new AppError("Brand not found", 404);
      productData.brand = info;
    }
    const product = await this.create(productData);
    logger.info("Product created successfully:", product._id);
    return product;
  }

  async updateProduct(id, updateData) {
    if (updateData.title && !updateData.slug) {
      updateData.slug = await generateUniqueSlug(Product, updateData.title, id);
    }
    if (updateData.categoryId) {
      const info = await this.resolveCategory(updateData.categoryId);
      if (!info) throw new AppError("Category not found", 404);
      updateData.category = info;
      delete updateData.categoryId;
    }
    if (updateData.brandId) {
      const info = await this.resolveBrand(updateData.brandId);
      if (!info) throw new AppError("Brand not found", 404);
      updateData.brand = info;
      delete updateData.brandId;
    }
    const product = await this.updateOrFail(id, updateData);
    logger.info("Product updated successfully:", id);
    return product;
  }

  async getProductsByCategory(categoryId, options = {}) {
    if (!mongoose.Types.ObjectId.isValid(categoryId))
      throw new AppError("Invalid category ID", 400);
    return this.getProducts({ ...options, categoryId });
  }

  async getProductsByBrand(brandId, options = {}) {
    if (!mongoose.Types.ObjectId.isValid(brandId))
      throw new AppError("Invalid brand ID", 400);
    return this.getProducts({ ...options, brandId });
  }

  async getRelatedProducts(productId, limit = 6) {
    const product = await this.findByIdOrFail(productId);
    const query = { _id: { $ne: productId }, status: "active", $or: [] };
    if (product.category?.id)
      query.$or.push({ "category.id": product.category.id });
    if (product.brand?.id) query.$or.push({ "brand.id": product.brand.id });
    if (!query.$or.length && product.tags?.length) {
      query.tags = { $in: product.tags };
      delete query.$or;
    }
    if (query.$or && !query.$or.length) delete query.$or;

    return this.model
      .find(query)
      .select(LISTING_SELECT)
      .sort({ salesCount: -1, "ratings.average": -1 })
      .limit(limit)
      .lean();
  }

  async getLowStockProducts(threshold = 10, limit = 50) {
    return this.model
      .find({ status: "active", baseStock: { $lte: threshold, $gt: 0 } })
      .sort({ baseStock: 1 })
      .limit(limit)
      .select("title baseStock baseSku basePrice")
      .lean();
  }

  async updateStock(id, quantity) {
    const product = await this.model.findByIdAndUpdate(
      id,
      { $inc: { baseStock: quantity } },
      { new: true, runValidators: true },
    );
    if (!product) throw new AppError("Product not found", 404);
    logger.info(`Product stock updated: ${id}, quantity: ${quantity}`);
    return product;
  }
}
