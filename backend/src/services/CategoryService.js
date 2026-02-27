import { Category } from "../models/Category.js";
import { BaseService } from "../core/BaseService.js";
import { AppError } from "../middleware/errorHandler.js";
import { logger } from "../utils/logger.js";
import slugify from "slugify";

export class CategoryService extends BaseService {
  constructor() {
    super(Category);
  }

  async getCategories(options = {}) {
    const { status = "active", sort = "title", page, limit } = options;

    return await this.findAll({
      filter: { status },
      sort,
      page,
      limit,
    });
  }

  async getCategoryTree(status = "active") {
    try {
      const allCategories = await this.model
        .find({ status })
        .sort({ sortOrder: 1, title: 1 })
        .lean();

      const childrenMap = new Map();
      const roots = [];

      for (const cat of allCategories) {
        cat.children = [];
        const parentKey = cat.parentId?.toString() || null;
        if (!parentKey) {
          roots.push(cat);
        } else {
          if (!childrenMap.has(parentKey)) childrenMap.set(parentKey, []);
          childrenMap.get(parentKey).push(cat);
        }
      }

      const attachChildren = (node) => {
        const kids = childrenMap.get(node._id.toString()) || [];
        node.children = kids;
        for (const kid of kids) attachChildren(kid);
      };

      for (const root of roots) attachChildren(root);

      return roots;
    } catch (error) {
      logger.error("CategoryService.getCategoryTree error:", error);
      throw error;
    }
  }

  async buildCategoryTree(category) {
    const children = await this.model
      .find({ parentId: category._id, status: "active" })
      .sort({ sortOrder: 1, title: 1 })
      .lean();

    if (children.length > 0) {
      category.children = await Promise.all(
        children.map((child) => this.buildCategoryTree(child)),
      );
    } else {
      category.children = [];
    }

    return category;
  }

  async getFlatCategories(status = "active") {
    return await this.model.find({ status }).sort({ title: 1 }).lean();
  }

  async getNavigationCategories() {
    try {
      const categories = await this.model
        .find({ parentId: null, status: "active", isMenu: true })
        .sort({ sortOrder: 1 })
        .limit(8)
        .lean();

      const parentIds = categories.map((c) => c._id);
      const allChildren = await this.model
        .find({ parentId: { $in: parentIds }, status: "active" })
        .sort({ sortOrder: 1 })
        .lean();

      const childMap = new Map();
      for (const child of allChildren) {
        const key = child.parentId.toString();
        if (!childMap.has(key)) childMap.set(key, []);
        childMap.get(key).push(child);
      }

      for (const category of categories) {
        const kids = childMap.get(category._id.toString()) || [];
        category.children = kids.slice(0, 10);
      }

      return categories;
    } catch (error) {
      logger.error("CategoryService.getNavigationCategories error:", error);
      throw error;
    }
  }

  async getCategoryBySlugOrId(identifier) {
    try {
      let category;

      if (identifier.match(/^[0-9a-fA-F]{24}$/)) {
        category = await this.findById(identifier);
      }

      if (!category) {
        category = await this.findOne({ slug: identifier });
      }

      if (!category) {
        throw new AppError("Category not found", 404);
      }

      return category;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error("CategoryService.getCategoryBySlugOrId error:", error);
      throw error;
    }
  }

  async createCategory(categoryData) {
    try {
      if (!categoryData.slug && categoryData.title) {
        categoryData.slug = slugify(categoryData.title, {
          lower: true,
          strict: true,
        });
      }

      if (categoryData.parentId) {
        const parentCategory = await this.findById(categoryData.parentId);
        if (!parentCategory) {
          throw new AppError("Parent category not found", 404);
        }
      }

      const category = await this.create(categoryData);

      logger.info("Category created:", category._id);

      return category;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error("CategoryService.createCategory error:", error);
      throw error;
    }
  }

  async updateCategory(id, updateData) {
    try {
      if (updateData.title && !updateData.slug) {
        updateData.slug = slugify(updateData.title, {
          lower: true,
          strict: true,
        });
      }

      if (updateData.parentId === id) {
        throw new AppError("Category cannot be its own parent", 400);
      }

      if (updateData.parentId) {
        const parentCategory = await this.findById(updateData.parentId);
        if (!parentCategory) {
          throw new AppError("Parent category not found", 404);
        }
      }

      const category = await this.updateOrFail(id, updateData);

      logger.info("Category updated:", id);

      return category;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error("CategoryService.updateCategory error:", error);
      throw error;
    }
  }

  async deleteCategory(id) {
    try {
      const childrenCount = await this.model.countDocuments({ parentId: id });

      if (childrenCount > 0) {
        throw new AppError(
          "Cannot delete category with child categories. Delete or reassign children first.",
          400,
        );
      }

      const category = await this.softDelete(id);

      logger.info("Category deleted:", id);

      return category;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error("CategoryService.deleteCategory error:", error);
      throw error;
    }
  }

  async getBreadcrumb(categoryId) {
    try {
      const breadcrumb = [];
      let currentCategory = await this.findByIdOrFail(categoryId);

      while (currentCategory) {
        breadcrumb.unshift({
          id: currentCategory._id,
          title: currentCategory.title,
          slug: currentCategory.slug,
        });

        if (currentCategory.parentId) {
          currentCategory = await this.findById(currentCategory.parentId);
        } else {
          currentCategory = null;
        }
      }

      return breadcrumb;
    } catch (error) {
      logger.error("CategoryService.getBreadcrumb error:", error);
      throw error;
    }
  }
}
