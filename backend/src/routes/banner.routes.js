/**
 * @fileoverview Banner Routes
 * @description API routes for banner management with image upload support
 * @module routes/banner.routes
 * @author Enterprise E-Commerce Team
 * @version 1.0.0
 */

import express from 'express';
import { BannerController } from '../controllers/BannerController.js';
import { uploadBannerImage, handleUploadError } from '../middleware/uploadEnhanced.js';
import { auth, isAdmin } from '../middleware/auth.js';

const router = express.Router();
const bannerController = new BannerController();

/**
 * @route   GET /api/banners
 * @desc    Get all banners with pagination and filtering
 * @access  Public
 * @query   {number} page - Page number (default: 1)
 * @query   {number} limit - Items per page (default: 20)
 * @query   {string} status - Filter by status (active|inactive|scheduled)
 * @query   {string} position - Filter by position
 * @query   {string} sortBy - Sort field (default: sortOrder)
 * @query   {string} sortOrder - Sort order (asc|desc)
 */
router.get('/', bannerController.index.bind(bannerController));

/**
 * @route   GET /api/banners/active/:position
 * @desc    Get active banners for specific position
 * @access  Public
 * @param   {string} position - Banner position (home-main, home-side, category, product, checkout, custom)
 * @query   {number} limit - Maximum number of banners to return
 */
router.get('/active/:position', bannerController.getActiveByPosition.bind(bannerController));

/**
 * @route   GET /api/banners/analytics
 * @desc    Get banner analytics (click-through rates, views, clicks)
 * @access  Admin
 * @query   {string} startDate - Start date for analytics
 * @query   {string} endDate - End date for analytics
 */
router.get('/analytics', auth, isAdmin, bannerController.getAnalytics.bind(bannerController));

/**
 * @route   GET /api/banners/:id
 * @desc    Get single banner by ID
 * @access  Public
 * @param   {string} id - Banner ID
 */
router.get('/:id', bannerController.show.bind(bannerController));

/**
 * @route   POST /api/banners
 * @desc    Create new banner with image upload
 * @access  Admin
 * @body    {string} title - Banner title (required)
 * @body    {string} description - Banner description
 * @body    {file} image - Banner image file (required)
 * @body    {string} link - Click URL
 * @body    {string} linkTarget - _blank or _self
 * @body    {string} position - Display position (required)
 * @body    {number} sortOrder - Display order
 * @body    {string} status - Banner status (active|inactive|scheduled)
 * @body    {date} startDate - Start date for scheduled banners
 * @body    {date} endDate - End date for scheduled banners
 * @body    {object} metadata - Additional custom data
 */
router.post(
    '/',
    auth,
    isAdmin,
    uploadBannerImage,
    handleUploadError,
    bannerController.create.bind(bannerController)
);

/**
 * @route   PUT /api/banners/:id
 * @desc    Update existing banner (with optional new image)
 * @access  Admin
 * @param   {string} id - Banner ID
 * @body    All fields optional, same as POST
 */
router.put(
    '/:id',
    auth,
    isAdmin,
    uploadBannerImage,
    handleUploadError,
    bannerController.update.bind(bannerController)
);

/**
 * @route   DELETE /api/banners/:id
 * @desc    Delete banner and associated image
 * @access  Admin
 * @param   {string} id - Banner ID
 */
router.delete('/:id', auth, isAdmin, bannerController.destroy.bind(bannerController));

/**
 * @route   POST /api/banners/:id/view
 * @desc    Track banner view (for analytics)
 * @access  Public
 * @param   {string} id - Banner ID
 */
router.post('/:id/view', bannerController.trackView.bind(bannerController));

/**
 * @route   POST /api/banners/:id/click
 * @desc    Track banner click (for analytics)
 * @access  Public
 * @param   {string} id - Banner ID
 */
router.post('/:id/click', bannerController.trackClick.bind(bannerController));

export default router;
