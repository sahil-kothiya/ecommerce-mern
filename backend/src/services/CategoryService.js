import { Category } from "../models/Category.js";
import { Product } from "../models/Product.js";
import { Brand } from "../models/Brand.js";
import { Filter } from "../models/Filter.js";
import { BaseService } from "../core/BaseService.js";
import { AppError } from "../middleware/errorHandler.js";
import { logger } from "../utils/logger.js";
import mongoose from "mongoose";
import path from "path";
import fs from "fs";
import {
  getCachedResponse,
  setCachedResponse,
  invalidateCacheByPrefix,
} from "../utils/requestCache.js";
import { parseBoolean, normalizeStatus } from "../utils/shared.js";
import { imageProcessingService } from "./ImageProcessingService.js";

const CACHE_TTL = 15000;

function normalizeIdArray(...values) {
  const flattened = values.flatMap((v) => {
    if (v === undefined || v === null) return [];
    if (Array.isArray(v)) return v;
    if (typeof v === "string") {
      const t = v.trim();
      if (!t) return [];
      if (t.startsWith("[") && t.endsWith("]")) {
        try {
          const parsed = JSON.parse(t);
          return Array.isArray(parsed) ? parsed : [];
        } catch {
          return [];
        }
      }
      return t.split(",").map((i) => i.trim());
    }
    return [v];
  });
  const unique = [
    ...new Set(flattened.map((i) => String(i).trim()).filter(Boolean)),
  ];
  return unique.filter((i) => mongoose.Types.ObjectId.isValid(i));
}

export class CategoryService extends BaseService {
  constructor() {
    super(Category);
  }

  buildTree(categories, parentId = null) {
    const tree = [];
    for (const cat of categories) {
      const catParent = cat.parentId || null;
      const match =
        parentId === null
          ? catParent === null
          : String(catParent) === String(parentId);
      if (match) {
        const children = this.buildTree(categories, cat._id);
        const obj = { ...cat };
        if (children.length > 0) obj.children = children;
        tree.push(obj);
      }
    }
    return tree;
  }

  async generateUniqueCode(title, excludeId = null) {
    const raw = String(title || "")
      .replace(/[^a-zA-Z0-9]/g, "")
      .toUpperCase();
    const base = (raw.slice(0, 3) || "XXX").padEnd(3, "X");
    const filter = excludeId
      ? { _id: { $ne: excludeId }, code: { $exists: true, $ne: null } }
      : { code: { $exists: true, $ne: null } };
    const existing = await this.model.find(filter).select("code").lean();
    const used = new Set(existing.map((i) => i.code).filter(Boolean));
    if (!used.has(base)) return base;
    const prefix = base.slice(0, 2);
    for (let i = 0; i <= 9; i++) {
      const candidate = `${prefix}${i}`;
      if (!used.has(candidate)) return candidate;
    }
    return `${prefix}${Math.floor(Math.random() * 10)}`;
  }

  async computeHierarchy(parentId) {
    if (!parentId) return { level: 0, path: null };
    const parent = await this.model
      .findById(parentId)
      .select("_id level path")
      .lean();
    if (!parent) return null;
    return {
      level: (parent.level || 0) + 1,
      path: parent.path ? `${parent.path}/${parent._id}` : String(parent._id),
    };
  }

  async listCategories({
    parent,
    includeChildren,
    status,
    sort = "sortOrder",
    page,
    limit,
    noCache,
  } = {}) {
    const bypass =
      String(noCache || "")
        .trim()
        .toLowerCase() === "true";
    const cacheKey = `categories:index:${JSON.stringify({ parent, includeChildren, status, sort, page, limit })}`;
    if (!bypass) {
      const cached = getCachedResponse(cacheKey);
      if (cached) return { ...cached, cacheHit: true };
    }

    const query = {};
    if (status) query.status = status;
    if (parent === "null") query.parentId = null;
    else if (parent) query.parentId = new mongoose.Types.ObjectId(parent);

    if (includeChildren === "true" && !parent) {
      const all = await this.model
        .find(status ? { status } : {})
        .sort(sort)
        .lean();
      const data = this.buildTree(all);
      const payload = { data };
      if (!bypass) setCachedResponse(cacheKey, payload, CACHE_TTL);
      return { ...payload, cacheHit: false };
    }

    const parsedPage = Math.max(1, parseInt(page, 10) || 1);
    const parsedLimitRaw = parseInt(limit, 10);
    const parsedLimit = Number.isFinite(parsedLimitRaw)
      ? Math.min(200, Math.max(1, parsedLimitRaw))
      : null;

    let q = this.model.find(query).sort(sort);
    if (parsedLimit)
      q = q.skip((parsedPage - 1) * parsedLimit).limit(parsedLimit);
    const data = await q.lean();

    const payload = { data };
    if (!bypass) setCachedResponse(cacheKey, payload, CACHE_TTL);
    return { ...payload, cacheHit: false };
  }

