import { Product } from '../models/Product.js';
import { Category } from '../models/Category.js';
import { Brand } from '../models/Brand.js';
import { VariantType, VariantOption } from '../models/Supporting.models.js';
import mongoose from 'mongoose';
import slugify from 'slugify';

const MAX_PAGE_SIZE = 100;
const PRODUCT_LIST_SELECT = [
    'title',
    'slug',
    'summary',
    'condition',
    'status',
    'isFeatured',
    'hasVariants',
    'basePrice',
    'baseDiscount',
    'baseStock',
    'images',
    'category',
    'brand',
    'ratings',
    'viewCount',
    'salesCount',
    'createdAt'
].join(' ');

const ALLOWED_SORT_FIELDS = new Set([
    'createdAt',
    'basePrice',
    'viewCount',
    'salesCount',
    'ratings.average',
    'title'
]);

const SORT_ALIASES = {
    newest: '-createdAt',
    oldest: 'createdAt',
    'price-low': 'basePrice',
    'price-high': '-basePrice',
    rating: '-ratings.average',
    popular: '-salesCount',
    popularity: '-salesCount',
};

const parseSort = (sort = '-createdAt') => {
    const normalized = String(sort || '').trim();
    const value = SORT_ALIASES[normalized] || normalized || '-createdAt';
    const descending = value.startsWith('-');
    const field = descending ? value.slice(1) : value;

    if (!ALLOWED_SORT_FIELDS.has(field)) {
        return { createdAt: -1 };
    }

    return { [field]: descending ? -1 : 1 };
};

