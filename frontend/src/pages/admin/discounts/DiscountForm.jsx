import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import notify from '../../../utils/notify';
import { FieldError } from '../../../components/common';
import discountService from '../../../services/discountService';

const toLocalInputDateTime = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const offset = date.getTimezoneOffset();
    const localDate = new Date(date.getTime() - offset * 60000);
    return localDate.toISOString().slice(0, 16);
};

const getDefaultDateRange = () => {
    const now = new Date();
    const nextDay = new Date(now);
    nextDay.setDate(nextDay.getDate() + 1);

    return {
        startsAt: toLocalInputDateTime(now),
        endsAt: toLocalInputDateTime(nextDay),
    };
};


const buildFieldMapFromArray = (errors = []) => {
    const fieldMap = {};
    errors.forEach((error) => {
        if (error?.field && error?.message && !fieldMap[error.field]) {
            fieldMap[error.field] = error.message;
        }
    });
    return fieldMap;
};

const extractApiErrors = (error) => {
    const data = error?.data || error?.response?.data || null;
    const message = data?.message || error?.message || 'Something went wrong';
    const fieldMap = {};
    (Array.isArray(data?.errors) ? data.errors : []).forEach(({ field, message: msg }) => {
        if (field && !fieldMap[field]) fieldMap[field] = msg;
    });
    return { fieldMap, message };
};

const schema = yup.object({
    title: yup.string().trim().required('Title is required'),
    type: yup.string().oneOf(['percentage', 'fixed']).required(),
    value: yup.number()
        .typeError('Discount value is required')
        .required('Discount value is required')
        .test('valid-value', 'Invalid value', function (val) {
            const { type } = this.parent;
            if (type === 'percentage') {
                if (!Number.isInteger(val)) return this.createError({ message: 'Percentage must be an integer' });
                if (val < 1 || val > 100) return this.createError({ message: 'Percentage must be between 1 and 100' });
            } else if (val <= 0) {
                return this.createError({ message: 'Fixed amount must be greater than 0' });
            }
            return true;
        }),
    startsAt: yup.string().required('Start date is required'),
    endsAt: yup.string()
        .required('End date is required')
        .test('after-start', 'End date must be later than start date', function (val) {
            const { startsAt } = this.parent;
            if (!val || !startsAt) return true;
            return new Date(val) > new Date(startsAt);
        }),
    isActive: yup.boolean().default(true),
    categories: yup.array().of(yup.string()).default([]),
    products: yup.array().of(yup.string()).default([]),
});

