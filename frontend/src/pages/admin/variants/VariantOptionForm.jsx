import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useNavigate, useParams } from 'react-router-dom';
import notify from '../../../utils/notify';
import { API_CONFIG } from '../../../constants';
import { AdminLoadingState, AdminPageHeader, AdminSurface } from '../../../components/admin/AdminTheme';
import authFetch from '../../../utils/authFetch.js';

const schema = yup.object({
    variantTypeId: yup.string().required('Variant type is required'),
    value: yup.string().trim().lowercase().required('Value is required').matches(/^[a-z0-9\-_\s]+$/i, 'Value can contain lowercase letters, numbers, spaces, dashes, and underscores only'),
    displayValue: yup.string().trim().required('Display value is required'),
    hexColor: yup.string().trim().default('').test('hex-color', 'Hex color must be in format #RRGGBB', (v) => !v || /^#[0-9A-Fa-f]{6}$/.test(v)),
    sortOrder: yup.number().typeError('Must be a number').min(0, 'Cannot be negative').integer().default(0),
    status: yup.string().oneOf(['active', 'inactive'], 'Invalid status').required(),
});

const VariantOptionForm = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEdit = Boolean(id);

    const [types, setTypes] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const { register, handleSubmit, formState: { errors }, reset, setError } = useForm({
        resolver: yupResolver(schema),
        defaultValues: { variantTypeId: '', value: '', displayValue: '', hexColor: '', sortOrder: 0, status: 'active' },
        mode: 'onBlur',
    });

    useEffect(() => {
        loadTypes();
        if (isEdit) loadItem();
    }, [id]);

    const loadTypes = async () => {
        try {
            const response = await authFetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.VARIANT_TYPES}/active`);
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
            const response = await authFetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.VARIANT_OPTIONS}/${id}`);
            const data = await response.json();
            if (!response.ok || !data?.success) {
                notify.error(data, 'Failed to load variant option');
                return;
            }
            const item = data.data || {};
            reset({
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

    const onSubmit = async (data) => {
        try {
            setIsSaving(true);
            const payload = {
                variantTypeId: data.variantTypeId,
                value: data.value.trim().toLowerCase(),
                displayValue: data.displayValue.trim(),
                hexColor: data.hexColor?.trim() || null,
                sortOrder: Number(data.sortOrder) || 0,
                status: data.status,
            };
            const url = isEdit
                ? `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.VARIANT_OPTIONS}/${id}`
                : `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.VARIANT_OPTIONS}`;

            const response = await authFetch(url, {
                method: isEdit ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const resData = await response.json();
            if (!response.ok || !resData?.success) {
                if (Array.isArray(resData?.errors)) {
                    resData.errors.forEach(({ field, message }) => { if (field) setError(field, { message }); });
                    return;
                }
                throw new Error(resData?.message || `Failed to ${isEdit ? 'update' : 'create'} variant option`);
            }
            notify.success(`Variant option ${isEdit ? 'updated' : 'created'} successfully`);
            navigate('/admin/variant-option');
        } catch (error) {
            notify.error(error, `Failed to ${isEdit ? 'save' : 'create'} variant option`);
        } finally {
            setIsSaving(false);
        }
    };

    const fc = (field) => `w-full rounded-xl border px-4 py-3 focus:outline-none focus:ring-2 ${errors[field] ? 'border-red-400 focus:ring-red-100 bg-red-50' : 'border-slate-300 focus:ring-cyan-100'}`;

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
                <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">Variant Type *</label>
                        <select {...register('variantTypeId')} className={fc('variantTypeId')}>
                            <option value="">Select type</option>
                            {types.map((type) => <option key={type._id} value={type._id}>{type.displayName}</option>)}
                        </select>
                        {errors.variantTypeId && <p className="mt-1 text-sm text-red-600">{errors.variantTypeId.message}</p>}
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

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">Value *</label>
                        <input {...register('value')} type="text" placeholder="e.g. red" className={fc('value')} />
                        {errors.value && <p className="mt-1 text-sm text-red-600">{errors.value.message}</p>}
                    </div>
                    <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">Display Value *</label>
                        <input {...register('displayValue')} type="text" placeholder="e.g. Red" className={fc('displayValue')} />
                        {errors.displayValue && <p className="mt-1 text-sm text-red-600">{errors.displayValue.message}</p>}
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">Hex Color (Optional)</label>
                        <input {...register('hexColor')} type="text" placeholder="#FF0000" className={fc('hexColor')} />
                        {errors.hexColor && <p className="mt-1 text-sm text-red-600">{errors.hexColor.message}</p>}
                    </div>
                    <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">Sort Order</label>
                        <input {...register('sortOrder')} type="number" min="0" className={fc('sortOrder')} />
                        {errors.sortOrder && <p className="mt-1 text-sm text-red-600">{errors.sortOrder.message}</p>}
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
