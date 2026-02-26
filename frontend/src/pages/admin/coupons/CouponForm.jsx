import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useNavigate, useParams } from 'react-router-dom';
import notify from '../../../utils/notify';
import { logger } from '../../../utils/logger';
import couponService from '../../../services/couponService';

const toLocalInputDateTime = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const offset = date.getTimezoneOffset();
    const localDate = new Date(date.getTime() - offset * 60000);
    return localDate.toISOString().slice(0, 16);
};

const getDefaultCouponDateRange = () => {
    const start = new Date();
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
    return {
        startDate: toLocalInputDateTime(start),
        expiryDate: toLocalInputDateTime(end),
    };
};

const nullableNumber = (min, msg) =>
    yup.number().nullable()
        .transform((v, orig) => (orig === '' || orig === null || orig === undefined || Number.isNaN(v) ? null : v))
        .min(min, msg);

const schema = yup.object({
    code: yup.string().trim().required('Coupon code is required').min(3, 'Code must be at least 3 characters'),
    type: yup.string().oneOf(['percent', 'fixed']).required(),
    value: yup.number()
        .typeError('Value must be a number')
        .required('Value is required')
        .positive('Value must be greater than 0')
        .when('type', { is: 'percent', then: (s) => s.max(100, 'Percent discount cannot exceed 100') }),
    minPurchase: nullableNumber(0, 'Minimum purchase cannot be negative'),
    maxDiscount: nullableNumber(0, 'Maximum discount cannot be negative'),
    usageLimit: nullableNumber(1, 'Usage limit must be at least 1').integer('Usage limit must be an integer'),
    startDate: yup.string().nullable().default(''),
    expiryDate: yup.string().nullable().default('').test('after-start', 'Expiry date must be later than start date', function (v) {
        const { startDate } = this.parent;
        if (!v || !startDate) return true;
        return new Date(v) > new Date(startDate);
    }),
    status: yup.string().oneOf(['active', 'inactive']).required(),
    description: yup.string().default(''),
});

