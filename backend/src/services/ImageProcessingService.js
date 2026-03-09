import sharp from "sharp";
import path from "path";
import fs from "fs";
import { config } from "../config/index.js";
import { logger } from "../utils/logger.js";
import {
  getImageSettings,
  getSectionSettings,
  clearImageSettingsCache,
} from "../utils/settingsCache.js";

const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

const sanitize = (name) =>
  name
    .replace(/[/\\]/g, "")
    .replace(/[^\w\s.-]/g, "")
    .replace(/\s+/g, "-")
    .toLowerCase();

class ImageProcessingService {
  /**
   * Process a single image buffer according to section settings.
   * @param {Buffer} buffer - raw image data
   * @param {string} section - e.g. "product", "category", "banner"
   * @param {Object} [opts]
   * @returns {Promise<{processedBuffer: Buffer, thumbnailBuffer: Buffer|null, format: string, width: number, height: number, size: number}>}
   */
  async processImage(buffer, section, opts = {}) {
    const globalSettings = await getImageSettings();
    const sectionSettings = await getSectionSettings(section);

    const outputFormat = opts.format || globalSettings.preferredOutputFormat || "webp";
    const quality = opts.quality || sectionSettings.quality || 85;
    const maxWidth = opts.maxWidth || sectionSettings.maxWidth || 1200;
    const maxHeight = opts.maxHeight || sectionSettings.maxHeight || 1200;

    let pipeline = sharp(buffer, { failOn: "none" });

    // Auto-rotate based on EXIF
    pipeline = pipeline.rotate();

    // Resize within bounds, never upscale
    pipeline = pipeline.resize(maxWidth, maxHeight, {
      fit: "inside",
      withoutEnlargement: true,
    });

    // Convert format
    pipeline = this.applyFormat(pipeline, outputFormat, quality);

    const processedBuffer = await pipeline.toBuffer();
    const metadata = await sharp(processedBuffer).metadata();

    // Generate thumbnail if enabled
    let thumbnailBuffer = null;
    if (globalSettings.autoGenerateThumbnail) {
      const thumbW = globalSettings.thumbnailWidth || 300;
      const thumbH = globalSettings.thumbnailHeight || 300;
      let thumbPipeline = sharp(buffer, { failOn: "none" }).rotate();
      thumbPipeline = thumbPipeline.resize(thumbW, thumbH, {
        fit: "cover",
        withoutEnlargement: true,
      });
      thumbPipeline = this.applyFormat(thumbPipeline, outputFormat, Math.min(quality, 80));
      thumbnailBuffer = await thumbPipeline.toBuffer();
    }

    return {
      processedBuffer,
      thumbnailBuffer,
      format: outputFormat,
      width: metadata.width,
      height: metadata.height,
      size: processedBuffer.length,
    };
  }

  /**
   * @param {import('sharp').Sharp} pipeline
   * @param {string} format
   * @param {number} quality
   * @returns {import('sharp').Sharp}
   */
  applyFormat(pipeline, format, quality) {
    switch (format) {
      case "webp":
        return pipeline.webp({ quality });
      case "avif":
        return pipeline.avif({ quality });
      case "png":
        return pipeline.png({ quality: Math.min(quality, 100) });
      case "jpeg":
      default:
        return pipeline.jpeg({ quality, mozjpeg: true });
    }
  }

  /**
   * Save a processed buffer to local disk.
   * @param {Buffer} buffer
   * @param {string} section - subfolder e.g. "products", "categories"
   * @param {string} originalName
   * @param {string} format
   * @param {string} [prefix]
   * @returns {string} relative path stored in DB (e.g. "products/product-name-123456.webp")
   */
  saveToDisk(buffer, section, originalName, format, prefix = "") {
    const uploadBase = config.upload.uploadPath || "uploads";
    const dir = path.join(uploadBase, section);
    ensureDir(dir);

    const ext = `.${format}`;
    const baseName = sanitize(path.basename(originalName, path.extname(originalName)));
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const filename = `${prefix}${baseName || "image"}-${uniqueSuffix}${ext}`;
    const filePath = path.join(dir, filename);

    fs.writeFileSync(filePath, buffer);
    return `${section}/${filename}`;
  }