export class ProductController {
    // GET /api/products - List products with pagination
    async index(req, res) {
        try {
            const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
            const limit = Math.min(
                MAX_PAGE_SIZE,
                Math.max(1, Number.parseInt(req.query.limit, 10) || 20)
            );
            const skip = (page - 1) * limit;

            const {
                search,
                category,
                categoryId,
                brand,
                brandId,
                minPrice,
                maxPrice,
                condition,
                isFeatured,
                status = 'active',
                sort = '-createdAt'
            } = req.query;

            // Build query
            const query = { status };

            if (search) {
                query.$text = { $search: search };
            }

            if (categoryId && mongoose.Types.ObjectId.isValid(categoryId)) {
                query['category.id'] = new mongoose.Types.ObjectId(categoryId);
            } else if (category && category !== 'all') {
                query['category.slug'] = String(category).trim();
            }

            if (brandId && mongoose.Types.ObjectId.isValid(brandId)) {
                query['brand.id'] = new mongoose.Types.ObjectId(brandId);
            } else if (brand && brand !== 'all') {
                query['brand.slug'] = String(brand).trim();
            }

            if (minPrice || maxPrice) {
                query.basePrice = {};
                const parsedMin = Number.parseFloat(minPrice);
                const parsedMax = Number.parseFloat(maxPrice);
                if (Number.isFinite(parsedMin)) query.basePrice.$gte = parsedMin;
                if (Number.isFinite(parsedMax)) query.basePrice.$lte = parsedMax;
                if (Object.keys(query.basePrice).length === 0) {
                    delete query.basePrice;
                }
            }

            if (condition) {
                query.condition = condition;
            }

            if (isFeatured !== undefined) {
                query.isFeatured = isFeatured === 'true';
            }

            // Execute query with pagination
            const [products, total] = await Promise.all([
                Product.find(query)
                    .select(PRODUCT_LIST_SELECT)
                    .sort(parseSort(sort))
                    .skip(skip)
                    .limit(limit)
                    .lean(),
                Product.countDocuments(query)
            ]);

            const pages = Math.ceil(total / limit);

            res.json({
                success: true,
                data: {
                    products,
                    pagination: {
                        page,
                        limit,
                        total,
                        pages,
                        hasNext: page < pages,
                        hasPrev: page > 1
                    }
                }
            });
        } catch (error) {
            console.error('Product index error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch products',
                error: error.message
            });
        }
    }

    // GET /api/products/featured - Get featured products
    async featured(req, res) {
        try {
            const limit = parseInt(req.query.limit) || 10;

            const products = await Product.find({
                status: 'active',
                isFeatured: true
            })
                .select(PRODUCT_LIST_SELECT)
                .sort({ createdAt: -1 })
                .limit(limit)
                .lean();

            res.json({
                success: true,
                data: products
            });
        } catch (error) {
            console.error('Featured products error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch featured products'
            });
        }
    }

    // GET /api/products/search - Search products
    async search(req, res) {
        try {
            const { q, ...filters } = req.query;

            if (!q) {
                return res.status(400).json({
                    success: false,
                    message: 'Search query is required'
                });
            }

            const result = await Product.searchProducts(q, filters);

            res.json({
                success: true,
                data: result
            });
        } catch (error) {
            console.error('Product search error:', error);
            res.status(500).json({
                success: false,
                message: 'Search failed'
            });
        }
    }

    // GET /api/products/:slug - Get single product by slug or ID
    async show(req, res) {
        try {
            const { slug } = req.params;
            const byIdQuery = mongoose.Types.ObjectId.isValid(slug) && slug.length === 24
                ? { _id: slug }
                : null;
            const query = byIdQuery || { slug };
            const product = await Product.findOneAndUpdate(
                { ...query, status: 'active' },
                { $inc: { viewCount: 1 } },
                { new: true }
            );

            if (!product || product.status !== 'active') {
                return res.status(404).json({
                    success: false,
                    message: 'Product not found'
                });
            }

            res.json({
                success: true,
                data: product
            });
        } catch (error) {
            console.error('Product show error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch product'
            });
        }
    }

    // GET /api/products/slug/:slug - Get product by slug
    async showBySlug(req, res) {
        try {
            const { slug } = req.params;

            const product = await Product.findOneAndUpdate(
                { slug, status: 'active' },
                { $inc: { viewCount: 1 } },
                { new: true }
            );

            if (!product) {
                return res.status(404).json({
                    success: false,
                    message: 'Product not found'
                });
            }

            res.json({
                success: true,
                data: product
            });
        } catch (error) {
            console.error('Product show by slug error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch product'
            });
        }
    }

    // POST /api/products - Create new product
    async store(req, res) {
        try {
            const {
                title,
                summary,
                description,
                categoryId,
                childCategoryId,
                brandId,
                condition = 'default',
                status = 'draft',
                isFeatured = false,
                hasVariants = false,
                basePrice,
                baseDiscount = 0,
                baseStock,
                baseSku,
                size = [],
                variants = [],
                tags = []
            } = req.body;

            // Handle uploaded images
            let images = [];
            if (req.files && req.files.length > 0) {
                images = req.files.map((file, index) => ({
                    path: `products/${file.filename}`,
                    url: `/uploads/products/${file.filename}`,
                    isPrimary: index === 0,
                    sortOrder: index
                }));
            }

            // Parse arrays if they come as strings (from FormData)
            const parsedSize = Array.isArray(size) ? size : (size ? JSON.parse(size) : []);
            const parsedVariants = Array.isArray(variants) ? variants : (variants ? JSON.parse(variants) : []);
            const parsedTags = Array.isArray(tags) ? tags : (tags ? JSON.parse(tags) : []);

            // Validate required fields
            if (!title) {
                return res.status(400).json({
                    success: false,
                    message: 'Title is required'
                });
            }

            // Validate variant logic and auto-generate SKU if needed
            let finalBaseSku = baseSku;
            if (hasVariants === true || hasVariants === 'true') {
                if (!parsedVariants || parsedVariants.length === 0) {
                    return res.status(400).json({
                        success: false,
                        message: 'At least one variant is required for variant products'
                    });
                }
            } else {
                if (!basePrice) {
                    return res.status(400).json({
                        success: false,
                        message: 'Base price is required for non-variant products'
                    });
                }
                
                // Auto-generate SKU if not provided
                if (!baseSku) {
                    const timestamp = Date.now();
                    const randomNum = Math.floor(Math.random() * 1000);
                    finalBaseSku = `PRD-${timestamp}-${randomNum}`;
                }
            }

            // Get category and brand info for denormalization
            let categoryInfo = null;
            let brandInfo = null;

            if (categoryId) {
                const category = await Category.findById(categoryId);
                if (category) {
                    categoryInfo = {
                        id: category._id,
                        title: category.title,
                        slug: category.slug,
                        path: category.pathNames || category.title
                    };
                }
            }

            if (brandId) {
                const brand = await Brand.findById(brandId);
                if (brand) {
                    brandInfo = {
                        id: brand._id,
                        title: brand.title,
                        slug: brand.slug
                    };
                }
            }

            // Create product
            const product = new Product({
                title,
                summary: summary || title,
                description,
                condition,
                status,
                isFeatured: isFeatured === true || isFeatured === 'true',
                hasVariants: hasVariants === true || hasVariants === 'true',
                basePrice: (hasVariants === true || hasVariants === 'true') ? null : parseFloat(basePrice),
                baseDiscount: (hasVariants === true || hasVariants === 'true') ? 0 : parseFloat(baseDiscount) || 0,
                baseStock: (hasVariants === true || hasVariants === 'true') ? null : parseInt(baseStock) || 0,
                baseSku: (hasVariants === true || hasVariants === 'true') ? null : finalBaseSku,
                size: parsedSize,
                variants: parsedVariants,
                images,
                category: categoryInfo,
                childCategory: childCategoryId ? { id: childCategoryId } : null,
                brand: brandInfo,
                tags: parsedTags,
                ratings: {
                    average: 0,
                    count: 0,
                    distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
                }
            });

            await product.save();

            res.status(201).json({
                success: true,
                message: 'Product created successfully',
                data: product
            });
        } catch (error) {
            console.error('Product store error:', error);

            // Handle validation errors
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

            // Handle duplicate key errors
            if (error.code === 11000) {
                return res.status(409).json({
                    success: false,
                    message: 'Product with this slug or SKU already exists'
                });
            }

            res.status(500).json({
                success: false,
                message: 'Failed to create product',
                error: error.message
            });
        }
    }

    // PUT /api/products/:id - Update product
    async update(req, res) {
        try {
            const { id } = req.params;
            const {
                title,
                summary,
                description,
                categoryId,
                childCategoryId,
                brandId,
                condition,
                status,
                isFeatured,
                hasVariants,
                basePrice,
                baseDiscount,
                baseStock,
                baseSku,
                size,
                variants,
                tags,
                existingImages
            } = req.body;

            const product = await Product.findById(id);

            if (!product) {
                return res.status(404).json({
                    success: false,
                    message: 'Product not found'
                });
            }

            // Handle uploaded images
            let images = [];
            
            // Parse existing images if provided
            if (existingImages) {
                try {
                    const parsedExisting = typeof existingImages === 'string' 
                        ? JSON.parse(existingImages) 
                        : existingImages;
                    images = Array.isArray(parsedExisting) ? parsedExisting : [];
                } catch (e) {
                    console.error('Error parsing existing images:', e);
                    images = [];
                }
            }

            // Add new uploaded images
            if (req.files && req.files.length > 0) {
                const newImages = req.files.map((file, index) => ({
                    path: `products/${file.filename}`,
                    url: `/uploads/products/${file.filename}`,
                    isPrimary: images.length === 0 && index === 0,
                    sortOrder: images.length + index
                }));
                images = [...images, ...newImages];
            }

            // Parse arrays
            const parsedSize = size ? (Array.isArray(size) ? size : JSON.parse(size)) : [];
            const parsedVariants = variants ? (Array.isArray(variants) ? variants : JSON.parse(variants)) : [];
            const parsedTags = tags ? (Array.isArray(tags) ? tags : JSON.parse(tags)) : [];

            // Update denormalized data if category or brand changed
            let categoryInfo = product.category;
            let brandInfo = product.brand;

            if (categoryId && categoryId !== product.category?.id?.toString()) {
                const category = await Category.findById(categoryId);
                if (category) {
                    categoryInfo = {
                        id: category._id,
                        title: category.title,
                        slug: category.slug,
                        path: category.pathNames || category.title
                    };
                }
            }

            if (brandId && brandId !== product.brand?.id?.toString()) {
                const brand = await Brand.findById(brandId);
                if (brand) {
                    brandInfo = {
                        id: brand._id,
                        title: brand.title,
                        slug: brand.slug
                    };
                }
            }

            // Update product fields
            product.title = title || product.title;
            product.summary = summary || title || product.summary;
            product.description = description || product.description;
            product.condition = condition || product.condition;
            product.status = status || product.status;
            product.isFeatured = isFeatured === true || isFeatured === 'true';
            product.hasVariants = hasVariants === true || hasVariants === 'true';
            product.basePrice = (hasVariants === true || hasVariants === 'true') ? null : parseFloat(basePrice) || product.basePrice;
            product.baseDiscount = (hasVariants === true || hasVariants === 'true') ? 0 : parseFloat(baseDiscount) || 0;
            product.baseStock = (hasVariants === true || hasVariants === 'true') ? null : parseInt(baseStock) || product.baseStock;
            product.baseSku = (hasVariants === true || hasVariants === 'true') ? null : baseSku || product.baseSku;
            product.size = parsedSize;
            product.variants = parsedVariants;
            product.images = images;
            product.category = categoryInfo;
            product.childCategory = childCategoryId ? { id: childCategoryId } : product.childCategory;
            product.brand = brandInfo;
            product.tags = parsedTags;

            await product.save();

            res.json({
                success: true,
                message: 'Product updated successfully',
                data: product
            });
        } catch (error) {
            console.error('Product update error:', error);

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
                message: 'Failed to update product',
                error: error.message
            });
        }
    }

    // DELETE /api/products/:id - Delete product
    async destroy(req, res) {
        try {
            const { id } = req.params;

            const product = await Product.findById(id);

            if (!product) {
                return res.status(404).json({
                    success: false,
                    message: 'Product not found'
                });
            }

            await product.deleteOne();

            res.json({
                success: true,
                message: 'Product deleted successfully'
            });
        } catch (error) {
            console.error('Product delete error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to delete product'
            });
        }
    }

    // GET /api/products/category/:categoryId - Get products by category
    async byCategory(req, res) {
        try {
            const { categoryId } = req.params;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;
            const sort = req.query.sort || '-createdAt';

            const result = await Product.findByCategory(categoryId, {
                page,
                limit,
                sort
            });

            const total = await Product.countDocuments({
                'category.id': categoryId,
                status: 'active'
            });

            res.json({
                success: true,
                data: {
                    products: result,
                    pagination: {
                        page,
                        limit,
                        total,
                        pages: Math.ceil(total / limit)
                    }
                }
            });
        } catch (error) {
            console.error('Products by category error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch products by category'
            });
        }
    }

    // GET /api/products/brand/:brandId - Get products by brand
    async byBrand(req, res) {
        try {
            const { brandId } = req.params;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;
            const sort = req.query.sort || '-createdAt';

            const result = await Product.findByBrand(brandId, {
                page,
                limit,
                sort
            });

            const total = await Product.countDocuments({
                'brand.id': brandId,
                status: 'active'
            });

            res.json({
                success: true,
                data: {
                    products: result,
                    pagination: {
                        page,
                        limit,
                        total,
                        pages: Math.ceil(total / limit)
                    }
                }
            });
        } catch (error) {
            console.error('Products by brand error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch products by brand'
            });
        }
    }

    // POST /api/products/:id/stock - Update stock
    async updateStock(req, res) {
        try {
            const { id } = req.params;
            const { variantId, quantity } = req.body;

            const product = await Product.findById(id);

            if (!product) {
                return res.status(404).json({
                    success: false,
                    message: 'Product not found'
                });
            }

            await product.updateStock(variantId, quantity);

            res.json({
                success: true,
                message: 'Stock updated successfully',
                data: product
            });
        } catch (error) {
            console.error('Update stock error:', error);
            res.status(400).json({
                success: false,
                message: error.message || 'Failed to update stock'
            });
        }
    }

    // GET /api/products/low-stock - Get low stock products
    async lowStock(req, res) {
        try {
            const threshold = parseInt(req.query.threshold) || 10;

            const products = await Product.getLowStockProducts(threshold);

            res.json({
                success: true,
                data: products
            });
        } catch (error) {
            console.error('Low stock error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch low stock products'
            });
        }
    }

    // GET /api/products/related/:id - Get related products
    async related(req, res) {
        try {
            const { id } = req.params;
            const limit = Math.min(
                20,
                Math.max(1, Number.parseInt(req.query.limit, 10) || 8)
            );

            const product = await Product.findById(id);

            if (!product) {
                return res.status(404).json({
                    success: false,
                    message: 'Product not found'
                });
            }

            // Find related products by category and brand
            const query = {
                _id: { $ne: product._id },
                status: 'active',
                $or: []
            };

            if (product.category?.id) {
                query.$or.push({ 'category.id': product.category.id });
            }

            if (product.brand?.id) {
                query.$or.push({ 'brand.id': product.brand.id });
            }

            // If no category or brand, find by tags
            if (query.$or.length === 0 && product.tags?.length > 0) {
                query.tags = { $in: product.tags };
                delete query.$or;
            }

            const relatedProducts = await Product.find(query)
                .select(PRODUCT_LIST_SELECT)
                .sort({ salesCount: -1, 'ratings.average': -1 })
                .limit(limit)
                .lean();

            res.json({
                success: true,
                data: relatedProducts
            });
        } catch (error) {
            console.error('Related products error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch related products'
            });
        }
    }
}

export const productController = new ProductController();
