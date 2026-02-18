import { Setting } from '../models/Setting.js';
import { AppError } from '../middleware/errorHandler.js';
import { deleteUploadedFile } from '../middleware/uploadEnhanced.js';

export class SettingController {
    isValidEmail(value) {
        if (!value) return true;
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim());
    }

    isValidUrl(value) {
        if (!value) return true;
        try {
            const parsed = new URL(String(value).trim());
            return ['http:', 'https:'].includes(parsed.protocol);
        } catch {
            return false;
        }
    }

    normalizeBoolean(value, fallback = false) {
        if (typeof value === 'boolean') return value;
        if (typeof value === 'string') {
            const normalized = value.trim().toLowerCase();
            if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
            if (['false', '0', 'no', 'off', ''].includes(normalized)) return false;
        }
        if (typeof value === 'number') return value === 1;
        return fallback;
    }

    async getOrCreateSettings() {
        let settings = await Setting.findOne({ key: 'main' });
        if (!settings) {
            settings = await Setting.create({ key: 'main' });
        }
        return settings;
    }

    validateUpdatePayload(body) {
        const errors = [];
        const emailFields = ['websiteEmail', 'supportEmail', 'smtpFrom'];
        const urlFields = ['siteUrl', 'facebook', 'instagram', 'twitter', 'youtube'];

        emailFields.forEach((field) => {
            if (body[field] !== undefined && !this.isValidEmail(body[field])) {
                errors.push({ field, message: `${field} must be a valid email address` });
            }
        });

        urlFields.forEach((field) => {
            if (body[field] !== undefined && !this.isValidUrl(body[field])) {
                errors.push({ field, message: `${field} must be a valid URL` });
            }
        });

        if (body.siteName !== undefined && String(body.siteName).trim().length < 2) {
            errors.push({ field: 'siteName', message: 'siteName must be at least 2 characters' });
        }

        if (body.phone !== undefined && String(body.phone).trim().length > 0) {
            const phoneValue = String(body.phone).trim();
            if (!/^[+\d\s\-()]{7,20}$/.test(phoneValue)) {
                errors.push({ field: 'phone', message: 'phone must be a valid mobile/phone number' });
            }
        }

        if (body.smtpPort !== undefined) {
            const smtpPort = Number(body.smtpPort);
            if (!Number.isInteger(smtpPort) || smtpPort < 1 || smtpPort > 65535) {
                errors.push({ field: 'smtpPort', message: 'smtpPort must be an integer between 1 and 65535' });
            }
        }

        return errors;
    }

    async index(req, res, next) {
        try {
            const settings = await this.getOrCreateSettings();
            res.json({ success: true, data: settings });
        } catch (error) {
            next(new AppError('Failed to fetch settings', 500));
        }
    }

    async publicSettings(req, res, next) {
        try {
            const settings = await this.getOrCreateSettings();
            res.json({
                success: true,
                data: {
                    siteName: settings.siteName,
                    siteTagline: settings.siteTagline,
                    siteUrl: settings.siteUrl,
                    logo: settings.logo,
                    favicon: settings.favicon,
                    websiteEmail: settings.websiteEmail,
                    supportEmail: settings.supportEmail,
                    phone: settings.phone,
                    whatsapp: settings.whatsapp,
                    address: settings.address,
                    currencyCode: settings.currencyCode,
                    currencySymbol: settings.currencySymbol,
                    timezone: settings.timezone,
                    maintenanceMode: settings.maintenanceMode,
                    metaTitle: settings.metaTitle,
                    metaDescription: settings.metaDescription,
                    facebook: settings.facebook,
                    instagram: settings.instagram,
                    twitter: settings.twitter,
                    youtube: settings.youtube,
                },
            });
        } catch (error) {
            next(new AppError('Failed to fetch public settings', 500));
        }
    }

    async update(req, res, next) {
        try {
            const settings = await this.getOrCreateSettings();
            const validationErrors = this.validateUpdatePayload(req.body || {});
            if (validationErrors.length > 0) {
                return next(new AppError('Validation failed', 422, validationErrors));
            }

            const oldLogo = settings.logo;
            const oldFavicon = settings.favicon;

            const fields = [
                'siteName', 'siteTagline', 'siteUrl',
                'websiteEmail', 'supportEmail', 'phone', 'whatsapp', 'address',
                'currencyCode', 'currencySymbol', 'timezone',
                'metaTitle', 'metaDescription',
                'facebook', 'instagram', 'twitter', 'youtube',
                'smtpHost', 'smtpPort', 'smtpUser', 'smtpPassword', 'smtpFrom',
                'stripePublicKey', 'stripeSecretKey', 'paypalClientId', 'paypalClientSecret',
            ];

            fields.forEach((field) => {
                if (req.body[field] !== undefined) {
                    settings[field] = req.body[field];
                }
            });

            if (req.body.maintenanceMode !== undefined) {
                settings.maintenanceMode = this.normalizeBoolean(req.body.maintenanceMode, settings.maintenanceMode);
            }

            if (req.files?.logo?.[0]) {
                settings.logo = `settings/${req.files.logo[0].filename}`;
            }

            if (req.files?.favicon?.[0]) {
                settings.favicon = `settings/${req.files.favicon[0].filename}`;
            }

            if (req.body.logo === '') settings.logo = null;
            if (req.body.favicon === '') settings.favicon = null;

            settings.updatedBy = req.user?._id || null;
            await settings.save();

            if (oldLogo && oldLogo !== settings.logo) await deleteUploadedFile(oldLogo);
            if (oldFavicon && oldFavicon !== settings.favicon) await deleteUploadedFile(oldFavicon);

            res.json({ success: true, message: 'Settings updated successfully', data: settings });
        } catch (error) {
            next(new AppError('Failed to update settings', 500));
        }
    }
}

export const settingController = new SettingController();
