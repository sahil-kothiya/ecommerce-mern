import mongoose from 'mongoose';
import { VariantType, VariantOption } from '../models/Supporting.models.js';
import { AppError } from '../middleware/errorHandler.js';

const VALID_STATUS = ['active', 'inactive'];

export class VariantTypeController {
    normalizeStatus(status, fallback = 'active') {
        const value = String(status ?? fallback).trim().toLowerCase();
        return VALID_STATUS.includes(value) ? value : fallback;
    }

    normalizeName(name = '') {
        return String(name).trim().toLowerCase();
    }

    normalizeDisplayName(displayName = '') {
        return String(displayName).trim();
    }

    normalizeSortOrder(sortOrder) {
        const parsed = Number(sortOrder);
        if (!Number.isFinite(parsed) || parsed < 0) return 0;
        return Math.floor(parsed);
    }

    async index(req, res, next) {
        try {
            const page = Math.max(1, Number(req.query.page) || 1);
            const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 20));
            const skip = (page - 1) * limit;
            const search = String(req.query.search || '').trim();
            const status = this.normalizeStatus(req.query.status || 'all', 'all');

            const query = {};
            if (search) {
                query.$or = [
                    { name: { $regex: search, $options: 'i' } },
                    { displayName: { $regex: search, $options: 'i' } },
                ];
            }
            if (status !== 'all') query.status = status;

            const [items, total] = await Promise.all([
                VariantType.find(query)
                    .sort({ sortOrder: 1, displayName: 1 })
                    .skip(skip)
                    .limit(limit)
                    .lean(),
                VariantType.countDocuments(query),
            ]);

            const ids = items.map((item) => item._id);
            const optionCountsRaw = await VariantOption.aggregate([
                { $match: { variantTypeId: { $in: ids } } },
                { $group: { _id: '$variantTypeId', count: { $sum: 1 } } },
            ]);
            const optionCountMap = new Map(optionCountsRaw.map((item) => [String(item._id), item.count]));
            const rows = items.map((item) => ({
                ...item,
                optionsCount: optionCountMap.get(String(item._id)) || 0,
            }));

