import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import notify from '../../../utils/notify';
import { API_CONFIG } from '../../../constants';

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

    useEffect(() => {
        if (isEdit) loadUser();
    }, [id]);

    const getAuthHeaders = () => {
        const token = localStorage.getItem('auth_token');
        return token ? { Authorization: `Bearer ${token}` } : {};
    };

    const loadUser = async () => {
        try {
            setIsLoading(true);
            const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.USERS}/${id}`, {
                headers: { ...getAuthHeaders() },
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
        } catch (error) {
            notify.error(error, 'Failed to load user');
        } finally {
            setIsLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        if (errors[name]) setErrors((prev) => ({ ...prev, [name]: null }));
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

    const showAllErrorToasts = (errorMap, fallback) => {
        const messages = Array.from(new Set(Object.values(errorMap || {}).filter(Boolean)));
        if (messages.length > 0) {
            messages.forEach((msg) => notify.error(msg));
            return;
        }
        if (fallback) notify.error(fallback);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const clientErrors = validate();
        setErrors(clientErrors);

        try {
            setIsSaving(true);
            const payload = {
                name: formData.name.trim(),
                email: formData.email.trim().toLowerCase(),
                role: formData.role,
                status: formData.status,
            };
            if (formData.password) payload.password = formData.password;

            const url = isEdit
                ? `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.USERS}/${id}`
                : `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.USERS}`;
            const response = await fetch(url, {
                method: isEdit ? 'PUT' : 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...getAuthHeaders(),
                },
                body: JSON.stringify(payload),
            });
            const data = await response.json();

            if (!response.ok || !data?.success) {
                const mapped = { ...clientErrors };
                if (Array.isArray(data?.errors)) {
                    data.errors.forEach((item) => {
                        if (item?.field && item?.message) mapped[item.field] = item.message;
                    });
                }
                const fallbackMessage = String(data?.message || '').toLowerCase();
                if (!mapped.email && fallbackMessage.includes('already exists') && fallbackMessage.includes('email')) {
                    mapped.email = 'User already exists with this email';
                }
                if (Object.keys(mapped).length > 0) {
                    setErrors(mapped);
                }
                showAllErrorToasts(mapped, data?.message || `Failed to ${isEdit ? 'update' : 'create'} user`);
                return;
            }

            notify.success(`User ${isEdit ? 'updated' : 'created'} successfully`);
            navigate('/admin/users');
        } catch (error) {
            if (Object.keys(clientErrors).length > 0) {
                setErrors(clientErrors);
                showAllErrorToasts(clientErrors, null);
                return;
            }
            notify.error(error, `Failed to ${isEdit ? 'update' : 'create'} user`);
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex h-[420px] items-center justify-center">
                <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
                    <div className="mx-auto mb-4 h-16 w-16 animate-spin rounded-full border-b-4 border-slate-700" />
                    <p className="text-lg font-semibold text-slate-800">Loading user form...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h1 className="text-3xl font-black text-slate-900">{isEdit ? 'Edit User' : 'Create User'}</h1>
                <p className="mt-1 text-slate-600">Manage user account details and permissions.</p>
            </div>

            <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
                <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">Name *</label>
                    <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        className={`w-full rounded-xl border px-4 py-3 ${errors.name ? 'border-red-500' : 'border-slate-300'}`}
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
                        className={`w-full rounded-xl border px-4 py-3 ${errors.email ? 'border-red-500' : 'border-slate-300'}`}
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
                            className={`w-full rounded-xl border px-4 py-3 pr-12 ${errors.password ? 'border-red-500' : 'border-slate-300'}`}
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

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">Role *</label>
                        <select
                            name="role"
                            value={formData.role}
                            onChange={handleChange}
                            className={`w-full rounded-xl border px-4 py-3 ${errors.role ? 'border-red-500' : 'border-slate-300'}`}
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
                            className={`w-full rounded-xl border px-4 py-3 ${errors.status ? 'border-red-500' : 'border-slate-300'}`}
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
        </div>
    );
};

export default UserForm;
