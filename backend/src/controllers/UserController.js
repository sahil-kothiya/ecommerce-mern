import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { AppError } from '../middleware/errorHandler.js';

export class UserController {
    isValidEmail(value) {
        if (!value) return false;
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim());
    }

    sanitizeUser(user) {
        if (!user) return null;
        const obj = user.toObject ? user.toObject() : user;
        delete obj.password;
        delete obj.refreshToken;
        delete obj.passwordResetToken;
        delete obj.passwordResetExpires;
        delete obj.emailVerificationToken;
        return obj;
    }

    normalizeRole(role) {
        const value = String(role || '').trim().toLowerCase();
        if (value === 'customer') return 'user';
        return value;
    }

    normalizePhoto(photo, uploadedFile = null) {
        if (uploadedFile?.filename) {
            return `/uploads/users/${uploadedFile.filename}`;
        }
        if (photo === undefined || photo === null) return null;
        const value = String(photo).trim();
        return value.length ? value : null;
    }

    async index(req, res, next) {
        try {
            const page = Math.max(1, Number(req.query.page) || 1);
            const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 20));
            const skip = (page - 1) * limit;
            const search = String(req.query.search || '').trim();
            const role = this.normalizeRole(req.query.role || '');
            const status = String(req.query.status || '').trim().toLowerCase();

            const query = {};
            if (search) {
                query.$or = [
                    { name: { $regex: search, $options: 'i' } },
                    { email: { $regex: search, $options: 'i' } },
                ];
            }
            if (role && ['admin', 'user'].includes(role)) query.role = role;
            if (status && ['active', 'inactive'].includes(status)) query.status = status;

            const [users, total] = await Promise.all([
                User.find(query)
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(limit)
                    .lean(),
                User.countDocuments(query),
            ]);

            res.json({
                success: true,
                data: {
                    users,
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
            next(new AppError('Failed to fetch users', 500));
        }
    }

    async show(req, res, next) {
        try {
            const { id } = req.params;
            if (!mongoose.Types.ObjectId.isValid(id)) {
                return next(new AppError('Invalid user ID', 400));
            }

            const user = await User.findById(id).lean();
            if (!user) {
                return next(new AppError('User not found', 404));
            }

            res.json({ success: true, data: user });
        } catch (error) {
            next(new AppError('Failed to fetch user', 500));
        }
    }

    async create(req, res, next) {
        try {
            const name = String(req.body.name || '').trim();
            const email = String(req.body.email || '').trim().toLowerCase();
            const password = String(req.body.password || '');
            const role = this.normalizeRole(req.body.role || 'user');
            const status = String(req.body.status || 'active').trim().toLowerCase();
            const photo = this.normalizePhoto(req.body.photo, req.file);

            const errors = [];
            if (!name || name.length < 2) errors.push({ field: 'name', message: 'Name must be at least 2 characters' });
            if (!email) errors.push({ field: 'email', message: 'Email is required' });
            else if (!this.isValidEmail(email)) errors.push({ field: 'email', message: 'Email format is invalid' });
            if (!password || password.length < 8) errors.push({ field: 'password', message: 'Password must be at least 8 characters' });
            if (!['admin', 'user'].includes(role)) errors.push({ field: 'role', message: 'Role must be admin or user' });
            if (!['active', 'inactive'].includes(status)) errors.push({ field: 'status', message: 'Status must be active or inactive' });

            if (email && this.isValidEmail(email)) {
                const exists = await User.findOne({ email }).lean();
                if (exists) {
                    errors.push({ field: 'email', message: 'User already exists with this email' });
                }
            }

            if (errors.length > 0) {
                return next(new AppError('Validation failed', 422, errors));
            }

            const user = await User.create({ name, email, password, role, status, photo });
            res.status(201).json({
                success: true,
                message: 'User created successfully',
                data: this.sanitizeUser(user),
            });
        } catch (error) {
            if (error instanceof AppError) {
                return next(error);
            }
            if (error?.name === 'ValidationError') {
                const errors = Object.entries(error.errors || {}).map(([field, item]) => ({
                    field,
                    message: item?.message || 'Invalid value',
                }));
                return next(new AppError('Validation failed', 422, errors));
            }
            if (error?.code === 11000) {
                return next(new AppError('User already exists with this email', 400, [
                    { field: 'email', message: 'User already exists with this email' },
                ]));
            }
            next(new AppError('Failed to create user', 500));
        }
    }

    async update(req, res, next) {
        try {
            const { id } = req.params;
            if (!mongoose.Types.ObjectId.isValid(id)) {
                return next(new AppError('Invalid user ID', 400));
            }

            const user = await User.findById(id).select('+password');
            if (!user) {
                return next(new AppError('User not found', 404));
            }

            const nextName = req.body.name !== undefined ? String(req.body.name).trim() : user.name;
            const nextEmail = req.body.email !== undefined ? String(req.body.email).trim().toLowerCase() : user.email;
            const nextRole = req.body.role !== undefined ? this.normalizeRole(req.body.role) : user.role;
            const nextStatus = req.body.status !== undefined ? String(req.body.status).trim().toLowerCase() : user.status;
            const nextPassword = req.body.password !== undefined ? String(req.body.password || '') : '';
            const nextPhoto = req.file
                ? this.normalizePhoto(null, req.file)
                : (req.body.photo !== undefined ? this.normalizePhoto(req.body.photo) : user.photo);

            const errors = [];
            if (!nextName || nextName.length < 2) errors.push({ field: 'name', message: 'Name must be at least 2 characters' });
            if (!nextEmail) errors.push({ field: 'email', message: 'Email is required' });
            else if (!this.isValidEmail(nextEmail)) errors.push({ field: 'email', message: 'Email format is invalid' });
            if (!['admin', 'user'].includes(nextRole)) errors.push({ field: 'role', message: 'Role must be admin or user' });
            if (!['active', 'inactive'].includes(nextStatus)) errors.push({ field: 'status', message: 'Status must be active or inactive' });
            if (nextPassword && nextPassword.length < 8) errors.push({ field: 'password', message: 'Password must be at least 8 characters' });

            if (nextEmail && this.isValidEmail(nextEmail)) {
                const emailOwner = await User.findOne({ email: nextEmail }).lean();
                if (emailOwner && String(emailOwner._id) !== String(id)) {
                    errors.push({ field: 'email', message: 'User already exists with this email' });
                }
            }

            if (errors.length > 0) {
                return next(new AppError('Validation failed', 422, errors));
            }

            user.name = nextName;
            user.email = nextEmail;
            user.role = nextRole;
            user.status = nextStatus;
            user.photo = nextPhoto;
            if (nextPassword) user.password = nextPassword;

            await user.save();

            res.json({
                success: true,
                message: 'User updated successfully',
                data: this.sanitizeUser(user),
            });
        } catch (error) {
            if (error instanceof AppError) {
                return next(error);
            }
            if (error?.name === 'ValidationError') {
                const errors = Object.entries(error.errors || {}).map(([field, item]) => ({
                    field,
                    message: item?.message || 'Invalid value',
                }));
                return next(new AppError('Validation failed', 422, errors));
            }
            if (error?.code === 11000) {
                return next(new AppError('User already exists with this email', 400, [
                    { field: 'email', message: 'User already exists with this email' },
                ]));
            }
            next(new AppError('Failed to update user', 500));
        }
    }

    async destroy(req, res, next) {
        try {
            const { id } = req.params;
            if (!mongoose.Types.ObjectId.isValid(id)) {
                return next(new AppError('Invalid user ID', 400));
            }

            if (String(req.user?._id) === String(id)) {
                return next(new AppError('You cannot delete your own account', 400));
            }

            const user = await User.findById(id);
            if (!user) {
                return next(new AppError('User not found', 404));
            }

            await user.deleteOne();
            res.json({ success: true, message: 'User deleted successfully' });
        } catch (error) {
            next(new AppError('Failed to delete user', 500));
        }
    }
}

export const userController = new UserController();
