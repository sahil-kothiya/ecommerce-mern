import { logger } from '../utils/logger.js';

import { Category } from '../models/Category.js';
import { Product } from '../models/Product.js';
import { Brand } from '../models/Brand.js';
import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs';
import { config } from '../config/index.js';

export class CategoryController {
    // GET /api/categories - List all categories
    async index(req, res) {
        try {
            const {
                parent,
                includeChildren = 'false',
                status,
                sort = 'sortOrder'
            } = req.query;

            let query = {};
            
            // Only filter by status if provided
            if (status) {
                query.status = status;
            }

            if (parent === 'null') {
                query.parentId = null;
            } else if (parent) {
                query.parentId = new mongoose.Types.ObjectId(parent);
            }

            // Build full tree from all matching categories when requested
            if (includeChildren === 'true' && !parent) {
                const categories = await Category.find(status ? { status } : {})
                    .sort(sort)
                    .lean();

                const categoryTree = this.buildCategoryTree(categories);
                return res.json({
                    success: true,
                    data: categoryTree
                });
            }

            const categories = await Category.find(query)
                .sort(sort)
                .lean();

            res.json({
                success: true,
                data: categories
            });
        } catch (error) {
            console.error('Category index error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch categories',
                error: error.message
            });
        }
    }

    // GET /api/categories/tree - Get category tree
    async tree(req, res) {
        try {
            const { maxDepth = 3 } = req.query;
            const parsedMaxDepth = Number.parseInt(maxDepth, 10);

            const categories = await Category.find({ status: 'active' })
                .sort('sortOrder')
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

            const tree = Number.isFinite(parsedMaxDepth) ? limitDepth(fullTree) : fullTree;

            res.json({
                success: true,
                data: tree
            });
        } catch (error) {
            console.error('Category tree error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch category tree'
            });
        }
    }

    // GET /api/categories/flat - Get flat category list
    async flat(req, res) {
        try {
            const categories = await Category.find({ status: 'active' })
                .select('title slug parent pathNames level')
                .sort('pathNames')
                .lean();

            res.json({
                success: true,
                data: categories
            });
        } catch (error) {
            console.error('Flat categories error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch flat categories'
            });
        }
    }

    // GET /api/categories/navigation - Get navigation categories
    async navigation(req, res) {
        try {
            const { maxLevels = 2 } = req.query;

            const categories = await Category.find({
                status: 'active',
                level: { $lte: parseInt(maxLevels) },
                isNavigationVisible: true
            })
                .sort('position')
                .lean();

            const navigation = this.buildCategoryTree(categories);

            res.json({
                success: true,
                data: navigation
            });
        } catch (error) {
            console.error('Navigation categories error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch navigation categories'
            });
        }
    }

    // GET /api/categories/breadcrumb/:id - Get category breadcrumb
    async breadcrumb(req, res) {
        try {
            const { id } = req.params;

            let currentCategory = await Category.findById(id).lean();

            if (!currentCategory) {
                return res.status(404).json({
                    success: false,
                    message: 'Category not found'
                });
            }

            const breadcrumb = [];

            while (currentCategory) {
                breadcrumb.unshift({
                    id: currentCategory._id,
                    title: currentCategory.title,
                    slug: currentCategory.slug
                });

                if (!currentCategory.parentId) {
                    break;
                }

                currentCategory = await Category.findById(currentCategory.parentId).lean();
            }

            res.json({
                success: true,
                data: breadcrumb
            });
        } catch (error) {
            console.error('Category breadcrumb error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch category breadcrumb'
            });
        }
    }

    // GET /api/categories/:id - Get single category
    async show(req, res) {
        try {
            const { id } = req.params;
            const { includeChildren = false } = req.query;

            const category = await Category.findById(id);

            if (!category || category.status !== 'active') {
                return res.status(404).json({
                    success: false,
                    message: 'Category not found'
                });
            }

            let result = category.toObject();

            // Include children if requested
            if (includeChildren === 'true') {
                const children = await Category.find({
                    parentId: category._id,
                    status: 'active'
                })
                    .sort('sortOrder')
                    .lean();

                result.children = children;
            }

            res.json({
                success: true,
                data: result
            });
        } catch (error) {
            console.error('Category show error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch category'
            });
        }
    }

    // GET /api/categories/slug/:slug - Get category by slug
    async showBySlug(req, res) {
        try {
            const { slug } = req.params;
            const { includeChildren = false } = req.query;

            const category = await Category.findOne({
                slug,
                status: 'active'
            });

            if (!category) {
                return res.status(404).json({
                    success: false,
                    message: 'Category not found'
                });
            }

            let result = category.toObject();

            // Include children if requested
            if (includeChildren === 'true') {
                const children = await Category.find({
                    parentId: category._id,
                    status: 'active'
                })
                    .sort('sortOrder')
                    .lean();

                result.children = children;
            }

            res.json({
                success: true,
                data: result
            });
        } catch (error) {
            console.error('Category show by slug error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch category'
            });
        }
    }

    // POST /api/categories - Create new category
    async store(req, res) {
        try {
            logger.info('ðŸ“¥ Category store request received');
            logger.info('ðŸ“ Body:', req.body);
            logger.info('ðŸ“Ž File:', req.file ? req.file.filename : 'No file');
            logger.info('ðŸ‘¤ User:', req.user ? req.user.email : 'No user');

            const {
                title,
                summary,
                photo,
                parentId = null,
                status = 'active',
                isNavigationVisible = true,
                seoTitle,
                seoDescription,
                brands = [],
                filters = []
            } = req.body;

            if (!title) {
                logger.info('âŒ Title is missing');
                return res.status(400).json({
                    success: false,
                    message: 'Title is required'
                });
            }

            // Get parent category if specified
            let parent = null;
            if (parentId) {
                parent = await Category.findById(parentId);
                if (!parent) {
                    return res.status(400).json({
                        success: false,
                        message: 'Parent category not found'
                    });
                }
            }

            // Get next position in parent
            const position = await Category.getNextPosition(parentId);

            // Handle uploaded image
            let photoPath = photo || null;
            if (req.file) {
                // Save relative path for database
                photoPath = `/uploads/categories/${req.file.filename}`;
                logger.info('âœ… Image uploaded:', photoPath);
            }

            const category = new Category({
                title,
                summary,
                photo: photoPath,
                parentId: parentId || null,
                status,
                isNavigationVisible,
                seoTitle: seoTitle || title,
                seoDescription,
                sortOrder: position,
                brands,
                filters
            });

            await category.save();
            logger.info('âœ… Category created successfully:', category._id);

            res.status(201).json({
                success: true,
                message: 'Category created successfully',
                data: category
            });
        } catch (error) {
            console.error('âŒ Category store error:', error);

            if (error.name === 'ValidationError') {
                const errors = Object.keys(error.errors).reduce((acc, key) => {
                    acc[key] = error.errors[key].message;
                    return acc;
                }, {});

                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors
                });
            }

            if (error.code === 11000) {
                return res.status(409).json({
                    success: false,
                    message: 'Category with this slug already exists'
                });
            }

            res.status(500).json({
                success: false,
                message: 'Failed to create category',
                error: error.message
            });
        }
    }

    // PUT /api/categories/:id - Update category
    async update(req, res) {
        try {
            const { id } = req.params;
            const updateData = req.body;

            const category = await Category.findById(id);

            if (!category) {
                return res.status(404).json({
                    success: false,
                    message: 'Category not found'
                });
            }

            // Check if parent is being changed
            if (updateData.parentId !== undefined) {
                if (updateData.parentId === id) {
                    return res.status(400).json({
                        success: false,
                        message: 'Category cannot be its own parent'
                    });
                }

                // Check if new parent exists
                if (updateData.parentId && updateData.parentId !== '') {
                    const newParent = await Category.findById(updateData.parentId);
                    if (!newParent) {
                        return res.status(400).json({
                            success: false,
                            message: 'Parent category not found'
                        });
                    }
                } else {
                    // Set to null if empty string or null
                    updateData.parentId = null;
                }
            }

            // Handle uploaded image
            if (req.file) {
                // Delete old image if exists
                if (category.photo) {
                    const oldImagePath = path.join(process.cwd(), category.photo.replace(/^\//, ''));
                    if (fs.existsSync(oldImagePath)) {
                        try {
                            fs.unlinkSync(oldImagePath);
                        } catch (error) {
                            console.error('Error deleting old image:', error);
                        }
                    }
                }
                // Save new image path
                updateData.photo = `/uploads/categories/${req.file.filename}`;
            }

            // Update category
            Object.assign(category, updateData);
            await category.save();

            res.json({
                success: true,
                message: 'Category updated successfully',
                data: category
            });
        } catch (error) {
            console.error('Category update error:', error);

            if (error.name === 'ValidationError') {
                const errors = Object.keys(error.errors).reduce((acc, key) => {
                    acc[key] = error.errors[key].message;
                    return acc;
                }, {});

                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors
                });
            }

            res.status(500).json({
                success: false,
                message: 'Failed to update category'
            });
        }
    }

    // DELETE /api/categories/:id - Delete category
    async destroy(req, res) {
        try {
            const { id } = req.params;

            const category = await Category.findById(id);

            if (!category) {
                return res.status(404).json({
                    success: false,
                    message: 'Category not found'
                });
            }

            // Check if category has children
            const hasChildren = await Category.countDocuments({ parentId: id });
            if (hasChildren > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Cannot delete category with child categories'
                });
            }

            // Check if category has products
            const hasProducts = await Product.countDocuments({ 'category.id': id });
            if (hasProducts > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Cannot delete category with products'
                });
            }

            await category.deleteOne();

            res.json({
                success: true,
                message: 'Category deleted successfully'
            });
        } catch (error) {
            console.error('Category delete error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to delete category'
            });
        }
    }

    // POST /api/categories/reorder - Bulk reorder categories
    async bulkReorder(req, res) {
        try {
            const { updates } = req.body;

            if (!Array.isArray(updates) || updates.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Updates array is required'
                });
            }

            // Use bulk operations for better performance
            const bulkOps = updates.map(update => ({
                updateOne: {
                    filter: { _id: update.id },
                    update: {
                        $set: {
                            sortOrder: update.sortOrder,
                            parentId: update.parentId,
                            level: update.level
                        }
                    }
                }
            }));

            await Category.bulkWrite(bulkOps);

            res.json({
                success: true,
                message: 'Categories reordered successfully'
            });
        } catch (error) {
            console.error('Bulk reorder error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to reorder categories'
            });
        }
    }

    // POST /api/categories/:id/reorder - Reorder categories
    async reorder(req, res) {
        try {
            const { id } = req.params;
            const { newPosition } = req.body;

            if (typeof newPosition !== 'number' || newPosition < 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Valid new position is required'
                });
            }

            const category = await Category.findById(id);

            if (!category) {
                return res.status(404).json({
                    success: false,
                    message: 'Category not found'
                });
            }

            category.sortOrder = newPosition;
            await category.save();

            res.json({
                success: true,
                message: 'Category position updated successfully'
            });
        } catch (error) {
            console.error('Category reorder error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to reorder category'
            });
        }
    }

    // GET /api/categories/:id/products - Get products in category
    async products(req, res) {
        try {
            const { id } = req.params;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;
            const sort = req.query.sort || '-createdAt';

            const category = await Category.findById(id);

            if (!category) {
                return res.status(404).json({
                    success: false,
                    message: 'Category not found'
                });
            }

            const skip = (page - 1) * limit;

            const [products, total] = await Promise.all([
                Product.find({
                    'category.id': id,
                    status: 'active'
                })
                    .sort(sort)
                    .skip(skip)
                    .limit(limit)
                    .lean(),
                Product.countDocuments({
                    'category.id': id,
                    status: 'active'
                })
            ]);

            res.json({
                success: true,
                data: {
                    category: {
                        id: category._id,
                        title: category.title,
                        slug: category.slug
                    },
                    products,
                    pagination: {
                        page,
                        limit,
                        total,
                        pages: Math.ceil(total / limit)
                    }
                }
            });
        } catch (error) {
            console.error('Category products error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch category products'
            });
        }
    }

    // GET /api/categories/:id/brands - Get brands in category
    async brands(req, res) {
        try {
            const { id } = req.params;

            const category = await Category.findById(id);

            if (!category) {
                return res.status(404).json({
                    success: false,
                    message: 'Category not found'
                });
            }

            // Get brands from category configuration
            let brands = [];

            if (category.brands && category.brands.length > 0) {
                brands = await Brand.find({
                    _id: { $in: category.brands.map(b => b.id) },
                    status: 'active'
                }).lean();
            } else {
                // Get brands from products in this category
                const productBrands = await Product.aggregate([
                    { $match: { 'category.id': category._id, status: 'active' } },
                    { $group: { _id: '$brand.id', brand: { $first: '$brand' } } },
                    { $match: { _id: { $ne: null } } },
                    { $replaceRoot: { newRoot: '$brand' } }
                ]);

                brands = productBrands;
            }

            res.json({
                success: true,
                data: brands
            });
        } catch (error) {
            console.error('Category brands error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch category brands'
            });
        }
    }

    // Helper method to build category tree
    buildCategoryTree(categories, parentId = null) {
        const tree = [];

        for (const category of categories) {
            const catParentId = category.parentId || null;
            const parentMatch = parentId === null
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