  async getCategoryTree(maxDepth = 3) {
    const categories = await this.model
      .find({ status: "active" })
      .sort("sortOrder")
      .lean();
    const fullTree = this.buildTree(categories);
    const parsedMax = parseInt(maxDepth, 10);
    if (!Number.isFinite(parsedMax)) return fullTree;

    const limitDepth = (nodes, depth = 0) => {
      if (!Array.isArray(nodes) || depth >= parsedMax) return [];
      return nodes.map((n) => ({
        ...n,
        children: limitDepth(n.children || [], depth + 1),
      }));
    };
    return limitDepth(fullTree);
  }

  async getFlatCategories() {
    return this.model
      .find({ status: "active" })
      .select("title slug parentId path level")
      .sort("path")
      .lean();
  }

  async getFilters() {
    let filters = await Filter.find({ status: "active" })
      .select("name title description status")
      .sort({ title: 1 })
      .lean();
    if (filters.length === 0) {
      const defaults = [
        {
          name: "brand",
          title: "Brands",
          description: "Filter products by brand",
          status: "active",
        },
        {
          name: "rating",
          title: "Customer Ratings",
          description: "Filter products by customer ratings",
          status: "active",
        },
        {
          name: "discount",
          title: "Discounts",
          description: "Filter products by discount percentage",
          status: "active",
        },
        {
          name: "price",
          title: "Price Range",
          description: "Filter products by price range",
          status: "active",
        },
        {
          name: "recently-viewed",
          title: "Recently Viewed",
          description: "Show recently viewed products",
          status: "active",
        },
      ];
      await Promise.all(
        defaults.map((d) =>
          Filter.updateOne(
            { name: d.name },
            { $setOnInsert: d },
            { upsert: true },
          ),
        ),
      );
      filters = await Filter.find({ status: "active" })
        .select("name title description status")
        .sort({ title: 1 })
        .lean();
    }
    return filters;
  }

  async getNavigationCategories(maxLevels = 2) {
    return this.model
      .find({
        status: "active",
        level: { $lte: parseInt(maxLevels) },
        isNavigationVisible: true,
      })
      .sort("position")
      .lean()
      .then((cats) => this.buildTree(cats));
  }

  async getCategoryById(id, includeChildren = false) {
    const category = await this.model.findById(id).lean();
    if (!category || category.status !== "active")
      throw new AppError("Category not found", 404);
    if (includeChildren === "true") {
      category.children = await this.model
        .find({ parentId: category._id, status: "active" })
        .sort("sortOrder")
        .lean();
    }
    return category;
  }

  async getCategoryBySlug(slug, includeChildren = false) {
    const category = await this.model
      .findOne({ slug, status: "active" })
      .lean();
    if (!category) throw new AppError("Category not found", 404);
    if (includeChildren === "true") {
      category.children = await this.model
        .find({ parentId: category._id, status: "active" })
        .sort("sortOrder")
        .lean();
    }
    return category;
  }

  async getBreadcrumb(id) {
    const current = await this.model
      .findById(id)
      .select("_id title slug path")
      .lean();
    if (!current) throw new AppError("Category not found", 404);

    const ancestorIds = current.path
      ? current.path
          .split("/")
          .filter(Boolean)
          .map((pid) => new mongoose.Types.ObjectId(pid))
      : [];

    if (ancestorIds.length === 0) {
      return [{ id: current._id, title: current.title, slug: current.slug }];
    }

    const ancestors = await this.model
      .find({ _id: { $in: ancestorIds } })
      .select("_id title slug")
      .lean();

    const ancestorMap = new Map(ancestors.map((a) => [String(a._id), a]));
    const breadcrumb = ancestorIds
      .map((aid) => ancestorMap.get(String(aid)))
      .filter(Boolean)
      .map((a) => ({ id: a._id, title: a.title, slug: a.slug }));

    breadcrumb.push({
      id: current._id,
      title: current.title,
      slug: current.slug,
    });
    return breadcrumb;
  }

