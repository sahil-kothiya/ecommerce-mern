/**
 * @fileoverview Enhanced File Upload Middleware
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
            const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
            const ext = path.extname(file.originalname).toLowerCase();
            const baseName = sanitizeFilename(path.basename(file.originalname, ext));
            const filename = `${prefix}-${baseName || 'image'}-${uniqueSuffix}${ext}`;
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
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
    const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
    
    const allowedMimeTypes = {
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif',
        'webp': 'image/webp'
    };

    if (!allowedExtensions.includes(ext)) {
        return cb(new Error(`Invalid file type. Allowed types: ${allowedExtensions.join(', ')}`), false);
    }

    const expectedMimeType = allowedMimeTypes[ext];
    if (file.mimetype !== expectedMimeType) {
        return cb(new Error('File MIME type does not match extension'), false);
    }

    cb(null, true);
};

// ===========================
// Storage Configurations
// ===========================

const categoryStorage = createStorage('categories', 'category');
const productStorage = createStorage('products', 'product');
const brandStorage = createStorage('brands', 'brand');
const bannerStorage = createStorage('banners', 'banner');
const userStorage = createStorage('users', 'user');

// ===========================
// Multer Upload Instances
// ===========================

/**
 * Category single image upload
 * @description Handles single category photo upload (field name: 'photo')
 */
export const uploadCategoryImage = multer({
    storage: categoryStorage,
    limits: { fileSize: config.upload.maxFileSize, files: 1 },
    fileFilter: imageFileFilter
}).single('photo');

/**
 * Product multiple images upload
 * @description Handles up to 10 product images (field name: 'images')
 */
export const uploadProductImages = multer({
    storage: productStorage,
    limits: { fileSize: config.upload.maxFileSize, files: 10 },
    fileFilter: imageFileFilter
}).array('images', 10);

/**
 * Product single image upload
 * @description Handles single product image (field name: 'image')
 */
export const uploadSingleProductImage = multer({
    storage: productStorage,
    limits: { fileSize: config.upload.maxFileSize, files: 1 },
    fileFilter: imageFileFilter
}).single('image');

/**
 * Brand logo upload
 * @description Handles single brand logo (field name: 'logo')
 */
export const uploadBrandLogo = multer({
    storage: brandStorage,
    limits: { fileSize: config.upload.maxFileSize, files: 1 },
    fileFilter: imageFileFilter
}).single('logo');

/**
 * Banner image upload
 * @description Handles single banner image (field name: 'image')
 */
export const uploadBannerImage = multer({
    storage: bannerStorage,
    limits: { fileSize: config.upload.maxFileSize, files: 1 },
    fileFilter: imageFileFilter
}).single('image');

/**
 * User profile picture upload
 * @description Handles single user avatar (field name: 'avatar')
 */
export const uploadUserAvatar = multer({
    storage: userStorage,
    limits: { fileSize: 2 * 1024 * 1024, files: 1 },
    fileFilter: imageFileFilter
}).single('avatar');

/**
 * Brand multi-field upload (logo + banners)
 * @description Handles brand logo and banner images
 */
export const uploadBrandMultiField = multer({
    storage: brandStorage,
    limits: { fileSize: config.upload.maxFileSize, files: 4 },
    fileFilter: imageFileFilter
}).fields([
    { name: 'logo', maxCount: 1 },
    { name: 'banners', maxCount: 3 }
]);

/**
 * Flexible multi-field upload for products
 * @description Handles thumbnail + gallery + variant images
 */
export const uploadProductMultiField = multer({
    storage: productStorage,
    limits: { fileSize: config.upload.maxFileSize, files: 15 },
    fileFilter: imageFileFilter
}).fields([
    { name: 'thumbnail', maxCount: 1 },
    { name: 'gallery', maxCount: 10 },
    { name: 'variantImages', maxCount: 5 }
]);

// ===========================
// Error Handling Middleware
// ===========================

/**
 * Handle upload errors
 * @description Centralized error handler for file upload issues
 */
export const handleUploadError = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        const errorMessages = {
            'LIMIT_FILE_SIZE': `File too large. Maximum size is ${config.upload.maxFileSize / 1024 / 1024}MB`,
            'LIMIT_FILE_COUNT': 'Too many files uploaded',
            'LIMIT_FIELD_KEY': 'Field name too long',
            'LIMIT_FIELD_VALUE': 'Field value too long',
            'LIMIT_FIELD_COUNT': 'Too many fields',
            'LIMIT_UNEXPECTED_FILE': 'Unexpected file field',
            'LIMIT_PART_COUNT': 'Too many parts in multipart upload'
        };

        return res.status(400).json({
            success: false,
            message: errorMessages[err.code] || 'File upload error',
            error: err.code
        });
    }

    if (err && err.message) {
        return res.status(400).json({
            success: false,
            message: err.message
        });
    }

    next(err);
};

// ===========================
// Utility Functions
// ===========================

/**
 * Delete uploaded file safely
 * @param {string} filePath - Relative path to file
 * @returns {Promise<boolean>} True if deleted successfully
 */
export const deleteUploadedFile = async (filePath) => {
    try {
        if (!filePath) return false;

        const absolutePath = path.join(config.upload.uploadPath, filePath);
        const uploadsDir = path.resolve(config.upload.uploadPath);
        const fileDir = path.resolve(absolutePath);
        
        if (!fileDir.startsWith(uploadsDir)) {
            console.error('Security: Attempted to delete file outside uploads directory');
            return false;
        }

        if (!fs.existsSync(absolutePath)) return false;

        await fs.promises.unlink(absolutePath);
        return true;
    } catch (error) {
        console.error(`Error deleting file ${filePath}:`, error);
        return false;
    }
};

/**
 * Delete multiple uploaded files
 * @param {Array<string>} filePaths - Array of file paths
 * @returns {Promise<Object>} Result object
 */
export const deleteUploadedFiles = async (filePaths) => {
    if (!Array.isArray(filePaths)) return { success: 0, failed: 0 };

    const results = await Promise.allSettled(
        filePaths.map(filePath => deleteUploadedFile(filePath))
    );

    const success = results.filter(r => r.status === 'fulfilled' && r.value === true).length;
    return { success, failed: results.length - success, total: results.length };
};

/**
 * Get file public URL
 * @param {string} filePath - Relative file path
 * @param {Object} req - Express request object
 * @returns {string|null} Public URL
 */
export const getFileUrl = (filePath, req = null) => {
    if (!filePath) return null;
    if (filePath.startsWith('http')) return filePath;

    const baseUrl = req 
        ? `${req.protocol}://${req.get('host')}`
        : config.app?.baseUrl || 'http://localhost:5000';

    return `${baseUrl}/uploads/${filePath}`;
};
