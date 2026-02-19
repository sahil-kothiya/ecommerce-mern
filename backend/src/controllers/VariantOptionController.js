import mongoose from 'mongoose';
import { VariantType, VariantOption } from '../models/Supporting.models.js';
import { AppError } from '../middleware/errorHandler.js';

const VALID_STATUS = ['active', 'inactive'];

export class VariantOptionController {
    normalizeStatus(status, fallback = 'active') {
        const value = String(status ?? fallback).trim().toLowerCase();
        return VALID_STATUS.includes(value) ? value : fallback;
    }

    normalizeValue(value = '') {
        return String(value).trim().toLowerCase();
    }

    normalizeDisplayValue(displayValue = '') {
        return String(displayValue).trim();
    }

    normalizeSortOrder(sortOrder) {
        const parsed = Number(sortOrder);
        if (!Number.isFinite(parsed) || parsed < 0) return 0;
        return Math.floor(parsed);
    }

    normalizeHexColor(hexColor) {
        const value = String(hexColor || '').trim();
        if (!value) return null;
        return value.toUpperCase();
    }

    async index(req, res, next) {
        try {
            const page = Math.max(1, Number(req.query.page) || 1);
            const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 20));
            const skip = (page - 1) * limit;
            const search = String(req.query.search || '').trim();
            const status = this.normalizeStatus(req.query.status || 'all', 'all');
            const variantTypeId = String(req.query.variantTypeId || req.query.variantType || '').trim();

            const query = {};
            if (variantTypeId && mongoose.Types.ObjectId.isValid(variantTypeId)) {
                query.variantTypeId = new mongoose.Types.ObjectId(variantTypeId);
            }
            if (status !== 'all') query.status = status;
            if (search) {
                query.$or = [
                    { value: { $regex: search, $options: 'i' } },
                    { displayValue: { $regex: search, $options: 'i' } },
                ];
            }

            const [items, total] = await Promise.all([
                VariantOption.find(query)
                    .populate('variantTypeId', 'name displayName status')
                    .sort({ sortOrder: 1, displayValue: 1 })
                    .skip(skip)
                    .limit(limit)
                    .lean(),
                VariantOption.countDocuments(query),
            ]);

