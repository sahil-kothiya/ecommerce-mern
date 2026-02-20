import mongoose from 'mongoose';
import { Discount } from '../models/Supporting.models.js';
import { Category } from '../models/Category.js';
import { Product } from '../models/Product.js';
import { AppError } from '../middleware/errorHandler.js';

export class DiscountController {
    createFieldError(field, message) {
        return { field, message };
    }

    sendValidationError(next, errors) {
        return next(new AppError(errors[0]?.message || 'Validation failed', 400, errors));
    }

    normalizeType(value) {
        if (value === 'amount') return 'fixed';
        return value;
    }

    parseBoolean(value, fallback = false) {
        if (typeof value === 'boolean') return value;
        if (typeof value === 'string') {
            const normalized = value.trim().toLowerCase();
            if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
            if (['false', '0', 'no', 'off', ''].includes(normalized)) return false;
        }
        if (typeof value === 'number') return value === 1;
        return fallback;
    }

    parseObjectIdArray(value) {
        if (value === undefined || value === null || value === '') return [];

        let parsed = value;
        if (typeof value === 'string') {
            const trimmed = value.trim();
            if (!trimmed) return [];

            if (trimmed.startsWith('[')) {
                try {
                    parsed = JSON.parse(trimmed);
                } catch {
                    parsed = trimmed.split(',').map((item) => item.trim());
                }
            } else {
                parsed = trimmed.split(',').map((item) => item.trim());
            }
        }

        if (!Array.isArray(parsed)) parsed = [parsed];

        return [...new Set(
            parsed
                .map((item) => String(item).trim())
                .filter((item) => mongoose.Types.ObjectId.isValid(item))
        )];
    }

    parseNumber(value, fallback = null) {
        if (value === undefined || value === null || value === '') return fallback;
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : fallback;
    }

    validatePayload(payload, isPartial = false) {
        const errors = [];

        if (!isPartial || payload.title !== undefined) {
            if (!payload.title || !String(payload.title).trim()) {
                errors.push(this.createFieldError('title', 'Title is required'));
            }
        }

        if (!isPartial || payload.type !== undefined) {
            if (!['percentage', 'fixed'].includes(payload.type)) {
                errors.push(this.createFieldError('type', 'Discount type must be percentage or fixed'));
            }
        }

        if (!isPartial || payload.value !== undefined || payload.type !== undefined) {
            if (payload.value === null || payload.value === undefined || Number.isNaN(payload.value)) {
                errors.push(this.createFieldError('value', 'Discount value is required'));
            } else if (payload.type === 'percentage') {
                if (!Number.isInteger(payload.value)) {
                    errors.push(this.createFieldError('value', 'Percentage value must be an integer'));
                }
                if (payload.value < 1 || payload.value > 100) {
                    errors.push(this.createFieldError('value', 'Percentage value must be between 1 and 100'));
                }
            } else if (payload.type === 'fixed' && payload.value <= 0) {
                errors.push(this.createFieldError('value', 'Fixed amount must be greater than 0'));
            }
        }

        if (!isPartial || payload.startsAt !== undefined || payload.endsAt !== undefined) {
            if (!payload.startsAt || Number.isNaN(payload.startsAt.getTime())) {
                errors.push(this.createFieldError('startsAt', 'Start date is required and must be valid'));
            }

            if (!payload.endsAt || Number.isNaN(payload.endsAt.getTime())) {
                errors.push(this.createFieldError('endsAt', 'End date is required and must be valid'));
            }

            if (
                payload.startsAt instanceof Date
                && payload.endsAt instanceof Date
                && !Number.isNaN(payload.startsAt.getTime())
                && !Number.isNaN(payload.endsAt.getTime())
                && payload.startsAt >= payload.endsAt
            ) {
                errors.push(this.createFieldError('endsAt', 'End date must be later than start date'));
            }
        }

        if (!isPartial || payload.categories !== undefined || payload.products !== undefined) {
            const hasCategories = Array.isArray(payload.categories) && payload.categories.length > 0;
            const hasProducts = Array.isArray(payload.products) && payload.products.length > 0;
            if (!hasCategories && !hasProducts) {
                const message = 'Select at least one category or product';
                errors.push(this.createFieldError('categories', message));
                errors.push(this.createFieldError('products', message));
            }
        }

        return errors;
    }

    async validateReferencedDocuments(payload) {
        const errors = [];

        if (Array.isArray(payload.categories) && payload.categories.length > 0) {
            const categoryCount = await Category.countDocuments({
                _id: { $in: payload.categories },
                status: 'active',
            });

            if (categoryCount !== payload.categories.length) {
                errors.push(this.createFieldError('categories', 'One or more selected categories are invalid or inactive'));
            }
        }

        if (Array.isArray(payload.products) && payload.products.length > 0) {
            const productCount = await Product.countDocuments({
                _id: { $in: payload.products },
                status: 'active',
            });

            if (productCount !== payload.products.length) {
                errors.push(this.createFieldError('products', 'One or more selected products are invalid or inactive'));
            }
        }

        return errors;
    }

    async index(req, res, next) {
        try {
            const now = new Date();

                        await Discount.updateMany(
                {
                    isActive: true,
                    endsAt: { $lt: now },
                },
                {
                    $set: { isActive: false },
                }
            );

            const page = Math.max(1, Number(req.query.page) || 1);
            const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 20));
            const skip = (page - 1) * limit;

            const query = {};
            if (req.query.type) query.type = this.normalizeType(req.query.type);
            if (req.query.isActive !== undefined) query.isActive = this.parseBoolean(req.query.isActive, true);
            if (req.query.search) query.title = { $regex: req.query.search, $options: 'i' };