  /**
   * Process a single multer file and save to disk.
   * @param {Object} file - multer file with .buffer, .originalname
   * @param {string} section - e.g. "product", "category"
   * @param {string} diskFolder - disk subfolder e.g. "products", "categories"
   * @param {string} [filePrefix] - filename prefix
   * @returns {Promise<{path: string, thumbnailPath: string|null, format: string, width: number, height: number, size: number}>}
   */
  async processAndSave(file, section, diskFolder, filePrefix = "") {
    const globalSettings = await getImageSettings();

    // If auto-convert is disabled, save raw file as-is
    if (!globalSettings.autoConvertEnabled) {
      const rawPath = this.saveToDisk(
        file.buffer,
        diskFolder,
        file.originalname,
        path.extname(file.originalname).replace(".", "") || "jpg",
        filePrefix,
      );
      return {
        path: rawPath,
        thumbnailPath: null,
        format: path.extname(file.originalname).replace(".", ""),
        width: 0,
        height: 0,
        size: file.buffer.length,
      };
    }

    const result = await this.processImage(file.buffer, section);

    const savedPath = this.saveToDisk(
      result.processedBuffer,
      diskFolder,
      file.originalname,
      result.format,
      filePrefix,
    );

    let thumbnailPath = null;
    if (result.thumbnailBuffer) {
      thumbnailPath = this.saveToDisk(
        result.thumbnailBuffer,
        diskFolder,
        file.originalname,
        result.format,
        `${filePrefix}thumb-`,
      );
    }

    return {
      path: savedPath,
      thumbnailPath,
      format: result.format,
      width: result.width,
      height: result.height,
      size: result.size,
    };
  }

  /**
   * Process and save many files.
   * @param {Object[]} files
   * @param {string} section
   * @param {string} diskFolder
   * @param {string} [filePrefix]
   * @returns {Promise<Array>}
   */
  async processAndSaveMany(files, section, diskFolder, filePrefix = "") {
    const results = [];
    for (const file of files) {
      const result = await this.processAndSave(file, section, diskFolder, filePrefix);
      results.push(result);
    }
    return results;
  }

  /**
   * Validate a file against current image settings.
   * @param {Object} file
   * @param {string} section
   * @returns {Promise<{valid: boolean, error: string|null}>}
   */
  async validateFile(file, _section) {
    const settings = await getImageSettings();
    const ext = path
      .extname(file.originalname)
      .toLowerCase()
      .replace(".", "");

    if (!settings.allowedInputFormats.includes(ext)) {
      return {
        valid: false,
        error: `Invalid file type "${ext}". Allowed: ${settings.allowedInputFormats.join(", ")}`,
      };
    }

    if (file.buffer && file.buffer.length > settings.maxFileSizeBytes) {
      const maxMB = (settings.maxFileSizeBytes / (1024 * 1024)).toFixed(1);
      return {
        valid: false,
        error: `File too large. Maximum size is ${maxMB}MB`,
      };
    }

    return { valid: true, error: null };
  }

  /**
   * Delete a file from disk safely.
   * @param {string} relativePath
   * @returns {Promise<boolean>}
   */
  async deleteFile(relativePath) {
    try {
      if (!relativePath) return false;
      const uploadBase = config.upload.uploadPath || "uploads";
      const absolutePath = path.join(uploadBase, relativePath);
      const uploadsDir = path.resolve(uploadBase);
      const fileDir = path.resolve(absolutePath);

      if (!fileDir.startsWith(uploadsDir)) {
        logger.error("Security: Attempted to delete file outside uploads directory");
        return false;
      }

      if (!fs.existsSync(absolutePath)) return false;
      await fs.promises.unlink(absolutePath);
      return true;
    } catch (error) {
      logger.error(`Error deleting file ${relativePath}`, {
        error: error.message,
      });
      return false;
    }
  }

  clearSettingsCache() {
    clearImageSettingsCache();
  }
}

export const imageProcessingService = new ImageProcessingService();
