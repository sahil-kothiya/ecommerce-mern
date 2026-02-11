/**
 * @fileoverview Optimized Product Service for 10M+ Products
 * @description High-performance product operations with Redis caching and cursor pagination
 * @author Enterprise E-Commerce Team
 * @version 2.0.0
 */

import { Product } from '../models/Product.js';
import { Category } from '../models/Category.js';
import { Brand } from '../models/Brand.js';
import { BaseService } from '../core/BaseService.js';
import { AppError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';
import slugify from 'slugify';

// In-memory cache (suitable for single-server deployments)
// For multi-server deployments, consider Redis or Memcached
const CACHE_TTL = 300; // 5 minutes
const memCache = new Map();

/**
 * Optimized Product Service for 10M+ products
 * @extends BaseService
 * @description Uses in-memory caching. For distributed systems, implement Redis separately.
 */
export class ProductService extends BaseService {
    constructor() {
        super(Product);
        this.cachePrefix = 'product:';
    }

    /**
     * Get with cache support
     * @private
     */
    async _cached(key, fetchFn, ttl = CACHE_TTL) {
        const cacheKey = this.cachePrefix + key;
        
        if (memCache.has(cacheKey)) {
            const cached = memCache.get(cacheKey);
            if (cached.exp > Date.now()) return cached.data;
            memCache.delete(cacheKey);
        }

        const data = await fetchFn();
        memCache.set(cacheKey, { data, exp: Date.now() + ttl * 1000 });
        return data;
    }

    /**
     * Clear cache by pattern
     * @private
     */
    _clearCache(pattern = '*') {
        Array.from(memCache.keys())
            .filter(k => k.startsWith(this.cachePrefix) && (pattern === '*' || k.includes(pattern)))
            .forEach(k => memCache.delete(k));
    }

    /**
     * Get products with cursor-based pagination (recommended for 10M+ records)
     * @param {Object} options - Query options
     * @returns {Promise<Object>} Products with cursor pagination
     */
    async getProducts(options = {}) {
        const {
            cursor,
            limit = 20,
            status = 'active',
            categoryId,
            brandId,
            minPrice,
            maxPrice,
            condition,
            isFeatured,
            search
        } = options;

        try {
            const query = { status };

            if (categoryId) query['category.id'] = categoryId;
            if (brandId) query['brand.id'] = brandId;
            if (condition) query.condition = condition;
            if (isFeatured !== undefined) query.isFeatured = isFeatured;

            if (minPrice || maxPrice) {
                query.basePrice = {};
                if (minPrice) query.basePrice.$gte = Number(minPrice);
                if (maxPrice) query.basePrice.$lte = Number(maxPrice);
            }

            if (search) {
                query.$text = { $search: search };
            }

            // Cursor pagination
            if (cursor) {
                query._id = { $gt: cursor };
            }

            // Lean query for 10x performance boost
            const products = await this.model
                .find(query, {
                    title: 1,
                    slug: 1,
                    basePrice: 1,
                    baseDiscount: 1,
                    images: { $slice: 1 },
                    'ratings.average': 1,
                    'ratings.count': 1,
                    'category.title': 1,
                    'brand.title': 1,
                    condition: 1,
                    isFeatured: 1,
                    salesCount: 1
                })
                .sort({ _id: 1 })
                .limit(limit + 1)
                .lean();

            const hasMore = products.length > limit;
            const results = hasMore ? products.slice(0, limit) : products;
            const nextCursor = hasMore ? results[results.length - 1]._id : null;

            return {
                products: results,
                hasMore,
                nextCursor,
                limit
            };
        } catch (error) {
            logger.error('ProductService.getProducts error:', error);
            throw error;
        }
    }

    /**
     * Get featured products (cached)
     * @param {number} limit - Number of products
     * @returns {Promise<Array>} Featured products
     */
    async getFeaturedProducts(limit = 10) {
        return this._cached(`featured:${limit}`, async () => {
            return await this.model
                .find({ status: 'active', isFeatured: true }, {
                    title: 1,
                    slug: 1,
                    basePrice: 1,
                    baseDiscount: 1,
                    images: { $slice: 1 },
                    'ratings.average': 1,
                    condition: 1
                })
                .sort({ salesCount: -1, createdAt: -1 })
                .limit(limit)
                .lean();
        }, 600); // Cache for 10 minutes
    }

    /**
     * Search products with text index and cursor pagination
     * @param {string} query - Search query
     * @param {Object} filters - Additional filters
     * @returns {Promise<Object>} Search results
     */
    async searchProducts(query, filters = {}) {
        try {
            return await this.model.searchProducts(query, filters);
        } catch (error) {
            logger.error('ProductService.searchProducts error:', error);
            throw error;
        }
    }

    /**
     * Get product by slug or ID (cached)
     * @param {string} identifier - Slug or ID
     * @returns {Promise<Object>} Product data
     */
    async getProductBySlugOrId(identifier) {
        return this._cached(`single:${identifier}`, async () => {
            let product;

            if (identifier.match(/^[0-9a-fA-F]{24}$/)) {
                product = await this.findById(identifier);
            } else {
                product = await this.model.findBySlug(identifier);
            }

            if (!product) {
                throw new AppError('Product not found', 404);
            }

            // Increment view count asynchronously
            setImmediate(() => {
                this.model.findByIdAndUpdate(product._id, { $inc: { viewCount: 1 } })
                    .then(() => logger.debug(`View count updated for ${product._id}`))
                    .catch(err => logger.error('Failed to update view count:', err));
            });

            return product;
        }, 180); // Cache for 3 minutes
    }

    /**
     * Create product with validation
     * @param {Object} productData - Product data
     * @returns {Promise<Object>} Created product
     */
    async createProduct(productData) {
        try {
            // Generate slug
            if (!productData.slug && productData.title) {
                productData.slug = slugify(productData.title, { lower: true, strict: true });
            }

            // Validate category
            if (productData.category?.id) {
                const category = await Category.findById(productData.category.id).lean();
                if (!category) {
                    throw new AppError('Category not found', 404);
                }
                productData.category = {
                    id: category._id,
                    title: category.title,
                    slug: category.slug,
                    path: category.path
                };
            }

            // Validate brand
            if (productData.brand?.id) {
                const brand = await Brand.findById(productData.brand.id).lean();
                if (!brand) {
                    throw new AppError('Brand not found', 404);
                }
                productData.brand = {
                    id: brand._id,
                    title: brand.title,
                    slug: brand.slug
                };
            }

            const product = await this.create(productData);

            // Clear cache
            this._clearCache();

            logger.info('Product created:', product._id);
            return product;
        } catch (error) {
            if (error instanceof AppError) throw error;
            logger.error('ProductService.createProduct error:', error);
            throw error;
        }
    }

    /**
     * Update product
     * @param {string} id - Product ID
     * @param {Object} updateData - Update data
     * @returns {Promise<Object>} Updated product
     */
    async updateProduct(id, updateData) {
        try {
            if (updateData.title && !updateData.slug) {
                updateData.slug = slugify(updateData.title, { lower: true, strict: true });
            }

            const product = await this.updateOrFail(id, updateData);

            // Clear cache
            this._clearCache();

            logger.info('Product updated:', id);
            return product;
        } catch (error) {
            if (error instanceof AppError) throw error;
            logger.error('ProductService.updateProduct error:', error);
            throw error;
        }
    }

    /**
     * Get products by category (optimized)
     * @param {string} categoryId - Category ID
     * @param {Object} options - Query options
     * @returns {Promise<Object>} Products
     */
    async getProductsByCategory(categoryId, options = {}) {
        return this.getProducts({ ...options, categoryId });
    }

    /**
     * Get products by brand (optimized)
     * @param {string} brandId - Brand ID
     * @param {Object} options - Query options
     * @returns {Promise<Object>} Products
     */
    async getProductsByBrand(brandId, options = {}) {
        return this.getProducts({ ...options, brandId });
    }

    /**
     * Get related products (cached)
     * @param {string} productId - Product ID
     * @param {number} limit - Number of products
     * @returns {Promise<Array>} Related products
     */
    async getRelatedProducts(productId, limit = 6) {
        return this._cached(`related:${productId}:${limit}`, async () => {
            const product = await this.findByIdOrFail(productId);

            return await this.model
                .find({
                    _id: { $ne: productId },
                    status: 'active',
                    'category.id': product.category?.id
                }, {
                    title: 1,
                    slug: 1,
                    basePrice: 1,
                    baseDiscount: 1,
                    images: { $slice: 1 },
                    'ratings.average': 1
                })
                .sort({ salesCount: -1 })
                .limit(limit)
                .lean();
        }, 900); // Cache for 15 minutes
    }

    /**
     * Get low stock products (admin only)
     * @param {number} threshold - Stock threshold
     * @param {number} limit - Number of products
     * @returns {Promise<Array>} Low stock products
     */
    async getLowStockProducts(threshold = 10, limit = 50) {
        try {
            return await this.model
                .find({
                    status: 'active',
                    baseStock: { $lte: threshold, $gt: 0 }
                }, {
                    title: 1,
                    baseSku: 1,
                    baseStock: 1,
                    'category.title': 1
                })
                .sort({ baseStock: 1 })
                .limit(limit)
                .lean();
        } catch (error) {
            logger.error('ProductService.getLowStockProducts error:', error);
            throw error;
        }
    }

    /**
     * Update stock (optimized for high concurrency)
     * @param {string} productId - Product ID
     * @param {number} quantity - Quantity to reduce
     * @param {string} variantId - Variant ID (optional)
     * @returns {Promise<Object>} Updated product
     */
    async updateStock(productId, quantity, variantId = null) {
        try {
            // Use atomic operation for stock updates
            const update = variantId
                ? { $inc: { 'variants.$.stock': -quantity, salesCount: quantity } }
                : { $inc: { baseStock: -quantity, salesCount: quantity } };

            const filter = variantId
                ? { _id: productId, 'variants._id': variantId, 'variants.stock': { $gte: quantity } }
                : { _id: productId, baseStock: { $gte: quantity } };

            const product = await this.model.findOneAndUpdate(filter, update, { new: true });

            if (!product) {
                throw new AppError('Insufficient stock or product not found', 400);
            }

            // Clear cache
            this._clearCache(productId);

            logger.info(`Stock updated for product ${productId}: -${quantity}`);
            return product;
        } catch (error) {
            if (error instanceof AppError) throw error;
            logger.error('ProductService.updateStock error:', error);
            throw error;
        }
    }
}
