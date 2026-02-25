import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import notify from '../../../utils/notify';
import { API_CONFIG } from '../../../constants';
import authFetch from '../../../utils/authFetch.js';
import { AdminLoadingState, AdminPageHeader, AdminSurface } from '../../../components/admin/AdminTheme';

const buildSchema = (isEdit) => yup.object({
    name: yup.string().trim().required('Name is required').min(2, 'Name must be at least 2 characters'),
    email: yup.string().trim().required('Email is required').email('Email format is invalid'),
    password: isEdit
        ? yup.string().test('min-if-set', 'Password must be at least 8 characters', (v) => !v || v.length >= 8)
        : yup.string().required('Password is required').min(8, 'Password must be at least 8 characters'),
    role: yup.string().oneOf(['admin', 'user'], 'Role must be admin or user').required(),
    status: yup.string().oneOf(['active', 'inactive'], 'Status must be active or inactive').required(),
});

const UserForm = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEdit = Boolean(id);

    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [selectedPhotoFile, setSelectedPhotoFile] = useState(null);
    const [photoPreview, setPhotoPreview] = useState('');

    const { register, handleSubmit, reset, setError, formState: { errors } } = useForm({
        resolver: yupResolver(buildSchema(isEdit)),
        defaultValues: { name: '', email: '', password: '', role: 'user', status: 'active' },
        mode: 'onBlur',
    });

    const fc = (field) => `w-full rounded-xl border px-4 py-3 focus:outline-none focus:ring-2 ${errors[field] ? 'border-red-400 focus:ring-red-100 bg-red-50' : 'border-slate-200 focus:ring-cyan-100'}`;

    useEffect(() => {
        if (isEdit) {
            loadUser();
            return;
        }
        setSelectedPhotoFile(null);
        setPhotoPreview('');
    }, [id]);

    useEffect(() => () => {
        if (photoPreview && photoPreview.startsWith('blob:')) {
            URL.revokeObjectURL(photoPreview);
        }
    }, [photoPreview]);

    const getImageUrl = (path) => {
        if (!path) return '';
        if (/^https?:\/\//i.test(path)) return path;
        if (path.startsWith('/images/')) return `${API_CONFIG.BASE_URL}${path}`;
        if (path.startsWith('/uploads/')) return `${API_CONFIG.BASE_URL}${path}`;
        return `${API_CONFIG.BASE_URL}/uploads/${path.replace(/^\/+/, '')}`;
    };

    const loadUser = async () => {
        try {
            setIsLoading(true);
            const response = await authFetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.USERS}/${id}`);
            const data = await response.json();
            if (!response.ok || !data?.success) {
                notify.error(data, 'Failed to load user');
                return;
            }
            const user = data?.data || {};
            reset({
                name: user.name || '',
                email: user.email || '',
                password: '',
                role: user.role || 'user',
                status: user.status || 'active',
            });
            setSelectedPhotoFile(null);
            setPhotoPreview(user.photo ? getImageUrl(user.photo) : '');
        } catch (error) {
            notify.error(error, 'Failed to load user');
        } finally {
            setIsLoading(false);
        }
    };

    const handlePhotoChange = (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            setErrors((prev) => ({ ...prev, photo: 'Please select an image file' }));
            notify.error('Please select an image file');
            return;
        }

        if (file.size > 2 * 1024 * 1024) {
            setErrors((prev) => ({ ...prev, photo: 'Image must be less than 2MB' }));
            notify.error('Image must be less than 2MB');
            return;
        }

        if (photoPreview && photoPreview.startsWith('blob:')) {
            URL.revokeObjectURL(photoPreview);
        }

        setSelectedPhotoFile(file);
        setPhotoPreview(URL.createObjectURL(file));
        clearFieldError(setErrors, 'photo');
    };

    const onSubmit = async (data) => {
        try {
            setIsSaving(true);
            const payload = new FormData();
            payload.append('name', data.name.trim());
            payload.append('email', data.email.trim().toLowerCase());
            payload.append('role', data.role);
            payload.append('status', data.status);
            if (data.password) payload.append('password', data.password);
            if (selectedPhotoFile) payload.append('avatar', selectedPhotoFile);

            const url = isEdit
                ? `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.USERS}/${id}`
                : `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.USERS}`;
            const response = await authFetch(url, {
                method: isEdit ? 'PUT' : 'POST',
                body: payload,
            });
            const resData = await response.json();

            if (!response.ok || !resData?.success) {
                const serverErrors = resData?.errors;
                if (Array.isArray(serverErrors)) {
                    serverErrors.forEach(({ field, message }) => { if (field) setError(field, { message }); });
                    notify.error('Please fix form validation errors');
                } else {
                    const msg = String(resData?.message || '').toLowerCase();
                    if (msg.includes('already exists') && msg.includes('email')) {
                        setError('email', { message: 'User already exists with this email' });
                    }
                    notify.error(resData?.message || `Failed to ${isEdit ? 'update' : 'create'} user`);
                }
                return;
            }

            notify.success(`User ${isEdit ? 'updated' : 'created'} successfully`);
            navigate('/admin/users');
        } catch (error) {
            notify.error(error, `Failed to ${isEdit ? 'update' : 'create'} user`);
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return <AdminLoadingState title="Loading user form..." subtitle="Preparing account details" />;
    }

    return (
        <div className="space-y-8">
            <AdminPageHeader
                eyebrow="User Studio"
                title={isEdit ? 'Edit User' : 'Create User'}
                subtitle="Manage account identity, access role, and profile information in one place."
            />

            <AdminSurface>
                <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
                <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">Name *</label>
                    <input
                        {...register('name')}
                        type="text"
                        className={fc('name')}
                        placeholder="Enter full name"
                    />
                    {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
                </div>

                <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">Email *</label>
                    <input
                        {...register('email')}
                        type="email"
                        className={fc('email')}
                        placeholder="user@example.com"
                    />
                    {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>}
                </div>

                <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">Password {!isEdit && '*'}</label>
                    <div className="relative">
                        <input
                            {...register('password')}
                            type={showPassword ? 'text' : 'password'}
                            className={`${fc('password')} pr-12`}
                            placeholder={isEdit ? 'Leave blank to keep current password' : 'Enter password'}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword((prev) => !prev)}
                            className="absolute right-3 top-3 text-sm text-slate-600"
                        >
                            {showPassword ? 'Hide' : 'Show'}
                        </button>
                    </div>
                    {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>}
                </div>

                <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">Profile Photo</label>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_auto] md:items-end">
                        <div>
                            <input
                                type="file"
                                name="avatar"
                                accept="image/jpeg,image/png,image/gif,image/webp"
                                onChange={handlePhotoChange}
                                className="w-full rounded-xl border border-slate-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-cyan-100"
                            />
                            <p className="mt-1 text-xs text-slate-500">Allowed: JPG, PNG, GIF, WEBP. Max file size: 2MB.</p>
                            {errors.photo && <p className="mt-1 text-sm text-red-600">{errors.photo}</p>}
                        </div>
                        <div className="h-16 w-16 overflow-hidden rounded-full border border-slate-200 bg-slate-100">
                            {photoPreview ? (
                                <img
                                    src={photoPreview}
                                    alt="Profile preview"
                                    className="h-full w-full object-cover"
                                    onError={(e) => {
                                        e.currentTarget.style.display = 'none';
                                    }}
                                />
                            ) : (
                                <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-slate-500">
                                    No Photo
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">Role *</label>
                        <select {...register('role')} className={fc('role')}>
                            <option value="user">User</option>
                            <option value="admin">Admin</option>
                        </select>
                        {errors.role && <p className="mt-1 text-sm text-red-600">{errors.role.message}</p>}
                    </div>
                    <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">Status *</label>
                        <select {...register('status')} className={fc('status')}>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                        </select>
                        {errors.status && <p className="mt-1 text-sm text-red-600">{errors.status.message}</p>}
                    </div>
                </div>

                <div className="flex gap-3 pt-2">
                    <button
                        type="submit"
                        disabled={isSaving}
                        className="flex-1 rounded-xl bg-cyan-500 px-6 py-3 font-semibold text-slate-900 hover:bg-cyan-400 disabled:opacity-50"
                    >
                        {isSaving ? 'Saving...' : isEdit ? 'Update User' : 'Create User'}
                    </button>
                    <button
                        type="button"
                        onClick={() => navigate('/admin/users')}
                        className="rounded-xl border border-slate-300 bg-white px-6 py-3 font-semibold text-slate-700 hover:bg-slate-100"
                    >
                        Cancel
                    </button>
                </div>
                </form>
            </AdminSurface>
        </div>
    );
};

export default UserForm;
