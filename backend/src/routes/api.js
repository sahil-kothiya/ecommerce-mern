import express from 'express';
import { productController } from '../controllers/ProductController.js';
import { categoryController } from '../controllers/CategoryController.js';
import { cartController } from '../controllers/CartController.js';
import { orderController } from '../controllers/OrderController.js';
import { auth, adminAuth } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validation.js';
import { rateLimit } from '../middleware/rateLimit.js';

const router = express.Router();

// ============================================================================
// PRODUCT ROUTES
// ============================================================================

// Public product routes
router.get('/products', productController.index.bind(productController));
router.get('/products/featured', productController.featured.bind(productController));
router.get('/products/search', productController.search.bind(productController));
router.get('/products/low-stock', adminAuth, productController.lowStock.bind(productController));
router.get('/products/category/:categoryId', productController.byCategory.bind(productController));
router.get('/products/brand/:brandId', productController.byBrand.bind(productController));
router.get('/products/:id', productController.show.bind(productController));
router.get('/products/:id/related', productController.related.bind(productController));
router.get('/products/slug/:slug', productController.showBySlug.bind(productController));

// Protected product routes
router.post('/products', adminAuth, validateRequest('createProduct'), productController.store.bind(productController));
router.put('/products/:id', adminAuth, validateRequest('updateProduct'), productController.update.bind(productController));
router.delete('/products/:id', adminAuth, productController.destroy.bind(productController));
router.post('/products/:id/stock', adminAuth, productController.updateStock.bind(productController));

// ============================================================================
// CATEGORY ROUTES
// ============================================================================

// Public category routes
router.get('/categories', categoryController.index.bind(categoryController));
router.get('/categories/tree', categoryController.tree.bind(categoryController));
router.get('/categories/flat', categoryController.flat.bind(categoryController));
router.get('/categories/navigation', categoryController.navigation.bind(categoryController));
router.get('/categories/:id', categoryController.show.bind(categoryController));
router.get('/categories/:id/breadcrumb', categoryController.breadcrumb.bind(categoryController));
router.get('/categories/:id/products', categoryController.products.bind(categoryController));
router.get('/categories/:id/brands', categoryController.brands.bind(categoryController));
router.get('/categories/slug/:slug', categoryController.showBySlug.bind(categoryController));

// Protected category routes
router.post('/categories', adminAuth, validateRequest('createCategory'), categoryController.store.bind(categoryController));
router.put('/categories/:id', adminAuth, validateRequest('updateCategory'), categoryController.update.bind(categoryController));
router.delete('/categories/:id', adminAuth, categoryController.destroy.bind(categoryController));
router.post('/categories/:id/reorder', adminAuth, categoryController.reorder.bind(categoryController));

// ============================================================================
// CART ROUTES
// ============================================================================

// Cart routes (support both authenticated and session-based carts)
router.get('/cart', cartController.index.bind(cartController));
router.get('/cart/count', cartController.count.bind(cartController));
router.post('/cart/add', rateLimit(30, 60), validateRequest('addToCart'), cartController.addItem.bind(cartController));
router.put('/cart/update/:itemId', validateRequest('updateCartItem'), cartController.updateItem.bind(cartController));
router.delete('/cart/remove/:itemId', cartController.removeItem.bind(cartController));
router.delete('/cart/clear', cartController.clear.bind(cartController));
router.post('/cart/validate', cartController.validate.bind(cartController));
router.get('/cart/shipping-estimate', cartController.shippingEstimate.bind(cartController));
router.post('/cart/apply-coupon', validateRequest('applyCoupon'), cartController.applyCoupon.bind(cartController));
router.delete('/cart/remove-coupon', cartController.removeCoupon.bind(cartController));

// Authenticated cart routes
router.post('/cart/merge', auth, cartController.mergeSessionCart.bind(cartController));

// ============================================================================
// ORDER ROUTES
// ============================================================================

// Customer order routes
router.get('/orders', auth, orderController.index.bind(orderController));
router.get('/orders/summary', auth, orderController.summary.bind(orderController));
router.get('/orders/:id', auth, orderController.show.bind(orderController));
router.get('/orders/:id/tracking', auth, orderController.tracking.bind(orderController));
router.post('/orders', auth, validateRequest('createOrder'), orderController.store.bind(orderController));
router.put('/orders/:id/cancel', auth, validateRequest('cancelOrder'), orderController.cancel.bind(orderController));

// Admin order routes
router.get('/admin/orders', adminAuth, orderController.adminIndex.bind(orderController));
router.put('/admin/orders/:id/status', adminAuth, validateRequest('updateOrderStatus'), orderController.updateStatus.bind(orderController));
router.put('/admin/orders/:id/shipping', adminAuth, validateRequest('updateShipping'), orderController.updateShipping.bind(orderController));

// ============================================================================
// BRAND ROUTES
// ============================================================================

import { Brand } from '../models/Brand.js';

// Public brand routes
router.get('/brands', async (req, res) => {
    try {
        const { status = 'active', sort = 'title' } = req.query;

        const brands = await Brand.find({ status })
            .sort(sort)
            .lean();

        res.json({
            success: true,
            data: brands
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch brands'
        });
    }
});

