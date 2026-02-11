/**
 * @fileoverview Product Service Layer
 * @description Handles all product-related business logic including CRUD operations, filtering, and search
 * @author Enterprise E-Commerce Team
 * @version 1.0.0
 */

import { Product } from '../models/Product.js';
import { Category } from '../models/Category.js';
import { Brand } from '../models/Brand.js';
import { BaseService } from '../core/BaseService.js';
import { AppError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';
import slugify from 'slugify';
import mongoose from 'mongoose';

/**
 * Product Service Class
 * @extends BaseService
 * @description Manages product business logic and database operations
 */
export class ProductService extends BaseService {
    constructor() {
        super(Product);
    }

    /**
     * Get products with advanced filtering and pagination
     * @param {Object} options - Query options
     * @param {number} [options.page=1] - Page number
     * @param {number} [options.limit=20] - Items per page
     * @param {string} [options.search] - Search term
     * @param {string} [options.categoryId] - Filter by category
     * @param {string} [options.brandId] - Filter by brand
     * @param {number} [options.minPrice] - Minimum price filter
     * @param {number} [options.maxPrice] - Maximum price filter
     * @param {string} [options.condition] - Product condition filter
     * @param {boolean} [options.isFeatured] - Filter featured products
     * @param {string} [options.status='active'] - Product status filter
     * @param {string} [options.sort='-createdAt'] - Sort order
     * @returns {Promise<Object>} Paginated products with metadata
     */
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
            status = 'active',
            sort = '-createdAt'
        } = options;

        // Build filter query
        const filter = { status };

        // Full-text search
        if (search) {
            filter.$text = { $search: search };
        }

        // Category filter
        if (categoryId && mongoose.Types.ObjectId.isValid(categoryId)) {
            filter['category.id'] = new mongoose.Types.ObjectId(categoryId);
        }

        // Brand filter
        if (brandId && mongoose.Types.ObjectId.isValid(brandId)) {
            filter['brand.id'] = new mongoose.Types.ObjectId(brandId);
        }

        // Price range filter
        if (minPrice || maxPrice) {
            filter.basePrice = {};
            if (minPrice) filter.basePrice.$gte = parseFloat(minPrice);
            if (maxPrice) filter.basePrice.$lte = parseFloat(maxPrice);
        }

        // Condition filter
        if (condition) {
            filter.condition = condition;
        }

        // Featured filter
        if (isFeatured !== undefined) {
            filter.isFeatured = isFeatured === 'true' || isFeatured === true;
        }

        // Calculate pagination
        const skip = (page - 1) * limit;

        try {
            // Execute query
            const [products, total] = await Promise.all([
                this.model
                    .find(filter)
                    .sort(sort)
                    .skip(skip)
                    .limit(limit)
                    .lean(),
                this.model.countDocuments(filter)
            ]);

            return {
                items: products,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                }
            };
        } catch (error) {
            logger.error('ProductService.getProducts error:', error);
            throw error;
        }
    }

    /**
     * Get featured products
     * @param {number} [limit=10] - Number of products to return
     * @returns {Promise<Array>} Array of featured products
     */
    async getFeaturedProducts(limit = 10) {
        try {
            return await this.model
                .find({
                    status: 'active',
                    isFeatured: true
                })
                .sort({ createdAt: -1 })
                .limit(limit)
                .lean();
        } catch (error) {
            logger.error('ProductService.getFeaturedProducts error:', error);
            throw error;
        }
    }

    /**
     * Search products with advanced text search
     * @param {string} query - Search query
     * @param {Object} filters - Additional filters
     * @returns {Promise<Array>} Search results
     */
    async searchProducts(query, filters = {}) {
        if (!query) {
            throw new AppError('Search query is required', 400);
        }

        try {
            const searchFilter = {
                $text: { $search: query },
                status: 'active',
                ...filters
            };

            const products = await this.model
                .find(searchFilter, { score: { $meta: 'textScore' } })
                .sort({ score: { $meta: 'textScore' } })
                .limit(50)
                .lean();

            return products;
        } catch (error) {
            logger.error('ProductService.searchProducts error:', error);
            throw error;
        }
    }

    /**
     * Get product by slug or ID
     * @param {string} identifier - Product slug or ID
     * @returns {Promise<Object>} Product data
     * @throws {AppError} If product not found
     */
    async getProductBySlugOrId(identifier) {
        try {
            let product;

            // Try finding by ID first
            if (mongoose.Types.ObjectId.isValid(identifier)) {
                product = await this.model.findById(identifier).lean();
            }

            // If not found by ID, try slug
            if (!product) {
                product = await this.model.findOne({ slug: identifier }).lean();
            }

            if (!product) {
                throw new AppError('Product not found', 404);
            }

            // Increment view count asynchronously (don't wait)
            this.model.findByIdAndUpdate(product._id, {
                $inc: { viewCount: 1 }
            }).exec();

            return product;
        } catch (error) {
            if (error instanceof AppError) throw error;
            logger.error('ProductService.getProductBySlugOrId error:', error);
            throw error;
        }
    }

    /**
     * Create new product with validation
     * @param {Object} productData - Product data
     * @returns {Promise<Object>} Created product
     * @throws {AppError} If validation fails
     */
    async createProduct(productData) {
        try {
            // Generate slug if not provided
            if (!productData.slug && productData.title) {
                productData.slug = slugify(productData.title, { lower: true, strict: true });
            }

            // Validate and populate category reference
            if (productData.categoryId) {
                const category = await Category.findById(productData.categoryId);
                if (!category) {
                    throw new AppError('Category not found', 404);
                }
                productData.category = {
                    id: category._id,
                    title: category.title,
                    slug: category.slug
                };
            }

            // Validate and populate brand reference
            if (productData.brandId) {
                const brand = await Brand.findById(productData.brandId);
                if (!brand) {
                    throw new AppError('Brand not found', 404);
                }
                productData.brand = {
                    id: brand._id,
                    title: brand.title,
                    slug: brand.slug
                };
            }

            // Create product
            const product = await this.create(productData);

            logger.info('Product created successfully:', product._id);

            return product;
        } catch (error) {
            if (error instanceof AppError) throw error;
            logger.error('ProductService.createProduct error:', error);
            throw error;
        }
    }

    /**
     * Update product with validation
     * @param {string} id - Product ID
     * @param {Object} updateData - Update data
     * @returns {Promise<Object>} Updated product
     * @throws {AppError} If product not found or validation fails
     */
    async updateProduct(id, updateData) {
        try {
            // Regenerate slug if title changed
            if (updateData.title && !updateData.slug) {
                updateData.slug = slugify(updateData.title, { lower: true, strict: true });
            }

            // Update category reference if categoryId provided
            if (updateData.categoryId) {
                const category = await Category.findById(updateData.categoryId);
                if (!category) {
                    throw new AppError('Category not found', 404);
                }
                updateData.category = {
                    id: category._id,
                    title: category.title,
                    slug: category.slug
                };
                delete updateData.categoryId;
            }

            // Update brand reference if brandId provided
            if (updateData.brandId) {
                const brand = await Brand.findById(updateData.brandId);
                if (!brand) {
                    throw new AppError('Brand not found', 404);
                }
                updateData.brand = {
                    id: brand._id,
                    title: brand.title,
                    slug: brand.slug
                };
                delete updateData.brandId;
            }

            // Update product
            const product = await this.updateOrFail(id, updateData);

            logger.info('Product updated successfully:', id);

            return product;
        } catch (error) {
            if (error instanceof AppError) throw error;
            logger.error('ProductService.updateProduct error:', error);
            throw error;
        }
    }

    /**
     * Get products by category
     * @param {string} categoryId - Category ID
     * @param {Object} options - Query options
     * @returns {Promise<Object>} Paginated products
     */
    async getProductsByCategory(categoryId, options = {}) {
        if (!mongoose.Types.ObjectId.isValid(categoryId)) {
            throw new AppError('Invalid category ID', 400);
        }

        return await this.getProducts({
            ...options,
            categoryId
        });
    }

    /**
     * Get products by brand
     * @param {string} brandId - Brand ID
     * @param {Object} options - Query options
     * @returns {Promise<Object>} Paginated products
     */
    async getProductsByBrand(brandId, options = {}) {
        if (!mongoose.Types.ObjectId.isValid(brandId)) {
            throw new AppError('Invalid brand ID', 400);
        }

        return await this.getProducts({
            ...options,
            brandId
        });
    }

    /**
     * Get related products based on category and tags
     * @param {string} productId - Product ID
     * @param {number} [limit=6] - Number of related products
     * @returns {Promise<Array>} Related products
     */
    async getRelatedProducts(productId, limit = 6) {
        try {
            const product = await this.findByIdOrFail(productId);

            const relatedProducts = await this.model
                .find({
                    _id: { $ne: productId },
                    status: 'active',
                    $or: [
                        { 'category.id': product.category?.id },
                        { tags: { $in: product.tags || [] } }
                    ]
                })
                .sort({ viewCount: -1, createdAt: -1 })
                .limit(limit)
                .lean();

            return relatedProducts;
        } catch (error) {
            logger.error('ProductService.getRelatedProducts error:', error);
            throw error;
        }
    }

    /**
     * Get low stock products (admin)
     * @param {number} [threshold=10] - Stock threshold
     * @param {number} [limit=50] - Result limit
     * @returns {Promise<Array>} Low stock products
     */
    async getLowStockProducts(threshold = 10, limit = 50) {
        try {
            return await this.model
                .find({
                    status: 'active',
                    baseStock: { $lte: threshold, $gt: 0 }
                })
                .sort({ baseStock: 1 })
                .limit(limit)
                .select('title baseStock baseSku basePrice')
                .lean();
        } catch (error) {
            logger.error('ProductService.getLowStockProducts error:', error);
            throw error;
        }
    }

    /**
     * Update product stock
     * @param {string} id - Product ID
     * @param {number} quantity - Quantity to add (positive) or remove (negative)
     * @returns {Promise<Object>} Updated product
     */
    async updateStock(id, quantity) {
        try {
            const product = await this.model.findByIdAndUpdate(
                id,
                { $inc: { baseStock: quantity } },
                { new: true, runValidators: true }
            );

            if (!product) {
                throw new AppError('Product not found', 404);
            }

            logger.info(`Product stock updated: ${id}, quantity: ${quantity}`);

            return product;
        } catch (error) {
            if (error instanceof AppError) throw error;
            logger.error('ProductService.updateStock error:', error);
            throw error;
        }
    }
}
