import { logger } from "../utils/logger.js";

import { Category } from "../models/Category.js";
import { Product } from "../models/Product.js";
import { Brand } from "../models/Brand.js";
import { Filter } from "../models/Filter.js";
import mongoose from "mongoose";
import path from "path";
import fs from "fs";
import { config } from "../config/index.js";

export class CategoryController {
  parseBoolean(value, fallback = false) {
    if (typeof value === "boolean") return value;
    if (typeof value === "string") {
      const normalized = value.trim().toLowerCase();
      if (["true", "1", "yes", "on"].includes(normalized)) return true;
      if (["false", "0", "no", "off", ""].includes(normalized)) return false;
    }
    if (typeof value === "number") return value === 1;
    return fallback;
  }

  normalizeIdArray(...values) {
    const flattened = values.flatMap((value) => {
      if (value === undefined || value === null) return [];
      if (Array.isArray(value)) return value;
      if (typeof value === "string") {
        const trimmed = value.trim();
        if (!trimmed) return [];

        if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
          try {
            const parsed = JSON.parse(trimmed);
            return Array.isArray(parsed) ? parsed : [];
          } catch {
            return [];
          }
        }

        return trimmed.split(",").map((item) => item.trim());
      }
      return [value];
    });

    const normalized = [
      ...new Set(flattened.map((item) => String(item).trim()).filter(Boolean)),
    ];
    return normalized.filter((item) => mongoose.Types.ObjectId.isValid(item));
  }

  normalizeStatus(status, fallback = "active") {
    return status === "inactive" ? "inactive" : fallback;
  }

  async generateUniqueCategoryCode(title, excludeId = null) {
    const raw = String(title || "")
      .replace(/[^a-zA-Z0-9]/g, "")
      .toUpperCase();
    const base = (raw.slice(0, 3) || "XXX").padEnd(3, "X");

    const existing = await Category.find(
      excludeId
        ? { _id: { $ne: excludeId }, code: { $exists: true, $ne: null } }
        : { code: { $exists: true, $ne: null } },
    )
      .select("code")
      .lean();

    const usedCodes = new Set(
      existing.map((item) => item.code).filter(Boolean),
    );
    if (!usedCodes.has(base)) {
      return base;
    }

    const prefix = base.slice(0, 2);
    for (let i = 0; i <= 9; i += 1) {
      const candidate = `${prefix}${i}`;
      if (!usedCodes.has(candidate)) {
        return candidate;
      }
    }

    return `${prefix}${Math.floor(Math.random() * 10)}`;
  }

  async computeHierarchyFields(parentId) {
    if (!parentId) {
      return { level: 0, path: null };
    }

    const parent = await Category.findById(parentId)
      .select("_id level path")
      .lean();
    if (!parent) {
      return null;
    }

    return {
      level: (parent.level || 0) + 1,
      path: parent.path ? `${parent.path}/${parent._id}` : String(parent._id),
    };
  }

  async index(req, res) {
    try {
      const {
        parent,
        includeChildren = "false",
        status,
        sort = "sortOrder",
      } = req.query;

      const query = {};

      if (status) {
        query.status = status;
      }

      if (parent === "null") {
        query.parentId = null;
      } else if (parent) {
        query.parentId = new mongoose.Types.ObjectId(parent);
      }

      if (includeChildren === "true" && !parent) {
        const categories = await Category.find(status ? { status } : {})
          .sort(sort)
          .lean();

        const categoryTree = this.buildCategoryTree(categories);
        return res.json({
          success: true,
          data: categoryTree,
        });
      }

      const categories = await Category.find(query).sort(sort).lean();

      res.json({
        success: true,
        data: categories,
      });
    } catch (error) {
      console.error("Category index error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch categories",
        error: error.message,
      });
    }
  }

  async tree(req, res) {
    try {
      const { maxDepth = 3 } = req.query;
      const parsedMaxDepth = Number.parseInt(maxDepth, 10);

      const categories = await Category.find({ status: "active" })
        .sort("sortOrder")
        .lean();

      const fullTree = this.buildCategoryTree(categories);
      const limitDepth = (nodes, depth = 0) => {
        if (!Array.isArray(nodes) || depth >= parsedMaxDepth) {
          return [];
        }

        return nodes.map((node) => ({
          ...node,
          children: limitDepth(node.children || [], depth + 1),
        }));
      };

      const tree = Number.isFinite(parsedMaxDepth)
        ? limitDepth(fullTree)
        : fullTree;

      res.json({
        success: true,
        data: tree,
      });
    } catch (error) {
      console.error("Category tree error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch category tree",
      });
    }
  }

  async flat(req, res) {
    try {
      const categories = await Category.find({ status: "active" })
        .select("title slug parentId path level")
        .sort("path")
        .lean();

      res.json({
        success: true,
        data: categories,
      });
    } catch (error) {
      console.error("Flat categories error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch flat categories",
      });
    }
  }

  async filters(req, res) {
    try {
      let filters = await Filter.find({ status: "active" })
        .select("name title description status")
        .sort({ title: 1 })
        .lean();

      if (filters.length === 0) {
        const defaultFilters = [
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
          defaultFilters.map((item) =>
            Filter.updateOne(
              { name: item.name },
              { $setOnInsert: item },
              { upsert: true },
            ),
          ),
        );

        filters = await Filter.find({ status: "active" })
          .select("name title description status")
          .sort({ title: 1 })
          .lean();
      }

      res.json({
        success: true,
        data: filters,
      });
    } catch (error) {
      console.error("Category filters error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch filters",
      });
    }
  }

  async navigation(req, res) {
    try {
      const { maxLevels = 2 } = req.query;

      const categories = await Category.find({
        status: "active",
        level: { $lte: parseInt(maxLevels) },
        isNavigationVisible: true,
      })
        .sort("position")
        .lean();

      const navigation = this.buildCategoryTree(categories);

      res.json({
        success: true,
        data: navigation,
      });
    } catch (error) {
      console.error("Navigation categories error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch navigation categories",
      });
    }
  }

  async breadcrumb(req, res) {
    try {
      const { id } = req.params;

      let currentCategory = await Category.findById(id).lean();

      if (!currentCategory) {
        return res.status(404).json({
          success: false,
          message: "Category not found",
        });
      }

      const breadcrumb = [];

      while (currentCategory) {
        breadcrumb.unshift({
          id: currentCategory._id,
          title: currentCategory.title,
          slug: currentCategory.slug,
        });

        if (!currentCategory.parentId) {
          break;
        }

        currentCategory = await Category.findById(
          currentCategory.parentId,
        ).lean();
      }

      res.json({
        success: true,
        data: breadcrumb,
      });
    } catch (error) {
      console.error("Category breadcrumb error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch category breadcrumb",
      });
    }
  }

  async show(req, res) {
    try {
      const { id } = req.params;
      const { includeChildren = false } = req.query;

      const category = await Category.findById(id);

      if (!category || category.status !== "active") {
        return res.status(404).json({
          success: false,
          message: "Category not found",
        });
      }

      const result = category.toObject();

      if (includeChildren === "true") {
        const children = await Category.find({
          parentId: category._id,
          status: "active",
        })
          .sort("sortOrder")
          .lean();

        result.children = children;
      }

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error("Category show error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch category",
      });
    }
  }

  async showBySlug(req, res) {
    try {
      const { slug } = req.params;
      const { includeChildren = false } = req.query;

      const category = await Category.findOne({
        slug,
        status: "active",
      });

      if (!category) {
        return res.status(404).json({
          success: false,
          message: "Category not found",
        });
      }

      const result = category.toObject();

      if (includeChildren === "true") {
        const children = await Category.find({
          parentId: category._id,
          status: "active",
        })
          .sort("sortOrder")
          .lean();

        result.children = children;
      }

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error("Category show by slug error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch category",
      });
    }
  }

  async store(req, res) {
    try {
      const {
        title,
        summary = null,
        photo,
        parentId,
        parent_id,
        status,
        isFeatured,
        is_featured,
        isNavigationVisible,
        seoTitle,
        seo_title,
        seoDescription,
        seo_description,
        sortOrder,
        sort_order,
      } = req.body;

      if (!title || !String(title).trim()) {
        return res.status(400).json({
          success: false,
          message: "Title is required",
        });
      }

      const resolvedParentIdRaw = parentId ?? parent_id ?? null;
      const resolvedParentId =
        resolvedParentIdRaw && String(resolvedParentIdRaw).trim()
          ? String(resolvedParentIdRaw).trim()
          : null;

      if (
        resolvedParentId &&
        !mongoose.Types.ObjectId.isValid(resolvedParentId)
      ) {
        return res.status(400).json({
          success: false,
          message: "Parent category is invalid",
        });
      }

      const hierarchy = await this.computeHierarchyFields(resolvedParentId);
      if (resolvedParentId && !hierarchy) {
        return res.status(400).json({
          success: false,
          message: "Parent category not found",
        });
      }

      let nextSortOrder = Number.parseInt(sortOrder ?? sort_order, 10);
      if (Number.isNaN(nextSortOrder) || nextSortOrder < 0) {
        nextSortOrder = await Category.getNextPosition(resolvedParentId);
      }

      let photoPath = photo || null;
      if (req.file) {
        photoPath = `/uploads/categories/${req.file.filename}`;
      }

      const brandIds = this.normalizeIdArray(
        req.body.brandIds,
        req.body.brands,
        req.body["brands[]"],
      );
      const filterIds = this.normalizeIdArray(
        req.body.filterIds,
        req.body.filter_ids,
        req.body.filters,
        req.body["filter_ids[]"],
      );
      const code = await this.generateUniqueCategoryCode(title);

      const category = new Category({
        title,
        summary,
        photo: photoPath,
        parentId: resolvedParentId,
        level: hierarchy?.level ?? 0,
        path: hierarchy?.path ?? null,
        sortOrder: nextSortOrder,
        status: this.normalizeStatus(status),
        isFeatured: this.parseBoolean(isFeatured ?? is_featured, false),
        isNavigationVisible: this.parseBoolean(isNavigationVisible, true),
        seoTitle: seoTitle ?? seo_title ?? null,
        seoDescription: seoDescription ?? seo_description ?? null,
        brandIds,
        filterIds,
        code,
        codeLocked: false,
        codeGeneratedAt: new Date(),
        addedBy: req.user?._id || null,
      });

      await category.save();

      res.status(201).json({
        success: true,
        message: "Category created successfully",
        data: category,
      });
    } catch (error) {
      console.error("Category store error:", error);

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
        return res.status(409).json({
          success: false,
          message: "Category with this slug or code already exists",
        });
      }

      res.status(500).json({
        success: false,
        message: "Failed to create category",
        error: error.message,
      });
    }
  }
  async update(req, res) {
    try {
      const { id } = req.params;
      const category = await Category.findById(id);
      const previousTitle = category?.title;

      if (!category) {
        return res.status(404).json({
          success: false,
          message: "Category not found",
        });
      }

      const nextParentRaw = req.body.parentId ?? req.body.parent_id;
      const hasParentField =
        req.body.parentId !== undefined || req.body.parent_id !== undefined;
      let resolvedParentId = category.parentId
        ? String(category.parentId)
        : null;

      if (hasParentField) {
        resolvedParentId =
          nextParentRaw && String(nextParentRaw).trim()
            ? String(nextParentRaw).trim()
            : null;

        if (resolvedParentId === id) {
          return res.status(400).json({
            success: false,
            message: "Category cannot be its own parent",
          });
        }

        if (
          resolvedParentId &&
          !mongoose.Types.ObjectId.isValid(resolvedParentId)
        ) {
          return res.status(400).json({
            success: false,
            message: "Parent category is invalid",
          });
        }
      }

      let hierarchy = {
        level: category.level || 0,
        path: category.path || null,
      };
      if (hasParentField) {
        hierarchy = await this.computeHierarchyFields(resolvedParentId);
        if (resolvedParentId && !hierarchy) {
          return res.status(400).json({
            success: false,
            message: "Parent category not found",
          });
        }
      }

      if (req.file) {
        if (category.photo) {
          const oldImagePath = path.join(
            process.cwd(),
            category.photo.replace(/^\/+/, ""),
          );
          if (fs.existsSync(oldImagePath)) {
            try {
              fs.unlinkSync(oldImagePath);
            } catch (error) {
              console.error("Error deleting old image:", error);
            }
          }
        }
        category.photo = `/uploads/categories/${req.file.filename}`;
      } else if (req.body.photo !== undefined) {
        category.photo = req.body.photo || null;
      }

      if (req.body.title !== undefined) {
        category.title = req.body.title;
      }
      if (req.body.summary !== undefined) {
        category.summary = req.body.summary;
      }
      if (req.body.status !== undefined) {
        category.status = this.normalizeStatus(
          req.body.status,
          category.status,
        );
      }
      if (req.body.isNavigationVisible !== undefined) {
        category.isNavigationVisible = this.parseBoolean(
          req.body.isNavigationVisible,
          category.isNavigationVisible,
        );
      }
      if (req.body.seoTitle !== undefined || req.body.seo_title !== undefined) {
        category.seoTitle = req.body.seoTitle ?? req.body.seo_title ?? null;
      }
      if (
        req.body.seoDescription !== undefined ||
        req.body.seo_description !== undefined
      ) {
        category.seoDescription =
          req.body.seoDescription ?? req.body.seo_description ?? null;
      }
      if (
        req.body.sortOrder !== undefined ||
        req.body.sort_order !== undefined
      ) {
        const parsedSort = Number.parseInt(
          req.body.sortOrder ?? req.body.sort_order,
          10,
        );
        if (!Number.isNaN(parsedSort) && parsedSort >= 0) {
          category.sortOrder = parsedSort;
        }
      }

      if (hasParentField) {
        category.parentId = resolvedParentId;
        category.level = hierarchy?.level ?? 0;
        category.path = hierarchy?.path ?? null;
      }

      if (
        req.body.isFeatured !== undefined ||
        req.body.is_featured !== undefined
      ) {
        category.isFeatured = this.parseBoolean(
          req.body.isFeatured ?? req.body.is_featured,
          category.isFeatured,
        );
      }

      const codeLockInPayload = req.body.codeLocked ?? req.body.code_locked;
      if (codeLockInPayload !== undefined) {
        category.codeLocked = this.parseBoolean(
          codeLockInPayload,
          category.codeLocked,
        );
      }

      const nextBrandIds = this.normalizeIdArray(
        req.body.brandIds,
        req.body.brands,
        req.body["brands[]"],
      );
      if (
        nextBrandIds.length > 0 ||
        req.body.brandIds !== undefined ||
        req.body.brands !== undefined ||
        req.body["brands[]"] !== undefined
      ) {
        category.brandIds = nextBrandIds;
      }

      const nextFilterIds = this.normalizeIdArray(
        req.body.filterIds,
        req.body.filter_ids,
        req.body.filters,
        req.body["filter_ids[]"],
      );
      if (
        nextFilterIds.length > 0 ||
        req.body.filterIds !== undefined ||
        req.body.filter_ids !== undefined ||
        req.body.filters !== undefined ||
        req.body["filter_ids[]"] !== undefined
      ) {
        category.filterIds = nextFilterIds;
      }

      const titleChanged =
        req.body.title !== undefined &&
        String(req.body.title) !== String(previousTitle);
      if (titleChanged && !category.codeLocked) {
        category.code = await this.generateUniqueCategoryCode(
          req.body.title,
          category._id,
        );
        category.codeGeneratedAt = new Date();
      }

      await category.save();

      res.json({
        success: true,
        message: "Category updated successfully",
        data: category,
      });
    } catch (error) {
      console.error("Category update error:", error);

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
        message: "Failed to update category",
      });
    }
  }
  async destroy(req, res) {
    try {
      const { id } = req.params;

      const category = await Category.findById(id);

      if (!category) {
        return res.status(404).json({
          success: false,
          message: "Category not found",
        });
      }

      const hasChildren = await Category.countDocuments({ parentId: id });
      if (hasChildren > 0) {
        return res.status(400).json({
          success: false,
          message: "Cannot delete category with child categories",
        });
      }

      const hasProducts = await Product.countDocuments({ "category.id": id });
      if (hasProducts > 0) {
        return res.status(400).json({
          success: false,
          message: "Cannot delete category with products",
        });
      }

      await category.deleteOne();

      res.json({
        success: true,
        message: "Category deleted successfully",
      });
    } catch (error) {
      console.error("Category delete error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to delete category",
      });
    }
  }

  async bulkReorder(req, res) {
    try {
      const { updates } = req.body;

      if (!Array.isArray(updates) || updates.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Updates array is required",
        });
      }

      const bulkOps = updates.map((update) => ({
        updateOne: {
          filter: { _id: update.id },
          update: {
            $set: {
              sortOrder: update.sortOrder,
              parentId: update.parentId,
              level: update.level,
            },
          },
        },
      }));

      await Category.bulkWrite(bulkOps);

      res.json({
        success: true,
        message: "Categories reordered successfully",
      });
    } catch (error) {
      console.error("Bulk reorder error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to reorder categories",
      });
    }
  }

  async reorder(req, res) {
    try {
      const { id } = req.params;
      const { newPosition } = req.body;

      if (typeof newPosition !== "number" || newPosition < 0) {
        return res.status(400).json({
          success: false,
          message: "Valid new position is required",
        });
      }

      const category = await Category.findById(id);

      if (!category) {
        return res.status(404).json({
          success: false,
          message: "Category not found",
        });
      }

      category.sortOrder = newPosition;
      await category.save();

      res.json({
        success: true,
        message: "Category position updated successfully",
      });
    } catch (error) {
      console.error("Category reorder error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to reorder category",
      });
    }
  }

  async products(req, res) {
    try {
      const { id } = req.params;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const sort = req.query.sort || "-createdAt";

      const category = await Category.findById(id);

      if (!category) {
        return res.status(404).json({
          success: false,
          message: "Category not found",
        });
      }

      const skip = (page - 1) * limit;

      const [products, total] = await Promise.all([
        Product.find({
          "category.id": id,
          status: "active",
        })
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .lean(),
        Product.countDocuments({
          "category.id": id,
          status: "active",
        }),
      ]);

      res.json({
        success: true,
        data: {
          category: {
            id: category._id,
            title: category.title,
            slug: category.slug,
          },
          products,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
          },
        },
      });
    } catch (error) {
      console.error("Category products error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch category products",
      });
    }
  }

  async brands(req, res) {
    try {
      const { id } = req.params;

      const category = await Category.findById(id);

      if (!category) {
        return res.status(404).json({
          success: false,
          message: "Category not found",
        });
      }

      let brands = [];
      const configuredBrandIds = Array.isArray(category.brandIds)
        ? category.brandIds
        : Array.isArray(category.brands)
          ? category.brands.map((item) => item?.id).filter(Boolean)
          : [];

      if (configuredBrandIds.length > 0) {
        brands = await Brand.find({
          _id: { $in: configuredBrandIds },
          status: "active",
        }).lean();
      } else {
        const productBrands = await Product.aggregate([
          { $match: { "category.id": category._id, status: "active" } },
          { $group: { _id: "$brand.id", brand: { $first: "$brand" } } },
          { $match: { _id: { $ne: null } } },
          { $replaceRoot: { newRoot: "$brand" } },
        ]);

        brands = productBrands;
      }

      res.json({
        success: true,
        data: brands,
      });
    } catch (error) {
      console.error("Category brands error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch category brands",
      });
    }
  }
  buildCategoryTree(categories, parentId = null) {
    const tree = [];

    for (const category of categories) {
      const catParentId = category.parentId || null;
      const parentMatch =
        parentId === null
          ? catParentId === null
          : String(catParentId) === String(parentId);

      if (parentMatch) {
        const children = this.buildCategoryTree(categories, category._id);
        const categoryObj = { ...category };

        if (children.length > 0) {
          categoryObj.children = children;
        }

        tree.push(categoryObj);
      }
    }

    return tree;
  }
}

export const categoryController = new CategoryController();
