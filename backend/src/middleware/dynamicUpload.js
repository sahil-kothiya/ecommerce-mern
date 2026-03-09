import multer from "multer";
import path from "path";
import { getImageSettings } from "../utils/settingsCache.js";
import { logger } from "../utils/logger.js";

/**
 * Creates a dynamic multer middleware that reads config from the DB settings cache.
 * Always uses memoryStorage so images pass through Sharp before being saved.
 *
 * @param {string} section - section name: "product", "category", "banner", "avatar", "brand", "review", "settings"
 * @param {Object} fieldConfig
 * @param {string} [fieldConfig.type] - "single", "array", "fields", "any"
 * @param {string} [fieldConfig.fieldName] - field name for single/array
 * @param {number} [fieldConfig.maxCount] - max count for array
 * @param {Array}  [fieldConfig.fields] - field definitions for .fields()
 * @returns {Function} Express middleware
 */
export function createDynamicUpload(section, fieldConfig = {}) {
  return async (req, res, next) => {
    try {
      const globalSettings = await getImageSettings();
      const sectionSettings = globalSettings.sections[section] || {};

      const upload = multer({
        storage: multer.memoryStorage(),
        limits: {
          fileSize: globalSettings.maxFileSizeBytes || 10485760,
          files: fieldConfig.type === "any" ? undefined : (sectionSettings.maxCount || 10),
        },
        fileFilter: (req2, file, cb) => {
          const ext = path
            .extname(file.originalname)
            .toLowerCase()
            .replace(".", "");

          const allowed = globalSettings.allowedInputFormats || [];
          if (allowed.length > 0 && !allowed.includes(ext)) {
            return cb(
              new Error(
                `Invalid file type "${ext}". Allowed types: ${allowed.join(", ")}`,
              ),
              false,
            );
          }

          cb(null, true);
        },
      });

      let middleware;
      switch (fieldConfig.type) {
        case "single":
          middleware = upload.single(fieldConfig.fieldName || "image");
          break;
        case "array":
          middleware = upload.array(
            fieldConfig.fieldName || "images",
            fieldConfig.maxCount || sectionSettings.maxCount || 10,
          );
          break;
        case "fields":
          middleware = upload.fields(fieldConfig.fields || []);
          break;
        case "any":
        default:
          middleware = upload.any();
          break;
      }

      middleware(req, res, (err) => {
        if (err) {
          return next(err);
        }
        next();
      });
    } catch (error) {
      logger.error("Dynamic upload middleware error", {
        error: error.message,
        section,
      });
      next(error);
    }
  };
}

/**
 * Generic upload error handler — same as the existing handleUploadError
 * but with dynamic error messages from settings.
 */
export function handleDynamicUploadError(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    const errorMessages = {
      LIMIT_FILE_SIZE: "File too large. Check allowed file size in settings.",
      LIMIT_FILE_COUNT: "Too many files uploaded",
      LIMIT_FIELD_KEY: "Field name too long",
      LIMIT_FIELD_VALUE: "Field value too long",
      LIMIT_FIELD_COUNT: "Too many fields",
      LIMIT_UNEXPECTED_FILE: "Unexpected file field",
      LIMIT_PART_COUNT: "Too many parts in multipart upload",
    };

    return res.status(400).json({
      success: false,
      message: errorMessages[err.code] || "File upload error",
      error: err.code,
    });
  }

  if (err?.message) {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }

  next(err);
}
