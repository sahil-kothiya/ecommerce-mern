import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import notify from '../../../utils/notify';
import { API_CONFIG } from '../../../constants';
import { AdminLoadingState, AdminPageHeader, AdminSurface } from '../../../components/admin/AdminTheme';
import { clearFieldError, getFieldBorderClass, mapServerFieldErrors } from '../../../utils/formValidation';

const VariantTypeForm = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEdit = Boolean(id);

    const [formData, setFormData] = useState({
        name: '',
        displayName: '',
        sortOrder: 0,
        status: 'active',
    });
    const [errors, setErrors] = useState({});
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (isEdit) loadItem();
    }, [id]);

    const loadItem = async () => {
        try {
            setIsLoading(true);
            const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.VARIANT_TYPES}/${id}`, {
                credentials: 'include',
            });
            const data = await response.json();
            if (!response.ok || !data?.success) {
                notify.error(data, 'Failed to load variant type');
                return;
            }
            const item = data.data || {};
            setFormData({
                name: item.name || '',
                displayName: item.displayName || '',
                sortOrder: item.sortOrder ?? 0,
                status: item.status || 'active',
            });
        } catch (error) {
            notify.error(error, 'Failed to load variant type');
        } finally {
            setIsLoading(false);
        }
    };

    const validate = () => {
        const nextErrors = {};
        const name = String(formData.name || '').trim().toLowerCase();
        const displayName = String(formData.displayName || '').trim();
        if (name.length < 2) nextErrors.name = 'Name must be at least 2 characters';
        if (!/^[a-z0-9-_\s]+$/.test(name)) nextErrors.name = 'Name can contain lowercase letters, numbers, spaces, dashes, and underscores only';
        if (displayName.length < 2) nextErrors.displayName = 'Display name must be at least 2 characters';
        if (!['active', 'inactive'].includes(formData.status)) nextErrors.status = 'Status must be active or inactive';
        return nextErrors;
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        const mappedValue = name === 'name' ? value.toLowerCase() : value;
        setFormData((prev) => ({ ...prev, [name]: mappedValue }));
        clearFieldError(setErrors, name);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const clientErrors = validate();
        setErrors(clientErrors);
        if (Object.keys(clientErrors).length > 0) {
            notify.error('Please fix validation errors');
            return;
        }

        try {
            setIsSaving(true);
            const payload = {
                name: formData.name.trim().toLowerCase(),
                displayName: formData.displayName.trim(),
                sortOrder: Number(formData.sortOrder) || 0,
                status: formData.status,
            };
            const url = isEdit
                ? `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.VARIANT_TYPES}/${id}`
                : `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.VARIANT_TYPES}`;
            const response = await fetch(url, {
                method: isEdit ? 'PUT' : 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify(payload),
            });
            const data = await response.json();
            if (!response.ok || !data?.success) {
                const mapped = mapServerFieldErrors(data?.errors, clientErrors);
                setErrors(mapped);
                notify.error(data, `Failed to ${isEdit ? 'update' : 'create'} variant type`);
                return;
            }
            notify.success(`Variant type ${isEdit ? 'updated' : 'created'} successfully`);
            navigate('/admin/variant-type');
        } catch (error) {
            notify.error(error, `Failed to ${isEdit ? 'save' : 'create'} variant type`);
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return <AdminLoadingState title="Loading variant type..." subtitle="Preparing variant type details" />;
    }

    return (
        <div className="space-y-8">
            <AdminPageHeader
                eyebrow="Variant Studio"
                title={isEdit ? 'Edit Variant Type' : 'Create Variant Type'}
                subtitle="Define reusable variant groups for products with consistent naming and order."
            />

            <AdminSurface>
                <form onSubmit={handleSubmit} noValidate className="space-y-5">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">Name *</label>
                        <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="e.g. color" className={`w-full rounded-xl border px-4 py-3 ${getFieldBorderClass(errors, 'name')}`} />
                        {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
                    </div>
                    <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">Display Name *</label>
                        <input type="text" name="displayName" value={formData.displayName} onChange={handleChange} placeholder="e.g. Color" className={`w-full rounded-xl border px-4 py-3 ${getFieldBorderClass(errors, 'displayName')}`} />
                        {errors.displayName && <p className="mt-1 text-sm text-red-600">{errors.displayName}</p>}
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">Sort Order</label>
                        <input type="number" min="0" name="sortOrder" value={formData.sortOrder} onChange={handleChange} className="w-full rounded-xl border border-slate-300 px-4 py-3" />
                    </div>
                    <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">Status *</label>
                        <select name="status" value={formData.status} onChange={handleChange} className={`w-full rounded-xl border px-4 py-3 ${getFieldBorderClass(errors, 'status')}`}>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                        </select>
                        {errors.status && <p className="mt-1 text-sm text-red-600">{errors.status}</p>}
                    </div>
                </div>

                <div className="flex gap-3 pt-2">
                    <button type="submit" disabled={isSaving} className="flex-1 rounded-xl bg-cyan-500 px-6 py-3 font-semibold text-slate-900 hover:bg-cyan-400 disabled:opacity-50">
                        {isSaving ? 'Saving...' : isEdit ? 'Update Type' : 'Create Type'}
                    </button>
                    <button type="button" onClick={() => navigate('/admin/variant-type')} className="rounded-xl border border-slate-300 bg-white px-6 py-3 font-semibold text-slate-700 hover:bg-slate-100">
                        Cancel
                    </button>
                </div>
                </form>
            </AdminSurface>
        </div>
    );
};

export default VariantTypeForm;