const CouponForm = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEdit = Boolean(id);

    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [defaultDateRange] = useState(() => getDefaultCouponDateRange());

    const { register, handleSubmit, formState: { errors }, reset, setError, watch } = useForm({
        resolver: yupResolver(schema),
        defaultValues: {
            code: '',
            description: '',
            type: 'percent',
            value: '',
            minPurchase: '',
            maxDiscount: '',
            usageLimit: '',
            startDate: defaultDateRange.startDate,
            expiryDate: defaultDateRange.expiryDate,
            status: 'active'
        },
        mode: 'onBlur',
    });

    const watchType = watch('type');

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
                reset({
                    code: coupon.code || '',
                    description: coupon.description || '',
                    type: coupon.type || 'percent',
                    value: coupon.value ?? '',
                    minPurchase: coupon.minPurchase ?? coupon.minOrderAmount ?? '',
                    maxDiscount: coupon.maxDiscount ?? '',
                    usageLimit: coupon.usageLimit ?? '',
                    startDate: toLocalInputDateTime(coupon.startDate) || defaultDateRange.startDate,
                    expiryDate: toLocalInputDateTime(coupon.expiryDate) || defaultDateRange.expiryDate,
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
    }, [id, isEdit, navigate, reset, defaultDateRange]);

    const onSubmit = async (data) => {
        try {
            setIsSaving(true);
            const minPurchaseValue = data.minPurchase === '' || data.minPurchase == null ? null : Number(data.minPurchase);
            const payload = {
                code: data.code.trim().toUpperCase(),
                description: data.description?.trim() || '',
                type: data.type,
                value: Number(data.value),
                minPurchase: minPurchaseValue,
                minOrderAmount: minPurchaseValue,
                maxDiscount: data.maxDiscount === '' || data.maxDiscount == null ? null : Number(data.maxDiscount),
                usageLimit: data.usageLimit === '' || data.usageLimit == null ? null : Number(data.usageLimit),
                startDate: data.startDate || null,
                expiryDate: data.expiryDate || null,
                status: data.status,
            };

            logger.info('[Admin Coupon] submit payload', {
                isEdit,
                couponId: id,
                minPurchase: payload.minPurchase,
                minOrderAmount: payload.minOrderAmount,
            });

            if (isEdit) {
                await couponService.updateCoupon(id, payload);
                notify.success('Coupon updated successfully');
            } else {
                await couponService.createCoupon(payload);
                notify.success('Coupon created successfully');
            }

            navigate('/admin/coupons');
        } catch (error) {
            const serverErrors = error?.errors || error?.data?.errors || error?.response?.data?.errors;
            if (Array.isArray(serverErrors) && serverErrors.length > 0) {
                serverErrors.forEach(({ field, message }) => { if (field) setError(field, { message }); });
                notify.error('Please fix form validation errors');
            } else {
                notify.error(error, `Failed to ${isEdit ? 'update' : 'create'} coupon`);
            }
        } finally {
            setIsSaving(false);
        }
    };

    const fc = (field) => `w-full rounded-xl border px-4 py-3 focus:outline-none focus:ring-2 ${errors[field] ? 'border-red-400 focus:ring-red-100 bg-red-50' : 'border-slate-300 focus:ring-cyan-100'}`;

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

            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6 rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-[0_10px_30px_rgba(15,23,42,0.08)] sm:p-7">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">Code *</label>
                        <input {...register('code')} placeholder="SAVE20" className={fc('code')} />
                        {errors.code && <p className="mt-1 text-sm text-red-600">{errors.code.message}</p>}
                    </div>
                    <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">Type *</label>
                        <select {...register('type')} className={fc('type')}>
                            <option value="percent">Percent</option>
                            <option value="fixed">Fixed</option>
                        </select>
                        {errors.type && <p className="mt-1 text-sm text-red-600">{errors.type.message}</p>}
                    </div>
                    <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">Value *</label>
                        <input {...register('value')} type="number" min="0" step={watchType === 'percent' ? '1' : '0.01'} className={fc('value')} />
                        {errors.value && <p className="mt-1 text-sm text-red-600">{errors.value.message}</p>}
                    </div>
                    <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">Status *</label>
                        <select {...register('status')} className={fc('status')}>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                        </select>
                        {errors.status && <p className="mt-1 text-sm text-red-600">{errors.status.message}</p>}
                    </div>
                    <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">Min Purchase</label>
                        <input {...register('minPurchase')} type="number" min="0" step="0.01" className={fc('minPurchase')} />
                        {errors.minPurchase && <p className="mt-1 text-sm text-red-600">{errors.minPurchase.message}</p>}
                    </div>
                    <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">Max Discount</label>
                        <input {...register('maxDiscount')} type="number" min="0" step="0.01" className={fc('maxDiscount')} />
                        {errors.maxDiscount && <p className="mt-1 text-sm text-red-600">{errors.maxDiscount.message}</p>}
                    </div>
                    <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">Usage Limit</label>
                        <input {...register('usageLimit')} type="number" min="1" step="1" className={fc('usageLimit')} />
                        {errors.usageLimit && <p className="mt-1 text-sm text-red-600">{errors.usageLimit.message}</p>}
                    </div>
                    <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">Start Date</label>
                        <input {...register('startDate')} type="datetime-local" className={fc('startDate')} />
                        {errors.startDate && <p className="mt-1 text-sm text-red-600">{errors.startDate.message}</p>}
                    </div>
                    <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">Expiry Date</label>
                        <input {...register('expiryDate')} type="datetime-local" className={fc('expiryDate')} />
                        {errors.expiryDate && <p className="mt-1 text-sm text-red-600">{errors.expiryDate.message}</p>}
                    </div>
                    <div className="md:col-span-2">
                        <label className="mb-2 block text-sm font-semibold text-slate-700">Description</label>
                        <textarea {...register('description')} rows="3" className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-cyan-100" placeholder="Optional description for admin reference" />
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