            res.json({
                success: true,
                data: {
                    items,
                    pagination: {
                        page,
                        limit,
                        total,
                        pages: Math.ceil(total / limit),
                        hasPrev: page > 1,
                        hasNext: page * limit < total,
                    },
                },
            });
        } catch (error) {
            next(new AppError('Failed to fetch variant options', 500));
        }
    }

    async show(req, res, next) {
        try {
            const { id } = req.params;
            if (!mongoose.Types.ObjectId.isValid(id)) {
                return next(new AppError('Invalid variant option ID', 400));
            }

            const item = await VariantOption.findById(id)
                .populate('variantTypeId', 'name displayName status')
                .lean();
            if (!item) return next(new AppError('Variant option not found', 404));

            res.json({ success: true, data: item });
        } catch (error) {
            next(new AppError('Failed to fetch variant option', 500));
        }
    }

    async create(req, res, next) {
        try {
            const variantTypeId = String(req.body.variantTypeId || req.body.variantType || '').trim();
            const value = this.normalizeValue(req.body.value);
            const displayValue = this.normalizeDisplayValue(req.body.displayValue || req.body.title);
            const hexColor = this.normalizeHexColor(req.body.hexColor);
            const sortOrder = this.normalizeSortOrder(req.body.sortOrder ?? req.body.position);
            const status = this.normalizeStatus(req.body.status);

            const errors = [];
            if (!variantTypeId || !mongoose.Types.ObjectId.isValid(variantTypeId)) {
                errors.push({ field: 'variantTypeId', message: 'Variant type is required' });
            }
            if (!value || value.length < 1) errors.push({ field: 'value', message: 'Value is required' });
            if (!displayValue || displayValue.length < 1) errors.push({ field: 'displayValue', message: 'Display value is required' });
            if (!/^[a-z0-9-_\s]+$/.test(value)) errors.push({ field: 'value', message: 'Value can contain lowercase letters, numbers, spaces, dashes, and underscores only' });
            if (hexColor && !/^#[0-9A-F]{6}$/i.test(hexColor)) errors.push({ field: 'hexColor', message: 'Hex color must be in format #RRGGBB' });
            if (!VALID_STATUS.includes(status)) errors.push({ field: 'status', message: 'Status must be active or inactive' });

            if (variantTypeId && mongoose.Types.ObjectId.isValid(variantTypeId)) {
                const type = await VariantType.findById(variantTypeId).lean();
                if (!type) errors.push({ field: 'variantTypeId', message: 'Selected variant type does not exist' });
            }

            if (variantTypeId && mongoose.Types.ObjectId.isValid(variantTypeId) && value) {
                const exists = await VariantOption.findOne({
                    variantTypeId: new mongoose.Types.ObjectId(variantTypeId),
                    value,
                }).lean();
                if (exists) errors.push({ field: 'value', message: 'Option already exists for this variant type' });
            }

            if (errors.length > 0) return next(new AppError('Validation failed', 422, errors));

            const item = await VariantOption.create({
                variantTypeId,
                value,
                displayValue,
                hexColor,
                sortOrder,
                status,
            });

            const populated = await VariantOption.findById(item._id)
                .populate('variantTypeId', 'name displayName status')
                .lean();

            res.status(201).json({
                success: true,
                message: 'Variant option created successfully',
                data: populated,
            });
        } catch (error) {
            if (error?.code === 11000) {
                return next(new AppError('Option already exists for this variant type', 400, [
                    { field: 'value', message: 'Option already exists for this variant type' },
                ]));
            }
            next(new AppError('Failed to create variant option', 500));
        }
    }

    async update(req, res, next) {
        try {
            const { id } = req.params;
            if (!mongoose.Types.ObjectId.isValid(id)) {
                return next(new AppError('Invalid variant option ID', 400));
            }

            const item = await VariantOption.findById(id);
            if (!item) return next(new AppError('Variant option not found', 404));

            const nextVariantTypeId = req.body.variantTypeId !== undefined || req.body.variantType !== undefined
                ? String(req.body.variantTypeId || req.body.variantType || '').trim()
                : String(item.variantTypeId);
            const nextValue = req.body.value !== undefined ? this.normalizeValue(req.body.value) : item.value;
            const nextDisplayValue = req.body.displayValue !== undefined ? this.normalizeDisplayValue(req.body.displayValue) : item.displayValue;
            const nextHexColor = req.body.hexColor !== undefined ? this.normalizeHexColor(req.body.hexColor) : item.hexColor;
            const nextSortOrder = req.body.sortOrder !== undefined || req.body.position !== undefined
                ? this.normalizeSortOrder(req.body.sortOrder ?? req.body.position)
                : item.sortOrder;
            const nextStatus = req.body.status !== undefined ? this.normalizeStatus(req.body.status, item.status) : item.status;

            const errors = [];
            if (!nextVariantTypeId || !mongoose.Types.ObjectId.isValid(nextVariantTypeId)) {
                errors.push({ field: 'variantTypeId', message: 'Variant type is required' });
            }
            if (!nextValue || nextValue.length < 1) errors.push({ field: 'value', message: 'Value is required' });
            if (!nextDisplayValue || nextDisplayValue.length < 1) errors.push({ field: 'displayValue', message: 'Display value is required' });
            if (!/^[a-z0-9-_\s]+$/.test(nextValue)) errors.push({ field: 'value', message: 'Value can contain lowercase letters, numbers, spaces, dashes, and underscores only' });
            if (nextHexColor && !/^#[0-9A-F]{6}$/i.test(nextHexColor)) errors.push({ field: 'hexColor', message: 'Hex color must be in format #RRGGBB' });
            if (!VALID_STATUS.includes(nextStatus)) errors.push({ field: 'status', message: 'Status must be active or inactive' });

            if (nextVariantTypeId && mongoose.Types.ObjectId.isValid(nextVariantTypeId)) {
                const type = await VariantType.findById(nextVariantTypeId).lean();
                if (!type) errors.push({ field: 'variantTypeId', message: 'Selected variant type does not exist' });
            }

            if (nextVariantTypeId && mongoose.Types.ObjectId.isValid(nextVariantTypeId) && nextValue) {
                const exists = await VariantOption.findOne({
                    variantTypeId: new mongoose.Types.ObjectId(nextVariantTypeId),
                    value: nextValue,
                }).lean();
                if (exists && String(exists._id) !== String(id)) {
                    errors.push({ field: 'value', message: 'Option already exists for this variant type' });
                }
            }

            if (errors.length > 0) return next(new AppError('Validation failed', 422, errors));

            item.variantTypeId = nextVariantTypeId;
            item.value = nextValue;
            item.displayValue = nextDisplayValue;
            item.hexColor = nextHexColor;
            item.sortOrder = nextSortOrder;
            item.status = nextStatus;
            await item.save();

            const populated = await VariantOption.findById(item._id)
                .populate('variantTypeId', 'name displayName status')
                .lean();

            res.json({
                success: true,
                message: 'Variant option updated successfully',
                data: populated,
            });
        } catch (error) {
            if (error?.code === 11000) {
                return next(new AppError('Option already exists for this variant type', 400, [
                    { field: 'value', message: 'Option already exists for this variant type' },
                ]));
            }
            next(new AppError('Failed to update variant option', 500));
        }
    }

    async destroy(req, res, next) {
        try {
            const { id } = req.params;
            if (!mongoose.Types.ObjectId.isValid(id)) {
                return next(new AppError('Invalid variant option ID', 400));
            }

            const item = await VariantOption.findById(id);
            if (!item) return next(new AppError('Variant option not found', 404));

            await item.deleteOne();
            res.json({ success: true, message: 'Variant option deleted successfully' });
        } catch (error) {
            next(new AppError('Failed to delete variant option', 500));
        }
    }
}

export const variantOptionController = new VariantOptionController();
