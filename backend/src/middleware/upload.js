import multer from "multer";
import path from "path";
import fs from "fs";
import { config } from "../config/index.js";
import { logger } from "../utils/logger.js";

const ensureUploadDir = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

const sanitizeFilename = (filename) => {
  return filename
    .replace(/[\/\\]/g, "")
    .replace(/[^\w\s.-]/g, "")
    .replace(/\s+/g, "-")
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
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      const ext = path.extname(file.originalname).toLowerCase();
      const baseName = sanitizeFilename(path.basename(file.originalname, ext));
      const filename = `${prefix}-${baseName}-${uniqueSuffix}${ext}`;
      cb(null, filename);
    },
  });
};

const imageFileFilter = (req, file, cb) => {
  const allowedExtensions = ["jpg", "jpeg", "png", "gif", "webp"];
  const ext = path.extname(file.originalname).toLowerCase().replace(".", "");

  const allowedMimeTypes = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
  };

  if (!allowedExtensions.includes(ext)) {
    return cb(
      new Error(
        `Invalid file type. Allowed types: ${allowedExtensions.join(", ")}`,
      ),
      false,
    );
  }

  const expectedMimeType = allowedMimeTypes[ext];
  if (file.mimetype !== expectedMimeType) {
    return cb(new Error("File MIME type does not match extension"), false);
  }

  cb(null, true);
};

const categoryStorage = createStorage("categories", "category");

const productStorage = createStorage("products", "product");

const brandStorage = createStorage("brands", "brand");

const bannerStorage = createStorage("banners", "banner");

const userStorage = createStorage("users", "user");

export const uploadCategoryImage = multer({
  storage: categoryStorage,
  limits: {
    fileSize: config.upload.maxFileSize,
  },
  fileFilter: imageFileFilter,
}).single("photo");

export const uploadProductImages = multer({
  storage: productStorage,
  limits: {
    fileSize: config.upload.maxFileSize,
  },
  fileFilter: imageFileFilter,
}).array("images", 10);

export const uploadSingleProductImage = multer({
  storage: productStorage,
  limits: {
    fileSize: config.upload.maxFileSize,
  },
  fileFilter: imageFileFilter,
}).single("image");

export const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        message: `File too large. Maximum size is ${config.upload.maxFileSize / 1024 / 1024}MB`,
      });
    }
    if (err.code === "LIMIT_FILE_COUNT") {
      return res.status(400).json({
        success: false,
        message: "Too many files uploaded",
      });
    }
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  } else if (err) {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
  next();
};

export const deleteFile = (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  } catch (error) {
    logger.error("Error deleting file", { error: error.message });
    return false;
  }
};
