import mongoose from "mongoose";
import { BaseRepository } from "./BaseRepository.js";
import { Product } from "../models/Product.js";
import { generateUniqueSlug } from "../utils/shared.js";

export class ProductRepository extends BaseRepository {
  constructor() {
    super(Product);
  }

  async createProduct(data) {
    const product = new this.model(data);
    await product.save();
    return product;
  }

  async generateUniqueSlug(text, excludeId = null) {
    return generateUniqueSlug(this.model, text, excludeId);
  }

  async findBySlug(slug, activeOnly = true) {
    const filter = activeOnly ? { slug, status: "active" } : { slug };
    return this.findOne(filter);
  }

  async findBySlugOrId(identifier, activeOnly = true) {
    const statusFilter = activeOnly ? { status: "active" } : {};

    if (mongoose.Types.ObjectId.isValid(identifier)) {
      const byId = await this.findOne({ _id: identifier, ...statusFilter });
      if (byId) return byId;
    }

    const bySlug = await this.findOne({ slug: identifier, ...statusFilter });
    if (bySlug) return bySlug;

    return this.findOne({
      $or: [{ baseSku: identifier }, { "variants.sku": identifier }],
      ...statusFilter,
    });
  }

  async findWithFilters(filter, options = {}) {
    const {
      select = "",
      sort = { createdAt: -1 },
      page = 1,
      limit = 20,
    } = options;

    const skip = (page - 1) * limit;
    let query = this.model.find(filter);
    if (select) query = query.select(select);
    query = query.sort(sort).skip(skip).limit(limit);

    const [items, total] = await Promise.all([
      query.lean(),
      this.model.countDocuments(filter),
    ]);

    return { items, total };
  }

  async countMultiple(filters) {
    return Promise.all(filters.map((f) => this.model.countDocuments(f)));
  }

  async incrementViewCount(id) {
    return this.model.findByIdAndUpdate(id, { $inc: { viewCount: 1 } }).exec();
  }

  async updateStock(id, delta) {
    if (delta < 0) {
      return this.model.findOneAndUpdate(
        { _id: id, baseStock: { $gte: Math.abs(delta) } },
        { $inc: { baseStock: delta } },
        { new: true, runValidators: true },
      );
    }
    return this.model.findByIdAndUpdate(
      id,
      { $inc: { baseStock: delta } },
      { new: true, runValidators: true },
    );
  }

  async findLowStock(threshold = 10, limit = 50) {
    return this.find(
      { status: "active", baseStock: { $lte: threshold, $gt: 0 } },
      {
        select: "title baseStock baseSku basePrice",
        sort: { baseStock: 1 },
        limit,
      },
    );
  }

  async fullTextSearch(query, filter = {}, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const searchFilter = { $text: { $search: query }, ...filter };

    const [items, total] = await Promise.all([
      this.model
        .find(searchFilter, { score: { $meta: "textScore" } })
        .sort({ score: { $meta: "textScore" } })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.model.countDocuments(searchFilter),
    ]);

    return { items, total };
  }

  async findFeatured(limit = 10) {
    return this.find(
      { status: "active", isFeatured: true },
      { sort: { createdAt: -1 }, limit },
    );
  }

  async findRelated(productId, categoryId, brandId, limit = 6) {
    const orConditions = [];
    if (categoryId) orConditions.push({ "category.id": categoryId });
    if (brandId) orConditions.push({ "brand.id": brandId });

    const filter = {
      _id: { $ne: productId },
      status: "active",
      ...(orConditions.length ? { $or: orConditions } : {}),
    };

    return this.find(filter, {
      sort: { salesCount: -1, "ratings.average": -1 },
      limit,
    });
  }
}