router.get('/brands/:id', async (req, res) => {
    try {
        const brand = await Brand.findById(req.params.id);

        if (!brand) {
            return res.status(404).json({
                success: false,
                message: 'Brand not found'
            });
        }

        res.json({
            success: true,
            data: brand
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch brand'
        });
    }
});

router.get('/brands/slug/:slug', async (req, res) => {
    try {
        const brand = await Brand.findOne({
            slug: req.params.slug,
            status: 'active'
        });

        if (!brand) {
            return res.status(404).json({
                success: false,
                message: 'Brand not found'
            });
        }

        res.json({
            success: true,
            data: brand
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch brand'
        });
    }
});

// Admin brand routes
router.post('/brands', adminAuth, async (req, res) => {
    try {
        const brand = new Brand(req.body);
        await brand.save();

        res.status(201).json({
            success: true,
            message: 'Brand created successfully',
            data: brand
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to create brand'
        });
    }
});

router.put('/brands/:id', adminAuth, async (req, res) => {
    try {
        const brand = await Brand.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        if (!brand) {
            return res.status(404).json({
                success: false,
                message: 'Brand not found'
            });
        }

        res.json({
            success: true,
            message: 'Brand updated successfully',
            data: brand
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to update brand'
        });
    }
});

router.delete('/brands/:id', adminAuth, async (req, res) => {
    try {
        const brand = await Brand.findById(req.params.id);

        if (!brand) {
            return res.status(404).json({
                success: false,
                message: 'Brand not found'
            });
        }

        await brand.deleteOne();

        res.json({
            success: true,
            message: 'Brand deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to delete brand'
        });
    }
});

// ============================================================================
// VARIANT ROUTES
// ============================================================================

import { VariantType, VariantOption } from '../models/Supporting.models.js';

// Variant type routes
router.get('/variant-types', async (req, res) => {
    try {
        const variantTypes = await VariantType.find()
            .populate('options')
            .sort('position');

        res.json({
            success: true,
            data: variantTypes
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch variant types'
        });
    }
});

router.post('/variant-types', adminAuth, async (req, res) => {
    try {
        const variantType = new VariantType(req.body);
        await variantType.save();

        res.status(201).json({
            success: true,
            message: 'Variant type created successfully',
            data: variantType
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to create variant type'
        });
    }
});

// Variant option routes
router.get('/variant-types/:typeId/options', async (req, res) => {
    try {
        const options = await VariantOption.find({
            variantType: req.params.typeId
        }).sort('position');

        res.json({
            success: true,
            data: options
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch variant options'
        });
    }
});

router.post('/variant-types/:typeId/options', adminAuth, async (req, res) => {
    try {
        const option = new VariantOption({
            ...req.body,
            variantType: req.params.typeId
        });
        await option.save();

        res.status(201).json({
            success: true,
            message: 'Variant option created successfully',
            data: option
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to create variant option'
        });
    }
});

// ============================================================================
// SEARCH & FILTER ROUTES
// ============================================================================

// Advanced search endpoint
router.post('/search', async (req, res) => {
    try {
        const {
            query,
            filters = {},
            sort = '-createdAt',
            page = 1,
            limit = 20
        } = req.body;

        // Build search query
        const searchQuery = { status: 'active' };

        // Text search
        if (query) {
            searchQuery.$text = { $search: query };
        }

        // Apply filters
        if (filters.categories && filters.categories.length > 0) {
            searchQuery['category.id'] = { $in: filters.categories };
        }

        if (filters.brands && filters.brands.length > 0) {
            searchQuery['brand.id'] = { $in: filters.brands };
        }

        if (filters.priceRange) {
            searchQuery.basePrice = {};
            if (filters.priceRange.min) searchQuery.basePrice.$gte = filters.priceRange.min;
            if (filters.priceRange.max) searchQuery.basePrice.$lte = filters.priceRange.max;
        }

        if (filters.rating && filters.rating > 0) {
            searchQuery['ratings.average'] = { $gte: filters.rating };
        }

        if (filters.condition) {
            searchQuery.condition = filters.condition;
        }

        if (filters.tags && filters.tags.length > 0) {
            searchQuery.tags = { $in: filters.tags };
        }

        const skip = (page - 1) * limit;

        const [products, total] = await Promise.all([
            Product.find(searchQuery)
                .sort(sort)
                .skip(skip)
                .limit(limit)
                .lean(),
            Product.countDocuments(searchQuery)
        ]);

        res.json({
            success: true,
            data: {
                products,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                },
                appliedFilters: filters
            }
        });

    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({
            success: false,
            message: 'Search failed'
        });
    }
});

// Get search filters/facets
router.get('/search/filters', async (req, res) => {
    try {
        const [categories, brands, priceRange] = await Promise.all([
            Category.find({ status: 'active', level: { $lte: 2 } })
                .select('title slug level')
                .sort('title'),

            Brand.find({ status: 'active' })
                .select('title slug')
                .sort('title'),

            Product.aggregate([
                { $match: { status: 'active' } },
                {
                    $group: {
                        _id: null,
                        minPrice: { $min: '$basePrice' },
                        maxPrice: { $max: '$basePrice' }
                    }
                }
            ])
        ]);

        res.json({
            success: true,
            data: {
                categories,
                brands,
                priceRange: priceRange[0] || { minPrice: 0, maxPrice: 1000 },
                conditions: ['new', 'refurbished', 'used']
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch search filters'
        });
    }
});

export default router;