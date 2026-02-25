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
    name: yup.string().trim().lowercase().required('Name is required').min(2, 'Name must be at least 2 characters').matches(/^[a-z0-9\-_\s]+$/i, 'Name can contain lowercase letters, numbers, spaces, dashes, and underscores only'),
    displayName: yup.string().trim().required('Display name is required').min(2, 'Display name must be at least 2 characters'),
    sortOrder: yup.number().typeError('Must be a number').min(0, 'Cannot be negative').integer().default(0),
    status: yup.string().oneOf(['active', 'inactive'], 'Invalid status').required(),
});

const VariantTypeForm = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEdit = Boolean(id);

    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const { register, handleSubmit, formState: { errors }, reset, setError } = useForm({
        resolver: yupResolver(schema),
        defaultValues: { name: '', displayName: '', sortOrder: 0, status: 'active' },
        mode: 'onBlur',
    });

    useEffect(() => {
        if (isEdit) loadItem();
    }, [id]);

    const loadItem = async () => {
        try {
            setIsLoading(true);
            const response = await authFetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.VARIANT_TYPES}/${id}`);
            const data = await response.json();
            if (!response.ok || !data?.success) {
                notify.error(data, 'Failed to load variant type');
                return;
            }
            const item = data.data || {};
            reset({
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

    const onSubmit = async (data) => {
        try {
            setIsSaving(true);
            const payload = {
                name: data.name.trim().toLowerCase(),
                displayName: data.displayName.trim(),
                sortOrder: Number(data.sortOrder) || 0,
                status: data.status,
            };
            const url = isEdit
                ? `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.VARIANT_TYPES}/${id}`
                : `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.VARIANT_TYPES}`;

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
                throw new Error(resData?.message || `Failed to ${isEdit ? 'update' : 'create'} variant type`);
            }
            notify.success(`Variant type ${isEdit ? 'updated' : 'created'} successfully`);
            navigate('/admin/variant-type');
        } catch (error) {
            notify.error(error, `Failed to ${isEdit ? 'save' : 'create'} variant type`);
        } finally {
            setIsSaving(false);
        }
    };

    const fc = (field) => `w-full rounded-xl border px-4 py-3 focus:outline-none focus:ring-2 ${errors[field] ? 'border-red-400 focus:ring-red-100 bg-red-50' : 'border-slate-300 focus:ring-cyan-100'}`;

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
                <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">Name *</label>
                        <input {...register('name')} type="text" placeholder="e.g. color" className={fc('name')} />
                        {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
                    </div>
                    <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">Display Name *</label>
                        <input {...register('displayName')} type="text" placeholder="e.g. Color" className={fc('displayName')} />
                        {errors.displayName && <p className="mt-1 text-sm text-red-600">{errors.displayName.message}</p>}
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">Sort Order</label>
                        <input {...register('sortOrder')} type="number" min="0" className={fc('sortOrder')} />
                        {errors.sortOrder && <p className="mt-1 text-sm text-red-600">{errors.sortOrder.message}</p>}
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
