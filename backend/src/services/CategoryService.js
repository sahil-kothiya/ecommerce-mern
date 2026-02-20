

import { Category } from '../models/Category.js';
import { BaseService } from '../core/BaseService.js';
import { AppError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';
import slugify from 'slugify';

export class CategoryService extends BaseService {
    constructor() {
        super(Category);
    }

async getCategories(options = {}) {
        const { status = 'active', sort = 'title', page, limit } = options;

        return await this.findAll({
            filter: { status },
            sort,
            page,
            limit
        });
    }

async getCategoryTree(status = 'active') {
        try {
                        const rootCategories = await this.model
                .find({ parentId: null, status })
                .sort({ sortOrder: 1, title: 1 })
                .lean();

                        const tree = await Promise.all(
                rootCategories.map(category => this.buildCategoryTree(category))
            );

            return tree;
        } catch (error) {
            logger.error('CategoryService.getCategoryTree error:', error);
            throw error;
        }
    }

async buildCategoryTree(category) {
        const children = await this.model
            .find({ parentId: category._id, status: 'active' })
            .sort({ sortOrder: 1, title: 1 })
            .lean();

        if (children.length > 0) {
            category.children = await Promise.all(
                children.map(child => this.buildCategoryTree(child))
            );
        } else {
            category.children = [];
        }

        return category;
    }

async getFlatCategories(status = 'active') {
        return await this.model
            .find({ status })
            .sort({ title: 1 })
            .lean();
    }

async getNavigationCategories() {
        try {
                        const categories = await this.model
                .find({ parentId: null, status: 'active', isMenu: true })
                .sort({ sortOrder: 1 })
                .limit(8)
                .lean();

                        for (const category of categories) {
                category.children = await this.model
                    .find({ parentId: category._id, status: 'active' })
                    .sort({ sortOrder: 1 })
                    .limit(10)
                    .lean();
            }

            return categories;
        } catch (error) {
            logger.error('CategoryService.getNavigationCategories error:', error);
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
                throw new AppError('Category not found', 404);
            }

            return category;
        } catch (error) {
            if (error instanceof AppError) throw error;
            logger.error('CategoryService.getCategoryBySlugOrId error:', error);
            throw error;
        }
    }

async createCategory(categoryData) {
        try {
                        if (!categoryData.slug && categoryData.title) {
                categoryData.slug = slugify(categoryData.title, { lower: true, strict: true });
            }

                        if (categoryData.parentId) {
                const parentCategory = await this.findById(categoryData.parentId);
                if (!parentCategory) {
                    throw new AppError('Parent category not found', 404);
                }
            }

                        const category = await this.create(categoryData);

            logger.info('Category created:', category._id);

            return category;
        } catch (error) {
            if (error instanceof AppError) throw error;
            logger.error('CategoryService.createCategory error:', error);
            throw error;
        }
    }

async updateCategory(id, updateData) {
        try {
                        if (updateData.title && !updateData.slug) {
                updateData.slug = slugify(updateData.title, { lower: true, strict: true });
            }

                        if (updateData.parentId === id) {
                throw new AppError('Category cannot be its own parent', 400);
            }

                        if (updateData.parentId) {
                const parentCategory = await this.findById(updateData.parentId);
                if (!parentCategory) {
                    throw new AppError('Parent category not found', 404);
                }
            }

            const category = await this.updateOrFail(id, updateData);

            logger.info('Category updated:', id);

            return category;
        } catch (error) {
            if (error instanceof AppError) throw error;
            logger.error('CategoryService.updateCategory error:', error);
            throw error;
        }
    }

async deleteCategory(id) {
        try {
                        const childrenCount = await this.model.countDocuments({ parentId: id });
            
            if (childrenCount > 0) {
                throw new AppError(
                    'Cannot delete category with child categories. Delete or reassign children first.',
                    400
                );
            }

                        const category = await this.softDelete(id);

            logger.info('Category deleted:', id);

            return category;
        } catch (error) {
            if (error instanceof AppError) throw error;
            logger.error('CategoryService.deleteCategory error:', error);
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
                    slug: currentCategory.slug
                });

                if (currentCategory.parentId) {
                    currentCategory = await this.findById(currentCategory.parentId);
                } else {
                    currentCategory = null;
                }
            }

            return breadcrumb;
        } catch (error) {
            logger.error('CategoryService.getBreadcrumb error:', error);
            throw error;
        }
    }
}
