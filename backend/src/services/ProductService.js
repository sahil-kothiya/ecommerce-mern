import { Product } from "../models/Product.js";
import { Category } from "../models/Category.js";
import { Brand } from "../models/Brand.js";
import { BaseService } from "../core/BaseService.js";
import { AppError } from "../middleware/errorHandler.js";
import { logger } from "../utils/logger.js";
import slugify from "slugify";
import mongoose from "mongoose";

export class ProductService extends BaseService {
  constructor() {
    super(Product);
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

    if (search) {
      filter.$text = { $search: search };
    }

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

    if (condition) {
      filter.condition = condition;
    }

    if (isFeatured !== undefined) {
      filter.isFeatured = isFeatured === "true" || isFeatured === true;
    }

    const skip = (page - 1) * limit;

    const listingFields =
      "title slug images basePrice category brand isFeatured status hasVariants tags condition viewCount variants.sku variants.price variants.discount variants.stock variants.status variants.options";

    try {
      const [products, total] = await Promise.all([
        this.model
          .find(filter)
          .select(listingFields)
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .lean(),
        this.model.countDocuments(filter),
      ]);

      return {
        items: products,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error("ProductService.getProducts error:", error);
      throw error;
    }
  }

  async getFeaturedProducts(limit = 10) {
    const listingFields =
      "title slug images basePrice category brand isFeatured status hasVariants tags condition viewCount variants.sku variants.price variants.discount variants.stock variants.status variants.options";
    try {
      return await this.model
        .find({
          status: "active",
          isFeatured: true,
        })
        .select(listingFields)
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();
    } catch (error) {
      logger.error("ProductService.getFeaturedProducts error:", error);
      throw error;
    }
  }

  async searchProducts(query, filters = {}, page = 1, limit = 20) {
    if (!query) {
      throw new AppError("Search query is required", 400);
    }

    const safeLimit = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
    const safePage = Math.max(1, parseInt(page, 10) || 1);
    const skip = (safePage - 1) * safeLimit;
    const searchFields =
      "title slug images basePrice category brand isFeatured status hasVariants tags condition";

    try {
      const searchFilter = {
        $text: { $search: query },
        status: "active",
        ...filters,
      };

      const [products, total] = await Promise.all([
        this.model
          .find(searchFilter, { score: { $meta: "textScore" } })
          .select(searchFields)
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
    } catch (error) {
      logger.error("ProductService.searchProducts error:", error);
      throw error;
    }
  }

  async getProductBySlugOrId(identifier) {
    try {
      let product;

      if (mongoose.Types.ObjectId.isValid(identifier)) {
        product = await this.model.findById(identifier).lean();
      }

      if (!product) {
        product = await this.model.findOne({ slug: identifier }).lean();
      }

      if (!product) {
        throw new AppError("Product not found", 404);
      }

      this.model
        .findByIdAndUpdate(product._id, {
          $inc: { viewCount: 1 },
        })
        .exec();

      return product;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error("ProductService.getProductBySlugOrId error:", error);
      throw error;
    }
  }

  async createProduct(productData) {
    try {
      if (!productData.slug && productData.title) {
        productData.slug = slugify(productData.title, {
          lower: true,
          strict: true,
        });
      }

      if (productData.categoryId) {
        const category = await Category.findById(productData.categoryId);
        if (!category) {
          throw new AppError("Category not found", 404);
        }
        productData.category = {
          id: category._id,
          title: category.title,
          slug: category.slug,
        };
      }

      if (productData.brandId) {
        const brand = await Brand.findById(productData.brandId);
        if (!brand) {
          throw new AppError("Brand not found", 404);
        }
        productData.brand = {
          id: brand._id,
          title: brand.title,
          slug: brand.slug,
        };
      }

      const product = await this.create(productData);

      logger.info("Product created successfully:", product._id);

      return product;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error("ProductService.createProduct error:", error);
      throw error;
    }
  }

  async updateProduct(id, updateData) {
    try {
      if (updateData.title && !updateData.slug) {
        updateData.slug = slugify(updateData.title, {
          lower: true,
          strict: true,
        });
      }

      if (updateData.categoryId) {
        const category = await Category.findById(updateData.categoryId);
        if (!category) {
          throw new AppError("Category not found", 404);
        }
        updateData.category = {
          id: category._id,
          title: category.title,
          slug: category.slug,
        };
        delete updateData.categoryId;
      }

      if (updateData.brandId) {
        const brand = await Brand.findById(updateData.brandId);
        if (!brand) {
          throw new AppError("Brand not found", 404);
        }
        updateData.brand = {
          id: brand._id,
          title: brand.title,
          slug: brand.slug,
        };
        delete updateData.brandId;
      }

      const product = await this.updateOrFail(id, updateData);

      logger.info("Product updated successfully:", id);

      return product;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error("ProductService.updateProduct error:", error);
      throw error;
    }
  }

  async getProductsByCategory(categoryId, options = {}) {
    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
      throw new AppError("Invalid category ID", 400);
    }

    return await this.getProducts({
      ...options,
      categoryId,
    });
  }

  async getProductsByBrand(brandId, options = {}) {
    if (!mongoose.Types.ObjectId.isValid(brandId)) {
      throw new AppError("Invalid brand ID", 400);
    }

    return await this.getProducts({
      ...options,
      brandId,
    });
  }

  async getRelatedProducts(productId, limit = 6) {
    try {
      const product = await this.findByIdOrFail(productId);

      const relatedProducts = await this.model
        .find({
          _id: { $ne: productId },
          status: "active",
          $or: [
            { "category.id": product.category?.id },
            { tags: { $in: product.tags || [] } },
          ],
        })
        .sort({ viewCount: -1, createdAt: -1 })
        .limit(limit)
        .lean();

      return relatedProducts;
    } catch (error) {
      logger.error("ProductService.getRelatedProducts error:", error);
      throw error;
    }
  }

  async getLowStockProducts(threshold = 10, limit = 50) {
    try {
      return await this.model
        .find({
          status: "active",
          baseStock: { $lte: threshold, $gt: 0 },
        })
        .sort({ baseStock: 1 })
        .limit(limit)
        .select("title baseStock baseSku basePrice")
        .lean();
    } catch (error) {
      logger.error("ProductService.getLowStockProducts error:", error);
      throw error;
    }
  }

  async updateStock(id, quantity) {
    try {
      const product = await this.model.findByIdAndUpdate(
        id,
        { $inc: { baseStock: quantity } },
        { new: true, runValidators: true },
      );

      if (!product) {
        throw new AppError("Product not found", 404);
      }

      logger.info(`Product stock updated: ${id}, quantity: ${quantity}`);

      return product;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error("ProductService.updateStock error:", error);
      throw error;
    }
  }
}