            const [discounts, total] = await Promise.all([
                Discount.find(query)
                    .populate('categories', '_id title slug')
                    .populate('products', '_id title slug status')
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(limit)
                    .lean(),
                Discount.countDocuments(query),
            ]);

            res.json({
                success: true,
                data: {
                    discounts,
                    pagination: {
                        page,
                        limit,
                        total,
                        pages: Math.ceil(total / limit),
                    },
                },
            });
        } catch (error) {
            console.error('Discount index error:', error);
            next(new AppError('Failed to fetch discounts', 500));
        }
    }

    async getFormOptions(req, res, next) {
        try {
            const [categories, products] = await Promise.all([
                Category.find({ status: 'active' }).select('_id title slug').sort({ title: 1 }).lean(),
                Product.find({ status: 'active' }).select('_id title slug baseSku status').sort({ title: 1, createdAt: -1 }).lean(),
            ]);

            res.json({
                success: true,
                data: {
                    categories,
                    products,
                },
            });
        } catch (error) {
            console.error('Discount form options error:', error);
            next(new AppError('Failed to fetch form options', 500));
        }
    }

    async show(req, res, next) {
        try {
            const { id } = req.params;
            if (!mongoose.Types.ObjectId.isValid(id)) {
                return next(new AppError('Invalid discount ID', 400));
            }

            const discount = await Discount.findById(id)
                .populate('categories', '_id title slug')
                .populate('products', '_id title slug status');

            if (!discount) {
                return next(new AppError('Discount not found', 404));
            }

            return res.json({ success: true, data: discount });
        } catch (error) {
            console.error('Discount show error:', error);
            return next(new AppError('Failed to fetch discount', 500));
        }
    }

    async create(req, res, next) {
        try {
            const payload = {
                title: req.body.title?.trim(),
                type: this.normalizeType(req.body.type),
                value: this.parseNumber(req.body.value),
                startsAt: req.body.startsAt ? new Date(req.body.startsAt) : null,
                endsAt: req.body.endsAt ? new Date(req.body.endsAt) : null,
                isActive: this.parseBoolean(req.body.isActive, true),
                categories: this.parseObjectIdArray(req.body.categories),
                products: this.parseObjectIdArray(req.body.products),
                priority: Number.isInteger(this.parseNumber(req.body.priority)) ? this.parseNumber(req.body.priority) : 0,
            };

            const errors = this.validatePayload(payload, false);
            if (errors.length > 0) {
                return this.sendValidationError(next, errors);
            }

            const referenceErrors = await this.validateReferencedDocuments(payload);
            if (referenceErrors.length > 0) {
                return this.sendValidationError(next, referenceErrors);
            }

            const created = await Discount.create(payload);
            const populated = await Discount.findById(created._id)
                .populate('categories', '_id title slug')
                .populate('products', '_id title slug status');

            return res.status(201).json({ success: true, message: 'Discount created successfully', data: populated });
        } catch (error) {
            console.error('Discount create error:', error);
            return next(new AppError(error.message || 'Failed to create discount', 500));
        }
    }

    async update(req, res, next) {
        try {
            const { id } = req.params;
            if (!mongoose.Types.ObjectId.isValid(id)) {
                return next(new AppError('Invalid discount ID', 400));
            }

            const existing = await Discount.findById(id);
            if (!existing) {
                return next(new AppError('Discount not found', 404));
            }

            const value = req.body.value !== undefined ? this.parseNumber(req.body.value) : existing.value;
            const type = this.normalizeType(req.body.type ?? existing.type);

            const payload = {
                title: req.body.title !== undefined ? req.body.title?.trim() : existing.title,
                type,
                value,
                startsAt: req.body.startsAt !== undefined ? new Date(req.body.startsAt) : existing.startsAt,
                endsAt: req.body.endsAt !== undefined ? new Date(req.body.endsAt) : existing.endsAt,
                isActive: req.body.isActive !== undefined ? this.parseBoolean(req.body.isActive, true) : existing.isActive,
                categories: req.body.categories !== undefined ? this.parseObjectIdArray(req.body.categories) : existing.categories.map((v) => String(v)),
                products: req.body.products !== undefined ? this.parseObjectIdArray(req.body.products) : existing.products.map((v) => String(v)),
                priority: req.body.priority !== undefined ? (Number.isInteger(this.parseNumber(req.body.priority)) ? this.parseNumber(req.body.priority) : 0) : existing.priority,
            };

            const errors = this.validatePayload(payload, false);
            if (errors.length > 0) {
                return this.sendValidationError(next, errors);
            }

            const referenceErrors = await this.validateReferencedDocuments(payload);
            if (referenceErrors.length > 0) {
                return this.sendValidationError(next, referenceErrors);
            }

            Object.assign(existing, payload);
            await existing.save();

            const updated = await Discount.findById(existing._id)
                .populate('categories', '_id title slug')
                .populate('products', '_id title slug status');

            return res.json({ success: true, message: 'Discount updated successfully', data: updated });
        } catch (error) {
            console.error('Discount update error:', error);
            return next(new AppError(error.message || 'Failed to update discount', 500));
        }
    }

    async destroy(req, res, next) {
        try {
            const { id } = req.params;
            if (!mongoose.Types.ObjectId.isValid(id)) {
                return next(new AppError('Invalid discount ID', 400));
            }

            const discount = await Discount.findById(id);
            if (!discount) {
                return next(new AppError('Discount not found', 404));
            }

            await discount.deleteOne();
            return res.json({ success: true, message: 'Discount deleted successfully' });
        } catch (error) {
            console.error('Discount delete error:', error);
            return next(new AppError('Failed to delete discount', 500));
        }
    }
}

export const discountController = new DiscountController();