  async getCategoryProducts(
    id,
    { page = 1, limit = 20, sort = "-createdAt" } = {},
  ) {
    const category = await this.model.findById(id).lean();
    if (!category) throw new AppError("Category not found", 404);
    const skip = (page - 1) * limit;
    const [products, total] = await Promise.all([
      Product.find({ "category.id": id, status: "active" })
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Product.countDocuments({ "category.id": id, status: "active" }),
    ]);
    return {
      category: {
        id: category._id,
        title: category.title,
        slug: category.slug,
      },
      products,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  async getCategoryBrands(id) {
    const category = await this.model.findById(id).lean();
    if (!category) throw new AppError("Category not found", 404);
    const configuredIds = Array.isArray(category.brandIds)
      ? category.brandIds
      : Array.isArray(category.brands)
        ? category.brands.map((b) => b?.id).filter(Boolean)
        : [];

    if (configuredIds.length > 0) {
      return Brand.find({
        _id: { $in: configuredIds },
        status: "active",
      }).lean();
    }

    return Product.aggregate([
      { $match: { "category.id": category._id, status: "active" } },
      { $group: { _id: "$brand.id", brand: { $first: "$brand" } } },
      { $match: { _id: { $ne: null } } },
      { $replaceRoot: { newRoot: "$brand" } },
    ]);
  }

  async createCategory(body, file, userId) {
    const title = String(body.title || "").trim();
    if (!title) throw new AppError("Title is required", 400);

    const resolvedParentId =
      String(body.parentId ?? body.parent_id ?? "").trim() || null;
    if (
      resolvedParentId &&
      !mongoose.Types.ObjectId.isValid(resolvedParentId)
    ) {
      throw new AppError("Parent category is invalid", 400);
    }
    const hierarchy = await this.computeHierarchy(resolvedParentId);
    if (resolvedParentId && !hierarchy)
      throw new AppError("Parent category not found", 400);

    let sortOrder = parseInt(body.sortOrder ?? body.sort_order, 10);
    if (Number.isNaN(sortOrder) || sortOrder < 0)
      sortOrder = await Category.getNextPosition(resolvedParentId);

    let photoPath = body.photo || null;
    if (file) {
      const result = await imageProcessingService.processAndSave(
        file,
        "category",
        "categories",
        "category-",
      );
      photoPath = `/uploads/${result.path}`;
    }
    const brandIds = normalizeIdArray(
      body.brandIds,
      body.brands,
      body["brands[]"],
    );
    const filterIds = normalizeIdArray(
      body.filterIds,
      body.filter_ids,
      body.filters,
      body["filter_ids[]"],
    );
    const code = await this.generateUniqueCode(title);

    const category = await this.model.create({
      title,
      summary: body.summary ?? null,
      photo: photoPath,
      parentId: resolvedParentId,
      level: hierarchy?.level ?? 0,
      path: hierarchy?.path ?? null,
      sortOrder,
      status: normalizeStatus(body.status),
      isFeatured: parseBoolean(body.isFeatured ?? body.is_featured, false),
      isNavigationVisible: parseBoolean(body.isNavigationVisible, true),
      seoTitle: body.seoTitle ?? body.seo_title ?? null,
      seoDescription: body.seoDescription ?? body.seo_description ?? null,
      brandIds,
      filterIds,
      code,
      codeLocked: false,
      codeGeneratedAt: new Date(),
      addedBy: userId || null,
    });

    invalidateCacheByPrefix("categories:index:");
    invalidateCacheByPrefix("products:index:");
    return category;
  }

  async updateCategory(id, body, file) {
    const category = await this.model.findById(id);
    if (!category) throw new AppError("Category not found", 404);
    const previousTitle = category.title;

    const hasParentField =
      body.parentId !== undefined || body.parent_id !== undefined;
    let resolvedParentId = category.parentId ? String(category.parentId) : null;

    if (hasParentField) {
      const raw = body.parentId ?? body.parent_id;
      resolvedParentId = raw && String(raw).trim() ? String(raw).trim() : null;
      if (resolvedParentId === id)
        throw new AppError("Category cannot be its own parent", 400);
      if (
        resolvedParentId &&
        !mongoose.Types.ObjectId.isValid(resolvedParentId)
      )
        throw new AppError("Parent category is invalid", 400);
    }

    let hierarchy = { level: category.level || 0, path: category.path || null };
    if (hasParentField) {
      hierarchy = await this.computeHierarchy(resolvedParentId);
      if (resolvedParentId && !hierarchy)
        throw new AppError("Parent category not found", 400);
    }

    if (file) {
      if (category.photo) {
        const oldRelative = category.photo.replace(/^\/?uploads\//, "");
        await imageProcessingService.deleteFile(oldRelative);
      }
      const result = await imageProcessingService.processAndSave(
        file,
        "category",
        "categories",
        "category-",
      );
      category.photo = `/uploads/${result.path}`;
    } else if (body.photo !== undefined) {
      category.photo = body.photo || null;
    }

    if (body.title !== undefined) category.title = body.title;
    if (body.summary !== undefined) category.summary = body.summary;
    if (body.status !== undefined)
      category.status = normalizeStatus(body.status, category.status);
    if (body.isNavigationVisible !== undefined)
      category.isNavigationVisible = parseBoolean(
        body.isNavigationVisible,
        category.isNavigationVisible,
      );
    if (body.seoTitle !== undefined || body.seo_title !== undefined)
      category.seoTitle = body.seoTitle ?? body.seo_title ?? null;
    if (body.seoDescription !== undefined || body.seo_description !== undefined)
      category.seoDescription =
        body.seoDescription ?? body.seo_description ?? null;
    if (body.sortOrder !== undefined || body.sort_order !== undefined) {
      const parsed = parseInt(body.sortOrder ?? body.sort_order, 10);
      if (!Number.isNaN(parsed) && parsed >= 0) category.sortOrder = parsed;
    }

    if (hasParentField) {
      category.parentId = resolvedParentId;
      category.level = hierarchy?.level ?? 0;
      category.path = hierarchy?.path ?? null;
    }

    if (body.isFeatured !== undefined || body.is_featured !== undefined) {
      category.isFeatured = parseBoolean(
        body.isFeatured ?? body.is_featured,
        category.isFeatured,
      );
    }
    const codeLock = body.codeLocked ?? body.code_locked;
    if (codeLock !== undefined)
      category.codeLocked = parseBoolean(codeLock, category.codeLocked);

    const nextBrandIds = normalizeIdArray(
      body.brandIds,
      body.brands,
      body["brands[]"],
    );
    if (
      nextBrandIds.length > 0 ||
      body.brandIds !== undefined ||
      body.brands !== undefined ||
      body["brands[]"] !== undefined
    ) {
      category.brandIds = nextBrandIds;
    }
    const nextFilterIds = normalizeIdArray(
      body.filterIds,
      body.filter_ids,
      body.filters,
      body["filter_ids[]"],
    );
    if (
      nextFilterIds.length > 0 ||
      body.filterIds !== undefined ||
      body.filter_ids !== undefined ||
      body.filters !== undefined ||
      body["filter_ids[]"] !== undefined
    ) {
      category.filterIds = nextFilterIds;
    }

    const titleChanged =
      body.title !== undefined && String(body.title) !== String(previousTitle);
    if (titleChanged && !category.codeLocked) {
      category.code = await this.generateUniqueCode(body.title, category._id);
      category.codeGeneratedAt = new Date();
    }

    await category.save();
    invalidateCacheByPrefix("categories:index:");
    invalidateCacheByPrefix("products:index:");
    return category;
  }

  async deleteCategory(id) {
    const category = await this.model.findById(id);
    if (!category) throw new AppError("Category not found", 404);
    if ((await this.model.countDocuments({ parentId: id })) > 0)
      throw new AppError("Cannot delete category with child categories", 400);
    if ((await Product.countDocuments({ "category.id": id })) > 0)
      throw new AppError("Cannot delete category with products", 400);
    await category.deleteOne();
    invalidateCacheByPrefix("categories:index:");
    invalidateCacheByPrefix("products:index:");
  }

  async bulkReorder(updates) {
    if (!Array.isArray(updates) || updates.length === 0)
      throw new AppError("Updates array is required", 400);
    const ops = updates.map((u) => ({
      updateOne: {
        filter: { _id: u.id },
        update: {
          $set: {
            sortOrder: u.sortOrder,
            parentId: u.parentId,
            level: u.level,
          },
        },
      },
    }));
    await this.model.bulkWrite(ops);
    invalidateCacheByPrefix("categories:index:");
    invalidateCacheByPrefix("products:index:");
  }
}
