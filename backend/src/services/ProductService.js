import {
  ProductRepository,
  CategoryRepository,
  BrandRepository,
} from "../repositories/index.js";
import { BaseService } from "../core/BaseService.js";
import { AppError } from "../utils/AppError.js";
import { logger } from "../utils/logger.js";
import { parseBoolean } from "../utils/shared.js";
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

function parseBool(v) {
  if (v === undefined) return undefined;
  if (v === true || v === "true" || v === 1 || v === "1") return true;
  if (v === false || v === "false" || v === 0 || v === "0") return false;
  return undefined;
}

export class ProductService extends BaseService {
  constructor(
    productRepository = new ProductRepository(),
    categoryRepository = new CategoryRepository(),
    brandRepository = new BrandRepository(),
  ) {
    super();
    this.repository = productRepository;
    this.categoryRepository = categoryRepository;
    this.brandRepository = brandRepository;
  }

  buildProductFilter(options = {}) {
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
    } = options;

    const filter = {};

    if (search) {
      const escaped = String(search)
        .trim()
        .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.$or = [
        { title: { $regex: escaped, $options: "i" } },
        { "brand.title": { $regex: escaped, $options: "i" } },
        { tags: { $regex: escaped, $options: "i" } },
        { summary: { $regex: escaped, $options: "i" } },
      ];
    }

    if (categoryId && mongoose.Types.ObjectId.isValid(categoryId)) {
      filter["category.id"] = new mongoose.Types.ObjectId(categoryId);
    } else if (category && category !== "all") {
      filter["category.slug"] = String(category).trim();
    }

    if (brandId && mongoose.Types.ObjectId.isValid(brandId)) {
      filter["brand.id"] = new mongoose.Types.ObjectId(brandId);
    } else if (brand && brand !== "all") {
      filter["brand.slug"] = String(brand).trim();
    }

    if (minPrice || maxPrice) {
      filter.basePrice = {};
      const pMin = Number.parseFloat(minPrice);
      const pMax = Number.parseFloat(maxPrice);
      if (Number.isFinite(pMin)) filter.basePrice.$gte = pMin;
      if (Number.isFinite(pMax)) filter.basePrice.$lte = pMax;
      if (!Object.keys(filter.basePrice).length) delete filter.basePrice;
    }

    if (condition) filter.condition = condition;
    if (isFeatured !== undefined)
      filter.isFeatured = parseBool(isFeatured) ?? false;
    if (status && status !== "all") filter.status = status;

    if (hasVariants === "true" || hasVariants === true)
      filter.hasVariants = true;
    else if (hasVariants === "false" || hasVariants === false)
      filter.hasVariants = false;

