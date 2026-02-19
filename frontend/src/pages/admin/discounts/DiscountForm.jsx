import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import notify from '../../../utils/notify';
import { FieldError } from '../../../components/common';
import discountService from '../../../services/discountService';
import { clearFieldError, getFieldBorderClass, hasValidationErrors, mapServerFieldErrors } from '../../../utils/formValidation';

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

const createInitialForm = () => {
    const { startsAt, endsAt } = getDefaultDateRange();
    return {
        title: '',
        type: 'percentage',
        value: '',
        startsAt,
        endsAt,
        categories: [],
        products: [],
        isActive: true,
    };
};

const buildFieldMapFromArray = (errors = []) => {
    const fieldMap = {};
    const messages = [];

    errors.forEach((error) => {
        if (typeof error === 'string') {
            messages.push(error);
            return;
        }

        if (error?.field && error?.message) {
            if (!fieldMap[error.field]) fieldMap[error.field] = error.message;
            messages.push(error.message);
            return;
        }

        if (error?.message) {
            messages.push(error.message);
        }
    });

    return { fieldMap, messages: [...new Set(messages)] };
};

const extractApiErrors = (error) => {
    const data = error?.data || error?.response?.data || null;
    const message = data?.message || error?.message || 'Something went wrong';

    const fieldMap = mapServerFieldErrors(Array.isArray(data?.errors) ? data.errors : []);
    const messages = [...new Set(Object.values(fieldMap).filter(Boolean))];

    const finalMessages = messages.length > 0 ? messages : [message];
    return { fieldMap, messages: finalMessages, message };
};

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

    const [formData, setFormData] = useState(createInitialForm());
    const [fieldErrors, setFieldErrors] = useState({});

    const [categorySearch, setCategorySearch] = useState('');
    const [productSearch, setProductSearch] = useState('');

    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
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

                setFormData({
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
                setFormData(createInitialForm());
            }
        } catch (error) {
            const parsed = extractApiErrors(error);
            notify.error(parsed.message, 'Failed to load discount form');
            navigate('/admin/discounts');
        } finally {
            setIsLoading(false);
        }
    };

    const setFieldValue = (field, value) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
        clearFieldError(setFieldErrors, field);
    };

    const handleDiscountTypeChange = (nextType) => {
        if (nextType === 'percentage') {
            setFormData((prev) => ({ ...prev, type: nextType, value: 100 }));
        } else {
            setFormData((prev) => ({ ...prev, type: nextType, value: '' }));
        }

        if (fieldErrors.type || fieldErrors.value) {
            clearFieldError(setFieldErrors, 'type');
            clearFieldError(setFieldErrors, 'value');
        }
    };

    const handleDiscountValueChange = (rawValue) => {
        if (rawValue === '') {
            setFieldValue('value', '');
            return;
        }

        let numericValue = Number(rawValue);
        if (!Number.isFinite(numericValue)) {
            setFieldValue('value', '');
            return;
        }

        if (formData.type === 'percentage') {
            numericValue = Math.floor(numericValue);
            if (numericValue > 100) numericValue = 100;
            if (numericValue < 1) numericValue = 1;
        }

        setFieldValue('value', numericValue);
    };

    const toggleSelection = (field, value) => {
        setFormData((prev) => {
            const exists = prev[field].includes(value);
            const next = exists
                ? prev[field].filter((item) => item !== value)
                : [...prev[field], value];
            return { ...prev, [field]: next };
        });

        if (fieldErrors[field]) {
            clearFieldError(setFieldErrors, field);
        }
    };

    const validateClient = () => {
        const errors = [];

        if (!formData.title.trim()) {
            errors.push({ field: 'title', message: 'Title is required' });
        }

        const numeric = Number(formData.value);
        if (!Number.isFinite(numeric)) {
            errors.push({ field: 'value', message: 'Discount value is required' });
        } else if (formData.type === 'percentage') {
            if (!Number.isInteger(numeric)) {
                errors.push({ field: 'value', message: 'Percentage must be an integer' });
            }
            if (numeric < 1 || numeric > 100) {
                errors.push({ field: 'value', message: 'Percentage must be between 1 and 100' });
            }
        } else if (numeric <= 0) {
            errors.push({ field: 'value', message: 'Fixed amount must be greater than 0' });
        }

        const start = new Date(formData.startsAt);
        const end = new Date(formData.endsAt);

        if (!formData.startsAt || Number.isNaN(start.getTime())) {
            errors.push({ field: 'startsAt', message: 'Start date is required' });
        }

        if (!formData.endsAt || Number.isNaN(end.getTime())) {
            errors.push({ field: 'endsAt', message: 'End date is required' });
        }

        if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && start >= end) {
            errors.push({ field: 'endsAt', message: 'End date must be later than start date' });
        }

        if (formData.categories.length === 0 && formData.products.length === 0) {
            const message = 'Select at least one category or product';
            errors.push({ field: 'categories', message });
            errors.push({ field: 'products', message });
        }

        return errors;
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        const validationErrors = validateClient();
        if (validationErrors.length > 0) {
            const parsed = buildFieldMapFromArray(validationErrors);
            setFieldErrors(parsed.fieldMap);
            notify.error('Please fix form validation errors');
            return;
        }

        setIsSaving(true);

        try {
            const payload = {
                title: formData.title.trim(),
                type: formData.type,
                value: Number(formData.value),
                startsAt: formData.startsAt,
                endsAt: formData.endsAt,
                categories: formData.categories,
                products: formData.products,
                isActive: formData.isActive,
            };

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
            setFieldErrors(parsed.fieldMap);
            if (hasValidationErrors(parsed.fieldMap)) {
                notify.error('Please fix form validation errors');
            } else {
                notify.error(parsed.message, 'Failed to save discount');
            }
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
                        formData.isActive
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                            : 'bg-amber-100 text-amber-800 border-amber-200'
                    }`}>
                        {formData.isActive ? 'Active' : 'Inactive'}
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
                    <p className="mt-1 text-lg font-black text-slate-900 capitalize">{formData.type}</p>
                </div>
                <div className="bg-white/95 backdrop-blur border border-slate-200 rounded-2xl p-4 shadow-sm">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Targets</p>
                    <p className="mt-1 text-lg font-black text-slate-900">{(formData.categories || []).length + (formData.products || []).length} Selected</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} noValidate className="space-y-6 rounded-3xl border border-slate-200 bg-white/95 backdrop-blur p-6 shadow-[0_10px_30px_rgba(15,23,42,0.08)] sm:p-7">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">Title <span className="text-rose-500">*</span></label>
                        <input
                            type="text"
                            value={formData.title}
                            onChange={(event) => setFieldValue('title', event.target.value)}
                            placeholder="Enter discount title"
                            className={`w-full rounded-xl border px-4 py-3 text-slate-900 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200 ${getFieldBorderClass(fieldErrors, 'title')}`}
                        />
                        <FieldError error={fieldErrors.title} />
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">Discount Type <span className="text-rose-500">*</span></label>
                        <select
                            value={formData.type}
                            onChange={(event) => handleDiscountTypeChange(event.target.value)}
                            className={`w-full rounded-xl border px-4 py-3 text-slate-900 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200 ${getFieldBorderClass(fieldErrors, 'type')}`}
                        >
                            <option value="percentage">Percentage</option>
                            <option value="fixed">Fixed Amount</option>
                        </select>
                        <FieldError error={fieldErrors.type} />
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">Discount Value <span className="text-rose-500">*</span></label>
                        <input
                            type="number"
                            value={formData.value}
                            onChange={(event) => handleDiscountValueChange(event.target.value)}
                            step={formData.type === 'percentage' ? '1' : '0.01'}
                            min={formData.type === 'percentage' ? '1' : '0.01'}
                            max={formData.type === 'percentage' ? '100' : undefined}
                            placeholder={formData.type === 'percentage' ? 'Enter integer percentage (1-100)' : 'Enter fixed amount'}
                            className={`w-full rounded-xl border px-4 py-3 text-slate-900 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200 ${getFieldBorderClass(fieldErrors, 'value')}`}
                        />
                        <FieldError error={fieldErrors.value} />
                    </div>

                    <div className="flex items-center gap-2 pt-8">
                        <input
                            id="discount-active"
                            type="checkbox"
                            checked={formData.isActive}
                            onChange={(event) => setFieldValue('isActive', event.target.checked)}
                            className="h-4 w-4"
                        />
                        <label htmlFor="discount-active" className="text-sm font-semibold text-slate-700">Active</label>
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">Starts At <span className="text-rose-500">*</span></label>
                        <input
                            type="datetime-local"
                            value={formData.startsAt}
                            onChange={(event) => setFieldValue('startsAt', event.target.value)}
                            className={`w-full rounded-xl border px-4 py-3 text-slate-900 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200 ${getFieldBorderClass(fieldErrors, 'startsAt')}`}
                        />
                        <FieldError error={fieldErrors.startsAt} />
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">Ends At <span className="text-rose-500">*</span></label>
                        <input
                            type="datetime-local"
                            value={formData.endsAt}
                            onChange={(event) => setFieldValue('endsAt', event.target.value)}
                            className={`w-full rounded-xl border px-4 py-3 text-slate-900 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200 ${getFieldBorderClass(fieldErrors, 'endsAt')}`}
                        />
                        <FieldError error={fieldErrors.endsAt} />
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    <SelectionPanel
                        title="Categories"
                        subtitle="Apply discount to selected categories"
                        items={categories}
                        selected={formData.categories}
                        onToggle={(itemId) => toggleSelection('categories', itemId)}
                        searchValue={categorySearch}
                        onSearch={setCategorySearch}
                        error={fieldErrors.categories}
                        accent="cyan"
                    />

                    <SelectionPanel
                        title="Products"
                        subtitle="Active products from product index list"
                        items={products}
                        selected={formData.products}
                        onToggle={(itemId) => toggleSelection('products', itemId)}
                        searchValue={productSearch}
                        onSearch={setProductSearch}
                        error={fieldErrors.products}
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