const SelectionPanel = ({
    title,
    subtitle,
    items,
    selected,
    onToggle,
    searchValue,
    onSearch,
    error,
    accent = 'cyan',
    showItemId = false,
    showProductMeta = false,
}) => {
    const filteredItems = useMemo(() => {
        const q = searchValue.trim().toLowerCase();
        if (!q) return items;
        return items.filter((item) => {
            const title = (item.title || '').toLowerCase();
            const shortId = String(item._id || '').slice(0, 8).toLowerCase();
            const categoryTitle = (item.category?.title || '').toLowerCase();
            const brandTitle = (item.brand?.title || '').toLowerCase();
            return title.includes(q) || shortId.includes(q) || categoryTitle.includes(q) || brandTitle.includes(q);
        });
    }, [items, searchValue]);

    const titleCounts = useMemo(() => {
        const map = new Map();
        items.forEach((item) => {
            const key = (item.title || '').trim().toLowerCase();
            map.set(key, (map.get(key) || 0) + 1);
        });
        return map;
    }, [items]);

    const getDisplayLabel = (item) => {
        const rawTitle = item.title || 'Untitled';
        const titleKey = rawTitle.trim().toLowerCase();
        const isDuplicateTitle = (titleCounts.get(titleKey) || 0) > 1;

        if (!isDuplicateTitle) {
            return rawTitle;
        }

        const suffix = item.baseSku || item.slug || String(item._id).slice(-6);
        return `${rawTitle} (${suffix})`;
    };

    const selectedItems = useMemo(
        () => items.filter((item) => selected.includes(item._id)),
        [items, selected],
    );

    const accentStyles = {
        cyan: 'from-cyan-50 to-sky-50 border-cyan-200 text-cyan-800',
        amber: 'from-amber-50 to-orange-50 border-amber-200 text-amber-800',
    };

    return (
        <div className={`rounded-2xl border bg-gradient-to-br p-4 ${accentStyles[accent] || accentStyles.cyan}`}>
            <div className="mb-3 flex items-center justify-between">
                <div>
                    <h3 className="text-sm font-black uppercase tracking-[0.14em]">{title}</h3>
                    <p className="mt-1 text-xs opacity-80">{subtitle}</p>
                </div>
                <span className="rounded-lg bg-white/80 px-2.5 py-1 text-xs font-bold">{selected.length} selected</span>
            </div>

            <input
                type="text"
                value={searchValue}
                onChange={(event) => onSearch(event.target.value)}
                placeholder={`Search ${title.toLowerCase()}...`}
                className="mb-3 w-full rounded-xl border border-white/80 bg-white px-3 py-2 text-sm text-slate-800 focus:border-slate-300 focus:outline-none"
            />

            <div className="max-h-52 overflow-y-auto rounded-xl border border-white/80 bg-white p-2">
                {filteredItems.length === 0 ? (
                    <p className="py-6 text-center text-sm text-slate-500">No items found</p>
                ) : (
                    <div className="space-y-1.5">
                        {filteredItems.map((item) => {
                            const checked = selected.includes(item._id);
                            return (
                                <label
                                    key={item._id}
                                    className={`flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm ${checked ? 'bg-slate-100' : 'hover:bg-slate-50'}`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={checked}
                                        onChange={() => onToggle(item._id)}
                                        className="h-4 w-4"
                                    />
                                    <span className="min-w-0">
                                        <span className="block line-clamp-1">{getDisplayLabel(item)}</span>
                                        {showProductMeta ? (
                                            <span className="block text-xs text-slate-500">
                                                ID: {String(item._id).slice(0, 8)} | {item.category?.title || 'N/A'} | {item.brand?.title || 'N/A'} | ${item.basePrice ?? 0}
                                            </span>
                                        ) : showItemId && (
                                            <span className="block text-xs text-slate-500">ID: {String(item._id).slice(0, 8)}</span>
                                        )}
                                    </span>
                                </label>
                            );
                        })}
                    </div>
                )}
            </div>

            <FieldError error={error} className="mt-2" />

            {selectedItems.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                    {selectedItems.map((item) => (
                        <button
                            key={item._id}
                            type="button"
                            onClick={() => onToggle(item._id)}
                            className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                        >
                            {getDisplayLabel(item)} ({String(item._id).slice(0, 8)}) x
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

const DiscountForm = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEdit = Boolean(id);

    const [categories, setCategories] = useState([]);
    const [products, setProducts] = useState([]);
    const [categorySearch, setCategorySearch] = useState('');
    const [productSearch, setProductSearch] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const { register, handleSubmit, reset, setError, watch, setValue, formState: { errors } } = useForm({
        resolver: yupResolver(schema),
        defaultValues: {
            title: '', type: 'percentage', value: 100,
            startsAt: '', endsAt: '', isActive: true,
            categories: [], products: [],
        },
        mode: 'onBlur',
    });

    const watchType = watch('type', 'percentage');
    const watchIsActive = watch('isActive', true);
    const selectedCategories = watch('categories', []);
    const selectedProducts = watch('products', []);

    useEffect(() => {
        const { startsAt, endsAt } = getDefaultDateRange();
        reset((prev) => ({ ...prev, startsAt, endsAt }));
        loadData();
    }, [id]);

    const loadData = async () => {
        try {
            setIsLoading(true);
            const [optionsResponse, activeProducts] = await Promise.all([
                discountService.getFormOptions(),
                discountService.getAllActiveProducts({ limit: 200 }),
            ]);
            setCategories(optionsResponse?.data?.categories || []);
            setProducts(activeProducts);

            if (isEdit) {
                const discountResponse = await discountService.getDiscountById(id);
                const discount = discountResponse?.data;
                if (!discount) {
                    notify.error('Discount not found');
                    navigate('/admin/discounts');
                    return;
                }
                reset({
                    title: discount.title || '',
                    type: discount.type || 'percentage',
                    value: discount.value ?? '',
                    startsAt: toLocalInputDateTime(discount.startsAt),
                    endsAt: toLocalInputDateTime(discount.endsAt),
                    categories: (discount.categories || []).map((item) => item._id || item),
                    products: (discount.products || []).map((item) => item._id || item),
                    isActive: Boolean(discount.isActive),
                });
            } else {
                const { startsAt, endsAt } = getDefaultDateRange();
                reset({ title: '', type: 'percentage', value: 100, startsAt, endsAt, isActive: true, categories: [], products: [] });
            }
        } catch (error) {
            const parsed = extractApiErrors(error);
            notify.error(parsed.message, 'Failed to load discount form');
            navigate('/admin/discounts');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDiscountTypeChange = (nextType) => {
        setValue('type', nextType);
        setValue('value', nextType === 'percentage' ? 100 : '');
    };

    const handleDiscountValueChange = (rawValue) => {
        if (rawValue === '') { setValue('value', ''); return; }
        let numericValue = Number(rawValue);
        if (!Number.isFinite(numericValue)) { setValue('value', ''); return; }
        if (watchType === 'percentage') {
            numericValue = Math.floor(numericValue);
            if (numericValue > 100) numericValue = 100;
            if (numericValue < 1) numericValue = 1;
        }
        setValue('value', numericValue);
    };

    const toggleSelection = (field, value) => {
        const current = (field === 'categories' ? selectedCategories : selectedProducts) || [];
        const next = current.includes(value) ? current.filter((item) => item !== value) : [...current, value];
        setValue(field, next);
    };

    const onSubmit = async (data) => {
        if (data.categories.length === 0 && data.products.length === 0) {
            setError('categories', { message: 'Select at least one category or product' });
            setError('products', { message: 'Select at least one category or product' });
            notify.error('Please fix form validation errors');
            return;
        }

        setIsSaving(true);
        try {
            const payload = { ...data, value: Number(data.value) };
            if (isEdit) {
                await discountService.updateDiscount(id, payload);
                notify.success('Discount updated successfully');
            } else {
                await discountService.createDiscount(payload);
                notify.success('Discount created successfully');
            }
            navigate('/admin/discounts');
        } catch (error) {
            const parsed = extractApiErrors(error);
            Object.entries(parsed.fieldMap).forEach(([field, message]) => setError(field, { message }));
            notify.error(parsed.message, 'Failed to save discount');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex h-[420px] items-center justify-center">
                <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
                    <div className="mx-auto mb-4 h-16 w-16 animate-spin rounded-full border-b-4 border-slate-700"></div>
                    <p className="text-lg font-semibold text-slate-800">Loading discount workspace...</p>
                    <p className="mt-1 text-sm text-slate-500">Preparing categories, products and discount config</p>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full px-4 space-y-8 relative">
            <div className="pointer-events-none absolute top-16 right-8 h-40 w-40 rounded-full bg-cyan-300/20 blur-3xl"></div>
            <div className="pointer-events-none absolute bottom-20 left-8 h-44 w-44 rounded-full bg-sky-300/20 blur-3xl"></div>

            <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-900 via-slate-800 to-cyan-900 p-6 sm:p-8 text-white shadow-[0_20px_60px_rgba(15,23,42,0.35)]">
                <div className="absolute -top-20 -right-10 h-48 w-48 rounded-full bg-cyan-400/20 blur-3xl"></div>
                <div className="absolute -bottom-20 -left-10 h-44 w-44 rounded-full bg-teal-300/20 blur-3xl"></div>
                <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-200/80">Discount Studio</p>
                        <h1 className="mt-2 text-3xl sm:text-4xl font-black leading-tight">{isEdit ? 'Edit Discount' : 'Create Discount'}</h1>
                        <p className="mt-2 text-slate-200/90">Configure percentage/fixed discount and apply to categories or products.</p>
                    </div>
                    <span className={`inline-flex items-center px-3 py-1.5 text-xs font-bold rounded-full border ${
                        watchIsActive
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                            : 'bg-amber-100 text-amber-800 border-amber-200'
                    }`}>
                        {watchIsActive ? 'Active' : 'Inactive'}
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white/95 backdrop-blur border border-slate-200 rounded-2xl p-4 shadow-sm">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Workflow</p>
                    <p className="mt-1 text-lg font-black text-slate-900">{isEdit ? 'Editing Existing Discount' : 'Creating New Discount'}</p>
                </div>
                <div className="bg-white/95 backdrop-blur border border-slate-200 rounded-2xl p-4 shadow-sm">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Type</p>
                    <p className="mt-1 text-lg font-black text-slate-900 capitalize">{watchType}</p>
                </div>
                <div className="bg-white/95 backdrop-blur border border-slate-200 rounded-2xl p-4 shadow-sm">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Targets</p>
                    <p className="mt-1 text-lg font-black text-slate-900">{(selectedCategories || []).length + (selectedProducts || []).length} Selected</p>
                </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6 rounded-3xl border border-slate-200 bg-white/95 backdrop-blur p-6 shadow-[0_10px_30px_rgba(15,23,42,0.08)] sm:p-7">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">Title <span className="text-rose-500">*</span></label>
                        <input
                            type="text"
                            {...register('title')}
                            placeholder="Enter discount title"
                            className={`w-full rounded-xl border px-4 py-3 text-slate-900 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200 ${errors.title ? 'border-red-400 bg-red-50' : 'border-slate-300'}`}
                        />
                        <FieldError error={errors.title?.message} />
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">Discount Type <span className="text-rose-500">*</span></label>
                        <select
                            value={watchType}
                            onChange={(event) => handleDiscountTypeChange(event.target.value)}
                            className={`w-full rounded-xl border px-4 py-3 text-slate-900 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200 ${errors.type ? 'border-red-400 bg-red-50' : 'border-slate-300'}`}
                        >
                            <option value="percentage">Percentage</option>
                            <option value="fixed">Fixed Amount</option>
                        </select>
                        <FieldError error={errors.type?.message} />
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">Discount Value <span className="text-rose-500">*</span></label>
                        <input
                            type="number"
                            value={watch('value')}
                            onChange={(event) => handleDiscountValueChange(event.target.value)}
                            step={watchType === 'percentage' ? '1' : '0.01'}
                            min={watchType === 'percentage' ? '1' : '0.01'}
                            max={watchType === 'percentage' ? '100' : undefined}
                            placeholder={watchType === 'percentage' ? 'Enter integer percentage (1-100)' : 'Enter fixed amount'}
                            className={`w-full rounded-xl border px-4 py-3 text-slate-900 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200 ${errors.value ? 'border-red-400 bg-red-50' : 'border-slate-300'}`}
                        />
                        <FieldError error={errors.value?.message} />
                    </div>

                    <div className="flex items-center gap-2 pt-8">
                        <input
                            id="discount-active"
                            type="checkbox"
                            {...register('isActive')}
                            className="h-4 w-4"
                        />
                        <label htmlFor="discount-active" className="text-sm font-semibold text-slate-700">Active</label>
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">Starts At <span className="text-rose-500">*</span></label>
                        <input
                            type="datetime-local"
                            {...register('startsAt')}
                            className={`w-full rounded-xl border px-4 py-3 text-slate-900 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200 ${errors.startsAt ? 'border-red-400 bg-red-50' : 'border-slate-300'}`}
                        />
                        <FieldError error={errors.startsAt?.message} />
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">Ends At <span className="text-rose-500">*</span></label>
                        <input
                            type="datetime-local"
                            {...register('endsAt')}
                            className={`w-full rounded-xl border px-4 py-3 text-slate-900 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200 ${errors.endsAt ? 'border-red-400 bg-red-50' : 'border-slate-300'}`}
                        />
                        <FieldError error={errors.endsAt?.message} />
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    <SelectionPanel
                        title="Categories"
                        subtitle="Apply discount to selected categories"
                        items={categories}
                        selected={selectedCategories}
                        onToggle={(itemId) => toggleSelection('categories', itemId)}
                        searchValue={categorySearch}
                        onSearch={setCategorySearch}
                        error={errors.categories?.message}
                        accent="cyan"
                    />

                    <SelectionPanel
                        title="Products"
                        subtitle="Active products from product index list"
                        items={products}
                        selected={selectedProducts}
                        onToggle={(itemId) => toggleSelection('products', itemId)}
                        searchValue={productSearch}
                        onSearch={setProductSearch}
                        error={errors.products?.message}
                        accent="amber"
                        showItemId={true}
                        showProductMeta={true}
                    />
                </div>

                <div className="sticky bottom-3 z-10 flex flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-white/90 p-3 shadow-[0_10px_30px_rgba(15,23,42,0.12)] backdrop-blur sm:flex-row">
                    <button
                        type="button"
                        onClick={() => navigate('/admin/discounts')}
                        className="w-full rounded-xl border border-slate-300 bg-white px-6 py-3 font-semibold text-slate-800 transition-colors hover:bg-slate-100 sm:w-auto"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={isSaving}
                        className="w-full rounded-xl bg-indigo-400 px-6 py-3 font-bold text-slate-900 transition-colors hover:bg-indigo-300 disabled:opacity-50 sm:flex-1"
                    >
                        {isSaving ? 'Saving...' : isEdit ? 'Update Discount' : 'Create Discount'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default DiscountForm;
