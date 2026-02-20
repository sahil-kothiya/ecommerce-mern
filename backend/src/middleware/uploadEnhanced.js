

import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { config } from '../config/index.js';

const ensureUploadDir = (dir) => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
};

const sanitizeFilename = (filename) => {
    return filename
        .replace(/[\/\\]/g, '')
        .replace(/[^\w\s.-]/g, '')
        .replace(/\s+/g, '-')
        .toLowerCase();
};

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

const categoryStorage = createStorage('categories', 'category');
const productStorage = createStorage('products', 'product');
const brandStorage = createStorage('brands', 'brand');
const bannerStorage = createStorage('banners', 'banner');
const userStorage = createStorage('users', 'user');
const settingsStorage = createStorage('settings', 'setting');

export const uploadCategoryImage = multer({
    storage: categoryStorage,
    limits: { fileSize: config.upload.maxFileSize, files: 1 },
    fileFilter: imageFileFilter
}).single('photo');

export const uploadProductImages = multer({
    storage: productStorage,
    limits: { fileSize: config.upload.maxFileSize, files: 10 },
    fileFilter: imageFileFilter
}).array('images', 10);

export const uploadSingleProductImage = multer({
    storage: productStorage,
    limits: { fileSize: config.upload.maxFileSize, files: 1 },
    fileFilter: imageFileFilter
}).single('image');

export const uploadBrandLogo = multer({
    storage: brandStorage,
    limits: { fileSize: config.upload.maxFileSize, files: 1 },
    fileFilter: imageFileFilter
}).single('logo');

export const uploadBannerImage = multer({
    storage: bannerStorage,
    limits: { fileSize: config.upload.maxFileSize, files: 1 },
    fileFilter: imageFileFilter
}).single('image');

export const uploadUserAvatar = multer({
    storage: userStorage,
    limits: { fileSize: 2 * 1024 * 1024, files: 1 },
    fileFilter: imageFileFilter
}).single('avatar');

export const uploadSettingsAssets = multer({
    storage: settingsStorage,
    limits: { fileSize: config.upload.maxFileSize, files: 2 },
    fileFilter: imageFileFilter
}).fields([
    { name: 'logo', maxCount: 1 },
    { name: 'favicon', maxCount: 1 }
]);

export const uploadBrandMultiField = multer({
    storage: brandStorage,
    limits: { fileSize: config.upload.maxFileSize, files: 4 },
    fileFilter: imageFileFilter
}).fields([
    { name: 'logo', maxCount: 1 },
    { name: 'banners', maxCount: 3 }
]);

export const uploadProductMultiField = multer({
    storage: productStorage,
    limits: { fileSize: config.upload.maxFileSize, files: 15 },
    fileFilter: imageFileFilter
}).fields([
    { name: 'thumbnail', maxCount: 1 },
    { name: 'gallery', maxCount: 10 },
    { name: 'variantImages', maxCount: 5 }
]);

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

export const deleteUploadedFiles = async (filePaths) => {
    if (!Array.isArray(filePaths)) return { success: 0, failed: 0 };

    const results = await Promise.allSettled(
        filePaths.map(filePath => deleteUploadedFile(filePath))
    );

    const success = results.filter(r => r.status === 'fulfilled' && r.value === true).length;
    return { success, failed: results.length - success, total: results.length };
};

export const getFileUrl = (filePath, req = null) => {
    if (!filePath) return null;
    if (filePath.startsWith('http')) return filePath;

    const baseUrl = req 
        ? `${req.protocol}://${req.get('host')}`
        : config.app?.baseUrl || 'http://localhost:5000';

    return `${baseUrl}/uploads/${filePath}`;
};
