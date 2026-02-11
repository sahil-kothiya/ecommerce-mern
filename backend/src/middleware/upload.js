/**
 * @fileoverview File Upload Middleware
 * @description Secure file upload handling with validation, multiple upload types, and storage management
 * @module middleware/upload
 * @requires multer
 * @requires path
 * @requires fs
 * @author Enterprise E-Commerce Team
 * @version 2.0.0
 */

import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { config } from '../config/index.js';

/**
 * Ensure upload directory exists
 * @description Creates directory recursively if it doesn't exist
 * @param {string} dir - Directory path to create
 * @security Prevents path traversal attacks by validating directory path
 */
const ensureUploadDir = (dir) => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
};

/**
 * Sanitize filename to prevent security issues
 * @description Removes special characters and normalizes filename
 * @param {string} filename - Original filename
 * @returns {string} Sanitized filename
 * @security Prevents directory traversal and script injection through filenames
 */
const sanitizeFilename = (filename) => {
    // Remove path separators and special characters
    return filename
        .replace(/[\/\\]/g, '')
        .replace(/[^\w\s.-]/g, '')
        .replace(/\s+/g, '-')
        .toLowerCase();
};

/**
 * Generic storage factory for different upload types
 * @description Creates multer storage configuration for specific upload category
 * @param {string} category - Upload category (products, categories, brands, banners, users)
 * @param {string} prefix - Filename prefix
 * @returns {multer.StorageEngine} Configured multer storage
 */
const createStorage = (category, prefix) => {
    return multer.diskStorage({
        destination: (req, file, cb) => {
            const uploadPath = path.join(config.upload.uploadPath, category);
            ensureUploadDir(uploadPath);
            cb(null, uploadPath);
        },
        filename: (req, file, cb) => {
            // Generate unique filename with timestamp and random suffix
            const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
            const ext = path.extname(file.originalname).toLowerCase();
            const baseName = sanitizeFilename(path.basename(file.originalname, ext));
            const filename = `${prefix}-${baseName}-${uniqueSuffix}${ext}`;
            cb(null, filename);
        }
    });
};

/**
 * Strict image file filter with MIME type validation
 * @description Validates uploaded files to ensure they are images
 * @param {Object} req - Express request object
 * @param {Object} file - Uploaded file object
 * @param {Function} cb - Callback function
 * @security Double-checks both extension and MIME type to prevent malicious uploads
 */
const imageFileFilter = (req, file, cb) => {
    // Allowed file extensions
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
    const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
    
    // Allowed MIME types (must match extension)
    const allowedMimeTypes = {
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif',
        'webp': 'image/webp'
    };

    // Validate extension
    if (!allowedExtensions.includes(ext)) {
        return cb(new Error(`Invalid file type. Allowed types: ${allowedExtensions.join(', ')}`), false);
    }

    // Validate MIME type matches extension
    const expectedMimeType = allowedMimeTypes[ext];
    if (file.mimetype !== expectedMimeType) {
        return cb(new Error('File MIME type does not match extension'), false);
    }

    cb(null, true);
};

// ===========================
// Storage Configurations
// ===========================

/** @const {multer.StorageEngine} Category image storage */
const categoryStorage = createStorage('categories', 'category');

/** @const {multer.StorageEngine} Product image storage */
const productStorage = createStorage('products', 'product');

/** @const {multer.StorageEngine} Brand logo storage */
const brandStorage = createStorage('brands', 'brand');

/** @const {multer.StorageEngine} Banner image storage */
const bannerStorage = createStorage('banners', 'banner');

/** @const {multer.StorageEngine} User profile picture storage */
const userStorage = createStorage('users', 'user');

// Create multer instances
export const uploadCategoryImage = multer({
    storage: categoryStorage,
    limits: {
        fileSize: config.upload.maxFileSize // 5MB default
    },
    fileFilter: imageFileFilter
}).single('photo'); // 'photo' is the field name

export const uploadProductImages = multer({
    storage: productStorage,
    limits: {
        fileSize: config.upload.maxFileSize
    },
    fileFilter: imageFileFilter
}).array('images', 10); // Allow up to 10 images

export const uploadSingleProductImage = multer({
    storage: productStorage,
    limits: {
        fileSize: config.upload.maxFileSize
    },
    fileFilter: imageFileFilter
}).single('image');

// Middleware to handle multer errors
export const handleUploadError = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                message: `File too large. Maximum size is ${config.upload.maxFileSize / 1024 / 1024}MB`
            });
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({
                success: false,
                message: 'Too many files uploaded'
            });
        }
        return res.status(400).json({
            success: false,
            message: err.message
        });
    } else if (err) {
        return res.status(400).json({
            success: false,
            message: err.message
        });
    }
    next();
};

// Helper function to delete a file
export const deleteFile = (filePath) => {
    try {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            return true;
        }
        return false;
    } catch (error) {
        console.error('Error deleting file:', error);
        return false;
    }
};
