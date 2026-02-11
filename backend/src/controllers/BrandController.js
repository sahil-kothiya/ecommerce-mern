import { Brand } from '../models/Brand.js';
import { Product } from '../models/Product.js';
import mongoose from 'mongoose';
import { logger } from '../utils/logger.js';

export class BrandController {
    // GET /api/brands - List all brands
    async index(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;
            const skip = (page - 1) * limit;

            const { search, status = 'active' } = req.query;

            // Build query
            const query = { status };
            if (search) {
                query.$or = [
                    { title: { $regex: search, $options: 'i' } },
                    { slug: { $regex: search, $options: 'i' } }
                ];
            }

            const brands = await Brand.find(query)
                .select('title slug logo status productCount')
                .skip(skip)
                .limit(limit)
                .sort({ title: 1 });

            const total = await Brand.countDocuments(query);

            res.status(200).json({
                success: true,
                data: brands,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                }
            });

        } catch (error) {
            logger.error('Get brands error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get brands',
                error: error.message
            });
        }
    }

    // GET /api/brands/:slug - Get brand by slug
    async show(req, res) {
        try {
            const { slug } = req.params;

            const brand = await Brand.findOne({ slug, status: 'active' });

            if (!brand) {
                return res.status(404).json({
                    success: false,
                    message: 'Brand not found'
                });
            }

            res.status(200).json({
                success: true,
                data: brand
            });

        } catch (error) {
            logger.error('Get brand error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get brand',
                error: error.message
            });
        }
    }

    // GET /api/brands/:slug/products - Get products by brand
    async getProducts(req, res) {
        try {
            const { slug } = req.params;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;
            const skip = (page - 1) * limit;

            // Find brand first
            const brand = await Brand.findOne({ slug, status: 'active' });
            if (!brand) {
                return res.status(404).json({
                    success: false,
                    message: 'Brand not found'
                });
            }

            // Get products for this brand
            const products = await Product.find({
                brandId: brand._id,
                status: 'active'
            })
                .populate('categoryId', 'title slug')
                .populate('brandId', 'title slug logo')
                .select('title slug summary baseSku price discount condition isFeatured images createdAt')
                .skip(skip)
                .limit(limit)
                .sort({ createdAt: -1 });

            const total = await Product.countDocuments({
                brandId: brand._id,
                status: 'active'
            });

            res.status(200).json({
                success: true,
                data: {
                    brand,
                    products
                },
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                }
            });

        } catch (error) {
            logger.error('Get brand products error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get brand products',
                error: error.message
            });
        }
    }

    // POST /api/brands - Create brand (Admin only)
    async store(req, res) {
        try {
            const { title, description, status } = req.body;

            // Handle uploaded files
            let logo = null;
            let banners = [];

            if (req.files) {
                // Handle logo
                if (req.files.logo && req.files.logo.length > 0) {
                    logo = `brands/${req.files.logo[0].filename}`;
                }

                // Handle banners
                if (req.files.banners && req.files.banners.length > 0) {
                    banners = req.files.banners.map(file => `brands/${file.filename}`);
                }
            }

            const brand = new Brand({
                title,
                description,
                status: status || 'active',
                logo,
                banners
            });

            await brand.save();

            logger.info(`Brand created: ${brand.title}`);

            res.status(201).json({
                success: true,
                message: 'Brand created successfully',
                data: brand
            });

        } catch (error) {
            logger.error('Create brand error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to create brand',
                error: error.message
            });
        }
    }

    // PUT /api/brands/:id - Update brand (Admin only)
    async update(req, res) {
        try {
            const { id } = req.params;
            const { title, description, status, existingBanners, keepExistingLogo } = req.body;

            if (!mongoose.Types.ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid brand ID'
                });
            }

            const brand = await Brand.findById(id);

            if (!brand) {
                return res.status(404).json({
                    success: false,
                    message: 'Brand not found'
                });
            }

            // Handle uploaded files
            let logo = brand.logo;
            let banners = [];

            // Update logo if new one uploaded
            if (req.files && req.files.logo && req.files.logo.length > 0) {
                logo = `brands/${req.files.logo[0].filename}`;
            } else if (keepExistingLogo !== 'true') {
                logo = null;
            }

            // Handle banners
            if (existingBanners) {
                try {
                    const parsed = typeof existingBanners === 'string' 
                        ? JSON.parse(existingBanners) 
                        : existingBanners;
                    banners = Array.isArray(parsed) ? parsed : [];
                } catch (e) {
                    console.error('Error parsing existing banners:', e);
                    banners = [];
                }
            }

            // Add new banners
            if (req.files && req.files.banners && req.files.banners.length > 0) {
                const newBanners = req.files.banners.map(file => `brands/${file.filename}`);
                banners = [...banners, ...newBanners];
            }

            // Update brand
            brand.title = title || brand.title;
            brand.description = description || brand.description;
            brand.status = status || brand.status;
            brand.logo = logo;
            brand.banners = banners;

            await brand.save();

            logger.info(`Brand updated: ${brand.title}`);

            res.status(200).json({
                success: true,
                message: 'Brand updated successfully',
                data: brand
            });

        } catch (error) {
            logger.error('Update brand error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update brand',
                error: error.message
            });
        }
    }

    // DELETE /api/brands/:id - Delete brand (Admin only)
    async destroy(req, res) {
        try {
            const { id } = req.params;

            if (!mongoose.Types.ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid brand ID'
                });
            }

            // Check if brand has products
            const productCount = await Product.countDocuments({ brandId: id });
            if (productCount > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Cannot delete brand with existing products'
                });
            }

            const brand = await Brand.findByIdAndDelete(id);

            if (!brand) {
                return res.status(404).json({
                    success: false,
                    message: 'Brand not found'
                });
            }

            logger.info(`Brand deleted: ${brand.title}`);

            res.status(200).json({
                success: true,
                message: 'Brand deleted successfully'
            });

        } catch (error) {
            logger.error('Delete brand error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to delete brand',
                error: error.message
            });
        }
    }
}