    return filter;
  }

  async listProducts(options = {}, cacheKey = null) {
    if (cacheKey) {
      const cached = getCachedResponse(cacheKey);
      if (cached) return { ...cached, cacheHit: true };
    }

    const {
      page = 1,
      limit = 20,
      sort = "-createdAt",
      includeCount = true,
    } = options;
    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.min(MAX_PAGE_SIZE, Math.max(1, Number(limit) || 20));
    const skip = (safePage - 1) * safeLimit;

    const filter = this.buildProductFilter(options);
    const baseQuery = { ...filter };
    delete baseQuery.status;
    delete baseQuery.hasVariants;

    const [paginatedProducts, totalCount, filterCounts] = await Promise.all([
      this.repository.find(filter, {
        select: LISTING_SELECT,
        sort: parseSort(sort),
        skip,
        limit: safeLimit,
      }),
      includeCount ? this.repository.count(filter) : Promise.resolve(null),
      this.repository.countMultiple([
        baseQuery,
        { ...baseQuery, status: "active" },
        { ...baseQuery, status: "inactive" },
        { ...baseQuery, hasVariants: true },
        { ...baseQuery, hasVariants: false },
      ]),
    ]);

    const total =
      typeof totalCount === "number"
        ? totalCount
        : skip +
          paginatedProducts.length +
          (paginatedProducts.length === safeLimit ? 1 : 0);
    const pages = Math.ceil(total / safeLimit);

    const payload = {
      products: paginatedProducts,
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
      sort = "-createdAt",
      status = "active",
    } = options;
    const filter = {
      status,
      ...this.buildProductFilter({ ...options, status }),
    };
    const skip = (page - 1) * limit;

    const isFiltered =
      options.search ||
      options.categoryId ||
      options.brandId ||
      options.minPrice ||
      options.maxPrice ||
      options.condition ||
      options.isFeatured !== undefined;

    const [products, total] = await Promise.all([
      this.repository.find(filter, {
        select: LISTING_SELECT,
        sort: parseSort(sort),
        skip,
        limit,
      }),
      this.repository.count(filter),
    ]);

    return {
      items: products,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  async getFeaturedProducts(limit = 10) {
    return this.repository.findFeatured(limit);
  }

  async searchProducts(query, filters = {}, page = 1, limit = 20) {
    if (!query) throw new AppError("Search query is required", 400);
    const safeLimit = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
    const safePage = Math.max(1, parseInt(page, 10) || 1);
    const { items, total } = await this.repository.fullTextSearch(
      query,
      { status: "active", ...filters },
      safePage,
      safeLimit,
    );
    return {
      items,
      pagination: {
        page: safePage,
        limit: safeLimit,
        total,
        pages: Math.ceil(total / safeLimit),
      },
    };
  }

  async getProductBySlugOrId(identifier, filterActive = true) {
    const product = await this.repository.findBySlugOrId(
      identifier,
      filterActive,
    );
    if (!product) throw new AppError("Product not found", 404);
    this.repository.incrementViewCount(product._id);
    return product;
  }

  async getProductAdmin(id) {
    if (!mongoose.Types.ObjectId.isValid(id))
      throw new AppError("Invalid product ID", 400);
    return this.repository.findByIdOrFail(id);
  }

  async resolveCategory(categoryId) {
    if (!categoryId) return null;
    const cat = await this.categoryRepository.findById(categoryId);
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
    const brand = await this.brandRepository.findById(brandId);
    if (!brand) return null;
    return { id: brand._id, title: brand.title, slug: brand.slug };
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

  parseJsonField(value) {
    if (Array.isArray(value)) return value;
    if (!value) return [];
    try {
      return JSON.parse(value);
    } catch {
      return [];
    }
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

    const slug = await this.repository.generateUniqueSlug(title);
    const [categoryInfo, brandInfo] = await Promise.all([
      this.resolveCategory(categoryId),
      this.resolveBrand(brandId),
    ]);

    const product = await this.repository.createProduct({
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
      size: this.parseJsonField(size),
      variants: parsedVariants,
      images,
      category: categoryInfo,
      childCategory: childCategoryId ? { id: childCategoryId } : null,
      brand: brandInfo,
      tags: this.parseJsonField(tags),
      ratings: {
        average: 0,
        count: 0,
        distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      },
    });

    invalidateCacheByPrefix("products:index:");
    return product;
  }

  async updateFullProduct(id, body, files = []) {
    const product = await this.repository.findById(id, { lean: false });
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

    product.size = this.parseJsonField(size);
    product.variants = parsedVariants;
    product.images = images;
    product.tags = this.parseJsonField(tags);
    if (childCategoryId) product.childCategory = { id: childCategoryId };

    await product.save();

    if (resolvedHasVariants) {
      await this.repository.updateOne(
        { _id: product._id },
        { $unset: { baseSku: 1 } },
      );
      product.baseSku = undefined;
    }

    invalidateCacheByPrefix("products:index:");
    return product;
  }

  async deleteProduct(id) {
    await this.repository.deleteByIdOrFail(id);
    invalidateCacheByPrefix("products:index:");
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
    const product = await this.repository.findByIdOrFail(productId);
    return this.repository.findRelated(
      productId,
      product.category?.id,
      product.brand?.id,
      limit,
    );
  }

  async getLowStockProducts(threshold = 10, limit = 50) {
    return this.repository.findLowStock(threshold, limit);
  }

  async updateStock(id, quantity) {
    const product = await this.repository.updateStock(id, quantity);
    if (!product)
      throw new AppError(
        quantity < 0 ? "Insufficient stock" : "Product not found",
        quantity < 0 ? 400 : 404,
      );
    logger.info(`Product stock updated: ${id}, quantity: ${quantity}`);
    return product;
  }
}