            res.json({
                success: true,
                data: {
                    items: rows,
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
            next(new AppError('Failed to fetch variant types', 500));
        }
    }

    async listActive(req, res, next) {
        try {
            const items = await VariantType.find({ status: 'active' })
                .sort({ sortOrder: 1, displayName: 1 })
                .select('_id name displayName sortOrder')
                .lean();
            res.json({ success: true, data: items });
        } catch (error) {
            next(new AppError('Failed to fetch active variant types', 500));
        }
    }

    async show(req, res, next) {
        try {
            const { id } = req.params;
            if (!mongoose.Types.ObjectId.isValid(id)) {
                return next(new AppError('Invalid variant type ID', 400));
            }

            const item = await VariantType.findById(id).lean();
            if (!item) return next(new AppError('Variant type not found', 404));

            const optionsCount = await VariantOption.countDocuments({ variantTypeId: item._id });
            res.json({ success: true, data: { ...item, optionsCount } });
        } catch (error) {
            next(new AppError('Failed to fetch variant type', 500));
        }
    }

    async create(req, res, next) {
        try {
            const name = this.normalizeName(req.body.name);
            const displayName = this.normalizeDisplayName(req.body.displayName || req.body.title);
            const sortOrder = this.normalizeSortOrder(req.body.sortOrder ?? req.body.position);
            const status = this.normalizeStatus(req.body.status);

            const errors = [];
            if (!name || name.length < 2) errors.push({ field: 'name', message: 'Name must be at least 2 characters' });
            if (!displayName || displayName.length < 2) errors.push({ field: 'displayName', message: 'Display name must be at least 2 characters' });
            if (!/^[a-z0-9-_\s]+$/.test(name)) errors.push({ field: 'name', message: 'Name can contain lowercase letters, numbers, spaces, dashes, and underscores only' });
            if (!VALID_STATUS.includes(status)) errors.push({ field: 'status', message: 'Status must be active or inactive' });

            if (name) {
                const exists = await VariantType.findOne({ name }).lean();
                if (exists) errors.push({ field: 'name', message: 'Variant type already exists with this name' });
            }

            if (errors.length > 0) return next(new AppError('Validation failed', 422, errors));

            const item = await VariantType.create({ name, displayName, sortOrder, status });
            res.status(201).json({
                success: true,
                message: 'Variant type created successfully',
                data: item,
            });
        } catch (error) {
            if (error?.code === 11000) {
                return next(new AppError('Variant type already exists with this name', 400, [
                    { field: 'name', message: 'Variant type already exists with this name' },
                ]));
            }
            next(new AppError('Failed to create variant type', 500));
        }
    }

    async update(req, res, next) {
        try {
            const { id } = req.params;
            if (!mongoose.Types.ObjectId.isValid(id)) {
                return next(new AppError('Invalid variant type ID', 400));
            }

            const item = await VariantType.findById(id);
            if (!item) return next(new AppError('Variant type not found', 404));

            const nextName = req.body.name !== undefined ? this.normalizeName(req.body.name) : item.name;
            const nextDisplayName = req.body.displayName !== undefined ? this.normalizeDisplayName(req.body.displayName) : item.displayName;
            const nextSortOrder = req.body.sortOrder !== undefined || req.body.position !== undefined
                ? this.normalizeSortOrder(req.body.sortOrder ?? req.body.position)
                : item.sortOrder;
            const nextStatus = req.body.status !== undefined ? this.normalizeStatus(req.body.status, item.status) : item.status;

            const errors = [];
            if (!nextName || nextName.length < 2) errors.push({ field: 'name', message: 'Name must be at least 2 characters' });
            if (!nextDisplayName || nextDisplayName.length < 2) errors.push({ field: 'displayName', message: 'Display name must be at least 2 characters' });
            if (!/^[a-z0-9-_\s]+$/.test(nextName)) errors.push({ field: 'name', message: 'Name can contain lowercase letters, numbers, spaces, dashes, and underscores only' });
            if (!VALID_STATUS.includes(nextStatus)) errors.push({ field: 'status', message: 'Status must be active or inactive' });

            if (nextName) {
                const exists = await VariantType.findOne({ name: nextName }).lean();
                if (exists && String(exists._id) !== String(id)) {
                    errors.push({ field: 'name', message: 'Variant type already exists with this name' });
                }
            }

            if (errors.length > 0) return next(new AppError('Validation failed', 422, errors));

            item.name = nextName;
            item.displayName = nextDisplayName;
            item.sortOrder = nextSortOrder;
            item.status = nextStatus;
            await item.save();

            res.json({
                success: true,
                message: 'Variant type updated successfully',
                data: item,
            });
        } catch (error) {
            if (error?.code === 11000) {
                return next(new AppError('Variant type already exists with this name', 400, [
                    { field: 'name', message: 'Variant type already exists with this name' },
                ]));
            }
            next(new AppError('Failed to update variant type', 500));
        }
    }

    async destroy(req, res, next) {
        try {
            const { id } = req.params;
            if (!mongoose.Types.ObjectId.isValid(id)) {
                return next(new AppError('Invalid variant type ID', 400));
            }

            const item = await VariantType.findById(id);
            if (!item) return next(new AppError('Variant type not found', 404));

            const linkedOptions = await VariantOption.countDocuments({ variantTypeId: id });
            if (linkedOptions > 0) {
                return next(new AppError('Cannot delete variant type that still has options. Delete options first.', 400));
            }

            await item.deleteOne();
            res.json({ success: true, message: 'Variant type deleted successfully' });
        } catch (error) {
            next(new AppError('Failed to delete variant type', 500));
        }
    }
}

export const variantTypeController = new VariantTypeController();
