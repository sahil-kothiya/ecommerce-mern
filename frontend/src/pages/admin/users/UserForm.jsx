import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import notify from '../../../utils/notify';
import { API_CONFIG } from '../../../constants';
import { AdminLoadingState, AdminPageHeader, AdminSurface } from '../../../components/admin/AdminTheme';
import { applyServerFieldErrors, clearFieldError, getFieldBorderClass, hasValidationErrors } from '../../../utils/formValidation';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const UserForm = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEdit = Boolean(id);

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        role: 'user',
        status: 'active',
    });
    const [errors, setErrors] = useState({});
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [selectedPhotoFile, setSelectedPhotoFile] = useState(null);
    const [photoPreview, setPhotoPreview] = useState('');

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
            const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.USERS}/${id}`, {
                credentials: 'include',
            });
            const data = await response.json();
            if (!response.ok || !data?.success) {
                notify.error(data, 'Failed to load user');
                return;
            }
            const user = data?.data || {};
            setFormData({
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

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        clearFieldError(setErrors, name);
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

    const validate = () => {
        const nextErrors = {};
        const name = formData.name.trim();
        const email = formData.email.trim().toLowerCase();
        const password = formData.password || '';

        if (name.length < 2) nextErrors.name = 'Name must be at least 2 characters';
        if (!email) nextErrors.email = 'Email is required';
        else if (!emailRegex.test(email)) nextErrors.email = 'Email format is invalid';
        if (!['admin', 'user'].includes(formData.role)) nextErrors.role = 'Role must be admin or user';
        if (!['active', 'inactive'].includes(formData.status)) nextErrors.status = 'Status must be active or inactive';
        if (!isEdit && password.length < 8) nextErrors.password = 'Password must be at least 8 characters';
        if (isEdit && password && password.length < 8) nextErrors.password = 'Password must be at least 8 characters';

        return nextErrors;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const clientErrors = validate();
        setErrors(clientErrors);
        if (hasValidationErrors(clientErrors)) {
            notify.error('Please fix form validation errors');
            return;
        }

        try {
            setIsSaving(true);
            const payload = new FormData();
            payload.append('name', formData.name.trim());
            payload.append('email', formData.email.trim().toLowerCase());
            payload.append('role', formData.role);
            payload.append('status', formData.status);
            if (formData.password) payload.append('password', formData.password);
            if (selectedPhotoFile) payload.append('avatar', selectedPhotoFile);

            const url = isEdit
                ? `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.USERS}/${id}`
                : `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.USERS}`;
            const response = await fetch(url, {
                method: isEdit ? 'PUT' : 'POST',
                credentials: 'include',
                body: payload,
            });
            const data = await response.json();

            if (!response.ok || !data?.success) {
                const mapped = applyServerFieldErrors(setErrors, data?.errors, clientErrors);
                const fallbackMessage = String(data?.message || '').toLowerCase();
                if (!mapped.email && fallbackMessage.includes('already exists') && fallbackMessage.includes('email')) {
                    mapped.email = 'User already exists with this email';
                    setErrors((prev) => ({ ...prev, email: mapped.email }));
                }
                if (hasValidationErrors(mapped)) {
                    notify.error(data?.message || 'Please fix form validation errors');
                    return;
                }
                notify.error(data?.message || `Failed to ${isEdit ? 'update' : 'create'} user`);
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
                <form onSubmit={handleSubmit} noValidate className="space-y-5">
                <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">Name *</label>
                    <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        className={`w-full rounded-xl border px-4 py-3 ${getFieldBorderClass(errors, 'name')}`}
                        placeholder="Enter full name"
                    />
                    {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
                </div>

                <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">Email *</label>
                    <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        className={`w-full rounded-xl border px-4 py-3 ${getFieldBorderClass(errors, 'email')}`}
                        placeholder="user@example.com"
                    />
                    {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
                </div>

                <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">Password {!isEdit && '*'}</label>
                    <div className="relative">
                        <input
                            type={showPassword ? 'text' : 'password'}
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            className={`w-full rounded-xl border px-4 py-3 pr-12 ${getFieldBorderClass(errors, 'password')}`}
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
                    {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password}</p>}
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
                                className={`w-full rounded-xl border px-4 py-3 ${getFieldBorderClass(errors, 'photo')}`}
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
                        <select
                            name="role"
                            value={formData.role}
                            onChange={handleChange}
                            className={`w-full rounded-xl border px-4 py-3 ${getFieldBorderClass(errors, 'role')}`}
                        >
                            <option value="user">User</option>
                            <option value="admin">Admin</option>
                        </select>
                        {errors.role && <p className="mt-1 text-sm text-red-600">{errors.role}</p>}
                    </div>
                    <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">Status *</label>
                        <select
                            name="status"
                            value={formData.status}
                            onChange={handleChange}
                            className={`w-full rounded-xl border px-4 py-3 ${getFieldBorderClass(errors, 'status')}`}
                        >
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                        </select>
                        {errors.status && <p className="mt-1 text-sm text-red-600">{errors.status}</p>}
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
