/**
 * @fileoverview Banner Controller
 * @description Handles HTTP requests for banner CRUD operations with image uploads
 * @module controllers/BannerController
 * @author Enterprise E-Commerce Team
 * @version 1.0.0
 */

import { Banner } from '../models/Banner.js';
import { deleteUploadedFile } from '../middleware/uploadEnhanced.js';
import mongoose from 'mongoose';

/**
 * Banner Controller Class
 * @description Manages banner-related HTTP endpoints
 */
export class BannerController {
    /**
     * Get all banners with filtering and pagination
     * @route GET /api/banners
     * @access Public
     * @param {Object} req - Express request
     * @param {Object} res - Express response
     */
    async index(req, res) {
        try {
            const {
                page = 1,
                limit = 20,
                status,
                position,
                sortBy = 'sortOrder',
                sortOrder = 'asc'
            } = req.query;

            const skip = (page - 1) * limit;
            const query = {};

            // Apply filters
            if (status) query.status = status;
            if (position) query.position = position;

            // Build sort object
            const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

            // Execute query with pagination
            const [banners, total] = await Promise.all([
                Banner.find(query)
                    .sort(sort)
                    .skip(skip)
                    .limit(parseInt(limit))
                    .lean(),
                Banner.countDocuments(query)
            ]);

            const pages = Math.ceil(total / limit);

            res.json({
                success: true,
                data: {
                    banners,
                    pagination: {
                        page: parseInt(page),
                        limit: parseInt(limit),
                        total,
                        pages,
                        hasNext: page < pages,
                        hasPrev: page > 1
                    }
                }
            });
        } catch (error) {
            console.error('Banner index error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch banners',
                error: error.message
            });
        }
    }

    /**
     * Get active banners for specific position
     * @route GET /api/banners/active/:position
     * @access Public
     * @param {Object} req - Express request
     * @param {Object} res - Express response
     */
    async getActiveByPosition(req, res) {
        try {
            const { position } = req.params;
            const limit = req.query.limit ? parseInt(req.query.limit) : null;

            const banners = await Banner.getActiveByPosition(position, limit);

            res.json({
                success: true,
                data: banners
            });
        } catch (error) {
            console.error('Get active banners error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch active banners',
                error: error.message
            });
        }
    }

    /**
     * Get single banner by ID
     * @route GET /api/banners/:id
     * @access Public
     * @param {Object} req - Express request
     * @param {Object} res - Express response
     */
    async show(req, res) {
        try {
            const { id } = req.params;

            if (!mongoose.Types.ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid banner ID'
                });
            }

            const banner = await Banner.findById(id);

            if (!banner) {
                return res.status(404).json({
                    success: false,
                    message: 'Banner not found'
                });
            }

            res.json({
                success: true,
                data: banner
            });
        } catch (error) {
            console.error('Banner show error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch banner',
                error: error.message
            });
        }
    }

    /**
     * Create new banner with image upload
     * @route POST /api/banners
     * @access Admin
     * @param {Object} req - Express request (with uploaded file)
     * @param {Object} res - Express response
     */
    async create(req, res) {
        try {
            const {
                title,
                description,
                link,
                linkTarget,
                position,
                sortOrder,
                status,
                startDate,
                endDate,
                metadata
            } = req.body;

            // Validate required fields
            if (!title) {
                return res.status(400).json({
                    success: false,
                    message: 'Title is required'
                });
            }

            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    message: 'Banner image is required'
                });
            }

            // Create banner data
            const bannerData = {
                title,
                description,
                image: `banners/${req.file.filename}`,
                link: link || '',
                linkTarget: linkTarget || '_self',
                position: position || 'home-main',
                sortOrder: sortOrder ? parseInt(sortOrder) : 0,
                status: status || 'inactive',
                startDate: startDate || null,
                endDate: endDate || null,
                metadata: metadata ? JSON.parse(metadata) : {}
            };

            const banner = await Banner.create(bannerData);

            res.status(201).json({
                success: true,
                message: 'Banner created successfully',
                data: banner
            });
        } catch (error) {
            // Clean up uploaded file if banner creation fails
            if (req.file) {
                await deleteUploadedFile(`banners/${req.file.filename}`);
            }

            console.error('Banner create error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to create banner',
                error: error.message
            });
        }
    }

    /**
     * Update existing banner
     * @route PUT /api/banners/:id
     * @access Admin
     * @param {Object} req - Express request
     * @param {Object} res - Express response
     */
    async update(req, res) {
        try {
            const { id } = req.params;

            if (!mongoose.Types.ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid banner ID'
                });
            }

            const banner = await Banner.findById(id);

            if (!banner) {
                if (req.file) {
                    await deleteUploadedFile(`banners/${req.file.filename}`);
                }
                return res.status(404).json({
                    success: false,
                    message: 'Banner not found'
                });
            }

            // Track old image for deletion
            const oldImage = banner.image;

            // Update fields
            const {
                title,
                description,
                link,
                linkTarget,
                position,
                sortOrder,
                status,
                startDate,
                endDate,
                metadata
            } = req.body;

            if (title !== undefined) banner.title = title;
            if (description !== undefined) banner.description = description;
            if (link !== undefined) banner.link = link;
            if (linkTarget !== undefined) banner.linkTarget = linkTarget;
            if (position !== undefined) banner.position = position;
            if (sortOrder !== undefined) banner.sortOrder = parseInt(sortOrder);
            if (status !== undefined) banner.status = status;
            if (startDate !== undefined) banner.startDate = startDate || null;
            if (endDate !== undefined) banner.endDate = endDate || null;
            if (metadata !== undefined) banner.metadata = JSON.parse(metadata);

            // Update image if new one uploaded
            if (req.file) {
                banner.image = `banners/${req.file.filename}`;
            }

            await banner.save();

            // Delete old image if new one was uploaded
            if (req.file && oldImage) {
                await deleteUploadedFile(oldImage);
            }

            res.json({
                success: true,
                message: 'Banner updated successfully',
                data: banner
            });
        } catch (error) {
            if (req.file) {
                await deleteUploadedFile(`banners/${req.file.filename}`);
            }

            console.error('Banner update error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update banner',
                error: error.message
            });
        }
    }

    /**
     * Delete banner
     * @route DELETE /api/banners/:id
     * @access Admin
     * @param {Object} req - Express request
     * @param {Object} res - Express response
     */
    async destroy(req, res) {
        try {
            const { id } = req.params;

            if (!mongoose.Types.ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid banner ID'
                });
            }

            const banner = await Banner.findById(id);

            if (!banner) {
                return res.status(404).json({
                    success: false,
                    message: 'Banner not found'
                });
            }

            // Delete associated image
            if (banner.image) {
                await deleteUploadedFile(banner.image);
            }

            await banner.deleteOne();

            res.json({
                success: true,
                message: 'Banner deleted successfully'
            });
        } catch (error) {
            console.error('Banner delete error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to delete banner',
                error: error.message
            });
        }
    }

    /**
     * Track banner view
     * @route POST /api/banners/:id/view
     * @access Public
     * @param {Object} req - Express request
     * @param {Object} res - Express response
     */
    async trackView(req, res) {
        try {
            const { id } = req.params;

            if (!mongoose.Types.ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid banner ID'
                });
            }

            const banner = await Banner.findById(id);

            if (!banner) {
                return res.status(404).json({
                    success: false,
                    message: 'Banner not found'
                });
            }

            await banner.incrementViewCount();

            res.json({
                success: true,
                message: 'View tracked'
            });
        } catch (error) {
            console.error('Track view error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to track view',
                error: error.message
            });
        }
    }

    /**
     * Track banner click
     * @route POST /api/banners/:id/click
     * @access Public
     * @param {Object} req - Express request
     * @param {Object} res - Express response
     */
    async trackClick(req, res) {
        try {
            const { id } = req.params;

            if (!mongoose.Types.ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid banner ID'
                });
            }

            const banner = await Banner.findById(id);

            if (!banner) {
                return res.status(404).json({
                    success: false,
                    message: 'Banner not found'
                });
            }

            await banner.incrementClickCount();

            res.json({
                success: true,
                message: 'Click tracked'
            });
        } catch (error) {
            console.error('Track click error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to track click',
                error: error.message
            });
        }
    }

    /**
     * Get banner analytics
     * @route GET /api/banners/analytics
     * @access Admin
     * @param {Object} req - Express request
     * @param {Object} res - Express response
     */
    async getAnalytics(req, res) {
        try {
            const { startDate, endDate } = req.query;

            const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            const end = endDate ? new Date(endDate) : new Date();

            const analytics = await Banner.getAnalytics(start, end);

            res.json({
                success: true,
                data: analytics
            });
        } catch (error) {
            console.error('Get analytics error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch analytics',
                error: error.message
            });
        }
    }
}
