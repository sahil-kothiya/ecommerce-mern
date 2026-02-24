import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import notify from '../../../utils/notify';
import { API_CONFIG } from '../../../constants';
import { AdminLoadingState, AdminPageHeader, AdminSurface } from '../../../components/admin/AdminTheme';
import { clearFieldError, getFieldBorderClass, mapServerFieldErrors } from '../../../utils/formValidation';

const VariantOptionForm = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEdit = Boolean(id);

    const [formData, setFormData] = useState({
        variantTypeId: '',
        value: '',
        displayValue: '',
        hexColor: '',
        sortOrder: 0,
        status: 'active',
    });
    const [types, setTypes] = useState([]);
    const [errors, setErrors] = useState({});
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        loadTypes();
        if (isEdit) loadItem();
    }, [id]);

    const loadTypes = async () => {
        try {
            const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.VARIANT_TYPES}/active`, {
                credentials: 'include',
            });
            const data = await response.json();
            if (response.ok && data?.success) {
                setTypes(Array.isArray(data.data) ? data.data : []);
            } else {
                setTypes([]);
            }
        } catch (error) {
            setTypes([]);
        }
    };

    const loadItem = async () => {
        try {
            setIsLoading(true);
            const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.VARIANT_OPTIONS}/${id}`, {
                credentials: 'include',
            });
            const data = await response.json();
            if (!response.ok || !data?.success) {
                notify.error(data, 'Failed to load variant option');
                return;
            }
            const item = data.data || {};
            setFormData({
                variantTypeId: item.variantTypeId?._id || item.variantTypeId || '',
                value: item.value || '',
                displayValue: item.displayValue || '',
                hexColor: item.hexColor || '',
                sortOrder: item.sortOrder ?? 0,
                status: item.status || 'active',
            });
        } catch (error) {
            notify.error(error, 'Failed to load variant option');
        } finally {
            setIsLoading(false);
        }
    };

    const validate = () => {
        const nextErrors = {};
        const value = String(formData.value || '').trim().toLowerCase();
        const displayValue = String(formData.displayValue || '').trim();
        if (!formData.variantTypeId) nextErrors.variantTypeId = 'Variant type is required';
        if (!value) nextErrors.value = 'Value is required';
        if (!/^[a-z0-9-_\s]+$/.test(value)) nextErrors.value = 'Value can contain lowercase letters, numbers, spaces, dashes, and underscores only';
        if (!displayValue) nextErrors.displayValue = 'Display value is required';
        if (formData.hexColor && !/^#[0-9A-Fa-f]{6}$/.test(formData.hexColor)) nextErrors.hexColor = 'Hex color must be in format #RRGGBB';
        if (!['active', 'inactive'].includes(formData.status)) nextErrors.status = 'Status must be active or inactive';
        return nextErrors;
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        const mappedValue = name === 'value' ? value.toLowerCase() : value;
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
                variantTypeId: formData.variantTypeId,
                value: formData.value.trim().toLowerCase(),
                displayValue: formData.displayValue.trim(),
                hexColor: formData.hexColor.trim() || null,
                sortOrder: Number(formData.sortOrder) || 0,
                status: formData.status,
            };
            const url = isEdit
                ? `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.VARIANT_OPTIONS}/${id}`
                : `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.VARIANT_OPTIONS}`;

            const authToken = localStorage.getItem('auth_token') || localStorage.getItem('token');
            const authHeaders = {
                'Content-Type': 'application/json',
                ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
            };

            const response = await fetch(url, {
                method: isEdit ? 'PUT' : 'POST',
                headers: authHeaders,
                credentials: 'include',
                body: JSON.stringify(payload),
            });
            const data = await response.json();
            if (!response.ok || !data?.success) {
                const mapped = mapServerFieldErrors(data?.errors, clientErrors);
                setErrors(mapped);
                notify.error(data, `Failed to ${isEdit ? 'update' : 'create'} variant option`);
                return;
            }
            notify.success(`Variant option ${isEdit ? 'updated' : 'created'} successfully`);
            navigate('/admin/variant-option');
        } catch (error) {
            notify.error(error, `Failed to ${isEdit ? 'save' : 'create'} variant option`);
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return <AdminLoadingState title="Loading variant option..." subtitle="Preparing variant option details" />;
    }

    return (
        <div className="space-y-8">
            <AdminPageHeader
                eyebrow="Variant Studio"
                title={isEdit ? 'Edit Variant Option' : 'Create Variant Option'}
                subtitle="Create option values and map them to each variant type with clean metadata."
            />

            <AdminSurface>
                <form onSubmit={handleSubmit} noValidate className="space-y-5">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">Variant Type *</label>
                        <select name="variantTypeId" value={formData.variantTypeId} onChange={handleChange} className={`w-full rounded-xl border px-4 py-3 ${getFieldBorderClass(errors, 'variantTypeId')}`}>
                            <option value="">Select type</option>
                            {types.map((type) => <option key={type._id} value={type._id}>{type.displayName}</option>)}
                        </select>
                        {errors.variantTypeId && <p className="mt-1 text-sm text-red-600">{errors.variantTypeId}</p>}
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

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">Value *</label>
                        <input type="text" name="value" value={formData.value} onChange={handleChange} placeholder="e.g. red" className={`w-full rounded-xl border px-4 py-3 ${getFieldBorderClass(errors, 'value')}`} />
                        {errors.value && <p className="mt-1 text-sm text-red-600">{errors.value}</p>}
                    </div>
                    <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">Display Value *</label>
                        <input type="text" name="displayValue" value={formData.displayValue} onChange={handleChange} placeholder="e.g. Red" className={`w-full rounded-xl border px-4 py-3 ${getFieldBorderClass(errors, 'displayValue')}`} />
                        {errors.displayValue && <p className="mt-1 text-sm text-red-600">{errors.displayValue}</p>}
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">Hex Color (Optional)</label>
                        <input type="text" name="hexColor" value={formData.hexColor} onChange={handleChange} placeholder="#FF0000" className={`w-full rounded-xl border px-4 py-3 ${getFieldBorderClass(errors, 'hexColor')}`} />
                        {errors.hexColor && <p className="mt-1 text-sm text-red-600">{errors.hexColor}</p>}
                    </div>
                    <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">Sort Order</label>
                        <input type="number" min="0" name="sortOrder" value={formData.sortOrder} onChange={handleChange} className="w-full rounded-xl border border-slate-300 px-4 py-3" />
                    </div>
                </div>

                <div className="flex gap-3 pt-2">
                    <button type="submit" disabled={isSaving} className="flex-1 rounded-xl bg-cyan-500 px-6 py-3 font-semibold text-slate-900 hover:bg-cyan-400 disabled:opacity-50">
                        {isSaving ? 'Saving...' : isEdit ? 'Update Option' : 'Create Option'}
                    </button>
                    <button type="button" onClick={() => navigate('/admin/variant-option')} className="rounded-xl border border-slate-300 bg-white px-6 py-3 font-semibold text-slate-700 hover:bg-slate-100">
                        Cancel
                    </button>
                </div>
                </form>
            </AdminSurface>
        </div>
    );
};

export default VariantOptionForm;
