import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import notify from '../../../utils/notify';
import couponService from '../../../services/couponService';
import { applyServerFieldErrors, clearFieldError, getFieldBorderClass, hasValidationErrors } from '../../../utils/formValidation';

const toLocalInputDateTime = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const offset = date.getTimezoneOffset();
    const localDate = new Date(date.getTime() - offset * 60000);
    return localDate.toISOString().slice(0, 16);
};

const CouponForm = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEdit = Boolean(id);

    const [formData, setFormData] = useState({
        code: '',
        description: '',
        type: 'percent',
        value: '',
        minPurchase: '',
        maxDiscount: '',
        usageLimit: '',
        startDate: '',
        expiryDate: '',
        status: 'active',
    });
    const [errors, setErrors] = useState({});
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (!isEdit) return;
        const loadCoupon = async () => {
            try {
                setIsLoading(true);
                const response = await couponService.getCouponById(id);
                const coupon = response?.data;
                if (!coupon?._id) {
                    notify.error('Coupon not found');
                    navigate('/admin/coupons');
                    return;
                }
                setFormData({
                    code: coupon.code || '',
                    description: coupon.description || '',
                    type: coupon.type || 'percent',
                    value: coupon.value ?? '',
                    minPurchase: coupon.minPurchase ?? '',
                    maxDiscount: coupon.maxDiscount ?? '',
                    usageLimit: coupon.usageLimit ?? '',
                    startDate: toLocalInputDateTime(coupon.startDate),
                    expiryDate: toLocalInputDateTime(coupon.expiryDate),
                    status: coupon.status || 'active',
                });
            } catch (error) {
                notify.error(error, 'Failed to load coupon');
                navigate('/admin/coupons');
            } finally {
                setIsLoading(false);
            }
        };
        loadCoupon();
    }, [id, isEdit, navigate]);

    const handleChange = (event) => {
        const { name, value } = event.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        clearFieldError(setErrors, name);
    };

    const validate = () => {
        const nextErrors = {};
        const code = formData.code.trim().toUpperCase();
        const value = Number(formData.value);
        const minPurchase = formData.minPurchase === '' ? null : Number(formData.minPurchase);
        const maxDiscount = formData.maxDiscount === '' ? null : Number(formData.maxDiscount);
        const usageLimit = formData.usageLimit === '' ? null : Number(formData.usageLimit);
        const startDate = formData.startDate ? new Date(formData.startDate) : null;
        const expiryDate = formData.expiryDate ? new Date(formData.expiryDate) : null;

        if (!code) nextErrors.code = 'Coupon code is required';
        else if (code.length < 3) nextErrors.code = 'Code must be at least 3 characters';

        if (!Number.isFinite(value) || value <= 0) nextErrors.value = 'Value must be greater than 0';
        if (formData.type === 'percent' && Number.isFinite(value) && value > 100) {
            nextErrors.value = 'Percent discount cannot exceed 100';
        }

        if (minPurchase !== null && (!Number.isFinite(minPurchase) || minPurchase < 0)) {
            nextErrors.minPurchase = 'Minimum purchase cannot be negative';
        }
        if (maxDiscount !== null && (!Number.isFinite(maxDiscount) || maxDiscount < 0)) {
            nextErrors.maxDiscount = 'Maximum discount cannot be negative';
        }
        if (usageLimit !== null && (!Number.isFinite(usageLimit) || usageLimit < 1)) {
            nextErrors.usageLimit = 'Usage limit must be at least 1';
        }
        if (startDate && Number.isNaN(startDate.getTime())) nextErrors.startDate = 'Start date is invalid';
        if (expiryDate && Number.isNaN(expiryDate.getTime())) nextErrors.expiryDate = 'Expiry date is invalid';
        if (startDate && expiryDate && startDate >= expiryDate) nextErrors.expiryDate = 'Expiry date must be later than start date';

        setErrors(nextErrors);
        return nextErrors;
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        const validationErrors = validate();
        if (hasValidationErrors(validationErrors)) {
            notify.error('Please fix form validation errors');
            return;
        }

        try {
            setIsSaving(true);
            const payload = {
                code: formData.code.trim().toUpperCase(),
                description: formData.description.trim(),
                type: formData.type,
                value: Number(formData.value),
                minPurchase: formData.minPurchase === '' ? null : Number(formData.minPurchase),
                maxDiscount: formData.maxDiscount === '' ? null : Number(formData.maxDiscount),
                usageLimit: formData.usageLimit === '' ? null : Number(formData.usageLimit),
                startDate: formData.startDate || null,
                expiryDate: formData.expiryDate || null,
                status: formData.status,
            };

            if (isEdit) {
                await couponService.updateCoupon(id, payload);
                notify.success('Coupon updated successfully');
            } else {
                await couponService.createCoupon(payload);
                notify.success('Coupon created successfully');
            }

            navigate('/admin/coupons');
        } catch (error) {
            const mapped = applyServerFieldErrors(setErrors, error?.errors || error?.data?.errors || error?.response?.data?.errors);
            if (hasValidationErrors(mapped)) {
                notify.error('Please fix form validation errors');
            } else {
                notify.error(error, `Failed to ${isEdit ? 'update' : 'create'} coupon`);
            }
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex h-[420px] items-center justify-center">
                <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
                    <div className="mx-auto mb-4 h-16 w-16 animate-spin rounded-full border-b-4 border-slate-700" />
                    <p className="text-lg font-semibold text-slate-800">Loading coupon form...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-900 via-slate-800 to-cyan-900 p-6 text-white shadow-lg sm:p-8">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-200/80">Coupon Studio</p>
                <h1 className="mt-2 text-3xl font-black leading-tight sm:text-4xl">{isEdit ? 'Edit Coupon' : 'Create Coupon'}</h1>
                <p className="mt-2 text-slate-200/90">Configure checkout coupon rules and validity window.</p>
            </div>

            <form onSubmit={handleSubmit} noValidate className="space-y-6 rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-[0_10px_30px_rgba(15,23,42,0.08)] sm:p-7">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">Code *</label>
                        <input name="code" value={formData.code} onChange={handleChange} placeholder="SAVE20" className={`w-full rounded-xl border px-4 py-3 ${getFieldBorderClass(errors, 'code')}`} />
                        {errors.code && <p className="mt-1 text-sm text-red-600">{errors.code}</p>}
                    </div>
                    <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">Type *</label>
                        <select name="type" value={formData.type} onChange={handleChange} className={`w-full rounded-xl border px-4 py-3 ${getFieldBorderClass(errors, 'type')}`}>
                            <option value="percent">Percent</option>
                            <option value="fixed">Fixed</option>
                        </select>
                    </div>
                    <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">Value *</label>
                        <input type="number" name="value" value={formData.value} onChange={handleChange} min="0" step={formData.type === 'percent' ? '1' : '0.01'} className={`w-full rounded-xl border px-4 py-3 ${getFieldBorderClass(errors, 'value')}`} />
                        {errors.value && <p className="mt-1 text-sm text-red-600">{errors.value}</p>}
                    </div>
                    <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">Status *</label>
                        <select name="status" value={formData.status} onChange={handleChange} className={`w-full rounded-xl border px-4 py-3 ${getFieldBorderClass(errors, 'status')}`}>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                        </select>
                    </div>
                    <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">Min Purchase</label>
                        <input type="number" name="minPurchase" value={formData.minPurchase} onChange={handleChange} min="0" step="0.01" className={`w-full rounded-xl border px-4 py-3 ${getFieldBorderClass(errors, 'minPurchase')}`} />
                        {errors.minPurchase && <p className="mt-1 text-sm text-red-600">{errors.minPurchase}</p>}
                    </div>
                    <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">Max Discount</label>
                        <input type="number" name="maxDiscount" value={formData.maxDiscount} onChange={handleChange} min="0" step="0.01" className={`w-full rounded-xl border px-4 py-3 ${getFieldBorderClass(errors, 'maxDiscount')}`} />
                        {errors.maxDiscount && <p className="mt-1 text-sm text-red-600">{errors.maxDiscount}</p>}
                    </div>
                    <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">Usage Limit</label>
                        <input type="number" name="usageLimit" value={formData.usageLimit} onChange={handleChange} min="1" step="1" className={`w-full rounded-xl border px-4 py-3 ${getFieldBorderClass(errors, 'usageLimit')}`} />
                        {errors.usageLimit && <p className="mt-1 text-sm text-red-600">{errors.usageLimit}</p>}
                    </div>
                    <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">Start Date</label>
                        <input type="datetime-local" name="startDate" value={formData.startDate} onChange={handleChange} className={`w-full rounded-xl border px-4 py-3 ${getFieldBorderClass(errors, 'startDate')}`} />
                        {errors.startDate && <p className="mt-1 text-sm text-red-600">{errors.startDate}</p>}
                    </div>
                    <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">Expiry Date</label>
                        <input type="datetime-local" name="expiryDate" value={formData.expiryDate} onChange={handleChange} className={`w-full rounded-xl border px-4 py-3 ${getFieldBorderClass(errors, 'expiryDate')}`} />
                        {errors.expiryDate && <p className="mt-1 text-sm text-red-600">{errors.expiryDate}</p>}
                    </div>
                    <div className="md:col-span-2">
                        <label className="mb-2 block text-sm font-semibold text-slate-700">Description</label>
                        <textarea name="description" value={formData.description} onChange={handleChange} rows="3" className="w-full rounded-xl border border-slate-300 px-4 py-3" placeholder="Optional description for admin reference" />
                    </div>
                </div>

                <div className="sticky bottom-3 z-10 flex flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-white/90 p-3 shadow-[0_10px_30px_rgba(15,23,42,0.12)] backdrop-blur sm:flex-row">
                    <button type="button" onClick={() => navigate('/admin/coupons')} className="w-full rounded-xl border border-slate-300 bg-white px-6 py-3 font-semibold text-slate-800 transition-colors hover:bg-slate-100 sm:w-auto">
                        Cancel
                    </button>
                    <button type="submit" disabled={isSaving} className="w-full rounded-xl bg-indigo-400 px-6 py-3 font-bold text-slate-900 transition-colors hover:bg-indigo-300 disabled:opacity-50 sm:flex-1">
                        {isSaving ? 'Saving...' : isEdit ? 'Update Coupon' : 'Create Coupon'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default CouponForm;
