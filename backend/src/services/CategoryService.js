/**
 * @fileoverview Category Service Layer
 * @description Handles category-related business logic including CRUD, hierarchy, and navigation
 * @author Enterprise E-Commerce Team
 * @version 1.0.0
 */

import { Category } from '../models/Category.js';
import { BaseService } from '../core/BaseService.js';
import { AppError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';
import slugify from 'slugify';

/**
 * Category Service Class
 * @extends BaseService
 * @description Manages category business logic and tree structures
 */
export class CategoryService extends BaseService {
    constructor() {
        super(Category);
    }

    /**
     * Get all categories with optional filtering
     * @param {Object} options - Query options
     * @returns {Promise<Object>} Categories with pagination
     */
    async getCategories(options = {}) {
        const { status = 'active', sort = 'title', page, limit } = options;

        return await this.findAll({
            filter: { status },
            sort,
            page,
            limit
        });
    }

    /**
     * Get category tree structure
     * @param {string} [status='active'] - Filter by status
     * @returns {Promise<Array>} Hierarchical category tree
     */
    async getCategoryTree(status = 'active') {
        try {
            // Get all root categories (no parent)
            const rootCategories = await this.model
                .find({ parentId: null, status })
                .sort({ sortOrder: 1, title: 1 })
                .lean();

            // Build tree recursively
            const tree = await Promise.all(
                rootCategories.map(category => this.buildCategoryTree(category))
            );

            return tree;
        } catch (error) {
            logger.error('CategoryService.getCategoryTree error:', error);
            throw error;
        }
    }

    /**
     * Build category tree recursively
     * @private
     * @param {Object} category - Parent category
     * @returns {Promise<Object>} Category with children
     */
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

    /**
     * Get flat list of all categories
     * @param {string} [status='active'] - Filter by status
     * @returns {Promise<Array>} Flat category list
     */
    async getFlatCategories(status = 'active') {
        return await this.model
            .find({ status })
            .sort({ title: 1 })
            .lean();
    }

    /**
     * Get category navigation structure (for menus)
     * @returns {Promise<Array>} Navigation-ready categories
     */
    async getNavigationCategories() {
        try {
            // Get top-level categories with limited children
            const categories = await this.model
                .find({ parentId: null, status: 'active', isMenu: true })
                .sort({ sortOrder: 1 })
                .limit(8)
                .lean();

            // Add first level children only
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

    /**
     * Get category by slug or ID
     * @param {string} identifier - Category slug or ID
     * @returns {Promise<Object>} Category data
     */
    async getCategoryBySlugOrId(identifier) {
        try {
            let category;

            // Try by ID first
            if (identifier.match(/^[0-9a-fA-F]{24}$/)) {
                category = await this.findById(identifier);
            }

            // Try by slug
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

    /**
     * Create category with validation
     * @param {Object} categoryData - Category data
     * @returns {Promise<Object>} Created category
     */
    async createCategory(categoryData) {
        try {
            // Generate slug if not provided
            if (!categoryData.slug && categoryData.title) {
                categoryData.slug = slugify(categoryData.title, { lower: true, strict: true });
            }

            // Validate parent category if provided
            if (categoryData.parentId) {
                const parentCategory = await this.findById(categoryData.parentId);
                if (!parentCategory) {
                    throw new AppError('Parent category not found', 404);
                }
            }

            // Create category
            const category = await this.create(categoryData);

            logger.info('Category created:', category._id);

            return category;
        } catch (error) {
            if (error instanceof AppError) throw error;
            logger.error('CategoryService.createCategory error:', error);
            throw error;
        }
    }

    /**
     * Update category
     * @param {string} id - Category ID
     * @param {Object} updateData - Update data
     * @returns {Promise<Object>} Updated category
     */
    async updateCategory(id, updateData) {
        try {
            // Regenerate slug if title changed
            if (updateData.title && !updateData.slug) {
                updateData.slug = slugify(updateData.title, { lower: true, strict: true });
            }

            // Prevent self-parenting
            if (updateData.parentId === id) {
                throw new AppError('Category cannot be its own parent', 400);
            }

            // Validate parent if provided
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

    /**
     * Delete category (with children check)
     * @param {string} id - Category ID
     * @returns {Promise<Object>} Deleted category
     */
    async deleteCategory(id) {
        try {
            // Check for children
            const childrenCount = await this.model.countDocuments({ parentId: id });
            
            if (childrenCount > 0) {
                throw new AppError(
                    'Cannot delete category with child categories. Delete or reassign children first.',
                    400
                );
            }

            // Soft delete (set status to inactive) or hard delete
            const category = await this.softDelete(id);

            logger.info('Category deleted:', id);

            return category;
        } catch (error) {
            if (error instanceof AppError) throw error;
            logger.error('CategoryService.deleteCategory error:', error);
            throw error;
        }
    }

    /**
     * Get breadcrumb trail for a category
     * @param {string} categoryId - Category ID
     * @returns {Promise<Array>} Breadcrumb array from root to current
     */
    async getBreadcrumb(categoryId) {
        try {
            const breadcrumb = [];
            let currentCategory = await this.findByIdOrFail(categoryId);

            // Build breadcrumb from bottom to top
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
