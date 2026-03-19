import { Setting } from "../models/Setting.js";
import { BaseService } from "../core/BaseService.js";
import { AppError } from '../utils/AppError.js';
import { logger } from "../utils/logger.js";
import {
  clearImageSettingsCache,
  DEFAULT_IMAGE_SETTINGS,
} from "../utils/settingsCache.js";
import { imageProcessingService } from "./ImageProcessingService.js";
import { SettingRepository } from '../repositories/index.js';

const PUBLIC_FIELDS = [
  "siteName",
  "siteTagline",
  "siteUrl",
  "logo",
  "favicon",
  "websiteEmail",
  "supportEmail",
  "phone",
  "whatsapp",
  "address",
  "currencyCode",
  "currencySymbol",
  "timezone",
  "maintenanceMode",
  "metaTitle",
  "metaDescription",
  "facebook",
  "instagram",
  "twitter",
  "youtube",
];

const UPDATABLE_FIELDS = [
  "siteName",
  "siteTagline",
  "siteUrl",
  "websiteEmail",
  "supportEmail",
  "phone",
  "whatsapp",
  "address",
  "currencyCode",
  "currencySymbol",
  "timezone",
  "metaTitle",
  "metaDescription",
  "facebook",
  "instagram",
  "twitter",
  "youtube",
  "smtpHost",
  "smtpPort",
  "smtpUser",
  "smtpFrom",
  "stripePublicKey",
  "paypalClientId",
];

export class SettingService extends BaseService {
  constructor(repository = new SettingRepository()) {
    super();
    this.repository = repository;
  }

  async getOrCreate() {
    let settings = await this.repository.model.findOne({ key: "main" });
    if (!settings) {
      settings = await this.repository.model.create({ key: "main" });
    }
    return settings;
  }

  async getPublicSettings() {
    const settings = await this.getOrCreate();
    const publicData = {};
    for (const field of PUBLIC_FIELDS) {
      publicData[field] = settings[field];
    }
    return publicData;
  }

  async getAllSettings() {
    return await this.getOrCreate();
  }

  validatePayload(body) {
    const errors = [];
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    const emailFields = ["websiteEmail", "supportEmail", "smtpFrom"];
    for (const field of emailFields) {
      if (
        body[field] !== undefined &&
        body[field] &&
        !emailRegex.test(String(body[field]).trim())
      ) {
        errors.push({
          field,
          message: `${field} must be a valid email address`,
        });
      }
    }

    const urlFields = [
      "siteUrl",
      "facebook",
      "instagram",
      "twitter",
      "youtube",
    ];
    for (const field of urlFields) {
      if (body[field] !== undefined && body[field]) {
        try {
          const parsed = new URL(String(body[field]).trim());
          if (!["http:", "https:"].includes(parsed.protocol)) {
            errors.push({ field, message: `${field} must be a valid URL` });
          }
        } catch {
          errors.push({ field, message: `${field} must be a valid URL` });
        }
      }
    }

    if (
      body.siteName !== undefined &&
      String(body.siteName).trim().length < 2
    ) {
      errors.push({
        field: "siteName",
        message: "siteName must be at least 2 characters",
      });
    }

    if (body.phone !== undefined && String(body.phone).trim().length > 0) {
      if (!/^[+\d\s\-()]{7,20}$/.test(String(body.phone).trim())) {
        errors.push({
          field: "phone",
          message: "phone must be a valid phone number",
        });
      }
    }

    if (body.smtpPort !== undefined) {
      const port = Number(body.smtpPort);
      if (!Number.isInteger(port) || port < 1 || port > 65535) {
        errors.push({
          field: "smtpPort",
          message: "smtpPort must be between 1 and 65535",
        });
      }
    }

    return errors;
  }

  async updateSettings(body, files, userId) {
    const errors = this.validatePayload(body);
    if (errors.length > 0) {
      throw new AppError("Validation failed", 422, errors);
    }

    const settings = await this.getOrCreate();
    const oldLogo = settings.logo;
    const oldFavicon = settings.favicon;

    for (const field of UPDATABLE_FIELDS) {
      if (body[field] !== undefined) {
        settings[field] = body[field];
      }
    }

    if (body.maintenanceMode !== undefined) {
      const val = body.maintenanceMode;
      settings.maintenanceMode =
        val === true || val === "true" || val === "1" || val === 1;
    }

    if (files?.logo?.[0]) {
      const result = await imageProcessingService.processAndSave(
        files.logo[0],
        "settings",
        "settings",
        "logo-",
      );
      settings.logo = result.path;
    }
    if (files?.favicon?.[0]) {
      const result = await imageProcessingService.processAndSave(
        files.favicon[0],
        "settings",
        "settings",
        "favicon-",
      );
      settings.favicon = result.path;
    }
    if (body.logo === "") settings.logo = null;
    if (body.favicon === "") settings.favicon = null;

    settings.updatedBy = userId || null;
    await settings.save();

    logger.info("Settings updated", { updatedBy: userId });

    return { settings, oldLogo, oldFavicon };
  }

