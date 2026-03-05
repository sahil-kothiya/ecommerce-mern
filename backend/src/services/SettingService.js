import { Setting } from "../models/Setting.js";
import { BaseService } from "../core/BaseService.js";
import { AppError } from "../middleware/errorHandler.js";
import { logger } from "../utils/logger.js";

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
  constructor() {
    super(Setting);
  }

  async getOrCreate() {
    let settings = await this.model.findOne({ key: "main" });
    if (!settings) {
      settings = await this.model.create({ key: "main" });
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
      settings.logo = `settings/${files.logo[0].filename}`;
    }
    if (files?.favicon?.[0]) {
      settings.favicon = `settings/${files.favicon[0].filename}`;
    }
    if (body.logo === "") settings.logo = null;
    if (body.favicon === "") settings.favicon = null;

    settings.updatedBy = userId || null;
    await settings.save();

    logger.info("Settings updated", { updatedBy: userId });

    return { settings, oldLogo, oldFavicon };
  }
}

export const settingService = new SettingService();