  async getImageSettings() {
    const settings = await this.getOrCreate();
    const img = settings.imageSettings || {};
    return {
      ...DEFAULT_IMAGE_SETTINGS,
      ...img,
      sections: {
        ...DEFAULT_IMAGE_SETTINGS.sections,
        ...(img.sections || {}),
      },
    };
  }

  async updateImageSettings(body) {
    const settings = await this.getOrCreate();

    const VALID_FORMATS = ["webp", "jpeg", "png", "avif"];
    const ALL_INPUT_FORMATS = [
      "jpg",
      "jpeg",
      "png",
      "gif",
      "webp",
      "svg",
      "bmp",
      "tiff",
      "tif",
      "avif",
      "heic",
      "heif",
      "ico",
    ];

    if (body.allowedInputFormats !== undefined) {
      const formats = Array.isArray(body.allowedInputFormats)
        ? body.allowedInputFormats
        : [];
      settings.imageSettings.allowedInputFormats = formats.filter((f) =>
        ALL_INPUT_FORMATS.includes(f),
      );
    }

    if (body.preferredOutputFormat !== undefined) {
      if (!VALID_FORMATS.includes(body.preferredOutputFormat)) {
        throw new AppError(
          `Invalid output format. Allowed: ${VALID_FORMATS.join(", ")}`,
          400,
        );
      }
      settings.imageSettings.preferredOutputFormat = body.preferredOutputFormat;
    }

    if (body.maxFileSizeBytes !== undefined) {
      const size = Number(body.maxFileSizeBytes);
      if (Number.isNaN(size) || size < 102400 || size > 104857600) {
        throw new AppError(
          "maxFileSizeBytes must be between 100KB and 100MB",
          400,
        );
      }
      settings.imageSettings.maxFileSizeBytes = size;
    }

    const boolFields = [
      "autoConvertEnabled",
      "autoGenerateThumbnail",
    ];
    for (const field of boolFields) {
      if (body[field] !== undefined) {
        const val = body[field];
        settings.imageSettings[field] =
          val === true || val === "true" || val === "1" || val === 1;
      }
    }

    const numFields = ["thumbnailWidth", "thumbnailHeight"];
    for (const field of numFields) {
      if (body[field] !== undefined) {
        const val = Number(body[field]);
        if (!Number.isNaN(val) && val >= 50 && val <= 2000) {
          settings.imageSettings[field] = val;
        }
      }
    }

    settings.markModified("imageSettings");
    await settings.save();
    clearImageSettingsCache();

    logger.info("Image settings updated (global)");
    return settings.imageSettings;
  }

  async updateImageSectionSettings(sectionName, body) {
    const VALID_SECTIONS = [
      "product",
      "category",
      "banner",
      "avatar",
      "brand",
      "review",
      "settings",
    ];
    if (!VALID_SECTIONS.includes(sectionName)) {
      throw new AppError(
        `Invalid section "${sectionName}". Valid: ${VALID_SECTIONS.join(", ")}`,
        400,
      );
    }

    const settings = await this.getOrCreate();

    if (!settings.imageSettings.sections[sectionName]) {
      settings.imageSettings.sections[sectionName] = {};
    }

    const sec = settings.imageSettings.sections[sectionName];

    if (body.maxWidth !== undefined) {
      const v = Number(body.maxWidth);
      if (!Number.isNaN(v) && v >= 100 && v <= 5000) sec.maxWidth = v;
    }
    if (body.maxHeight !== undefined) {
      const v = Number(body.maxHeight);
      if (!Number.isNaN(v) && v >= 100 && v <= 5000) sec.maxHeight = v;
    }
    if (body.quality !== undefined) {
      const v = Number(body.quality);
      if (!Number.isNaN(v) && v >= 1 && v <= 100) sec.quality = v;
    }
    if (body.maxCount !== undefined) {
      const v = Number(body.maxCount);
      if (!Number.isNaN(v) && v >= 1 && v <= 200) sec.maxCount = v;
    }
    if (body.aspectRatio !== undefined) {
      const validRatios = ["1:1", "16:9", "4:3", "16:3", "3:2", "free"];
      if (validRatios.includes(body.aspectRatio)) {
        sec.aspectRatio = body.aspectRatio;
      }
    }

    settings.markModified("imageSettings");
    await settings.save();
    clearImageSettingsCache();

    logger.info(`Image settings updated for section: ${sectionName}`);
    return sec;
  }

  async resetImageSettings() {
    const settings = await this.getOrCreate();
    settings.imageSettings = undefined;
    settings.markModified("imageSettings");
    await settings.save();
    clearImageSettingsCache();

    logger.info("Image settings reset to defaults");
    return DEFAULT_IMAGE_SETTINGS;
  }

  async getImageSectionSettings(sectionName) {
    const imgSettings = await this.getImageSettings();
    return (
      imgSettings.sections[sectionName] ||
      DEFAULT_IMAGE_SETTINGS.sections[sectionName] ||
      DEFAULT_IMAGE_SETTINGS.sections.product
    );
  }
}

export const settingService = new SettingService();
