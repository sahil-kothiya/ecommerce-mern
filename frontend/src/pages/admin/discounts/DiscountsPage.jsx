import React, { useEffect, useMemo, useState } from 'react';
import notify from '../../../utils/notify';
import { ConfirmDialog, ErrorAlert, FieldError } from '../../../components/common';
import discountService from '../../../services/discountService';

const initialForm = {
    title: '',
    type: 'percentage',
    value: '',
    startsAt: '',
    endsAt: '',
    categories: [],
    products: [],
    isActive: true,
};

const toLocalInputDateTime = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const offset = date.getTimezoneOffset();
    const localDate = new Date(date.getTime() - offset * 60000);
    return localDate.toISOString().slice(0, 16);
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

    const { fieldMap, messages } = buildFieldMapFromArray(Array.isArray(data?.errors) ? data.errors : []);

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
}) => {
    const filteredItems = useMemo(() => {
        const q = searchValue.trim().toLowerCase();
        if (!q) return items;
        return items.filter((item) => (item.title || '').toLowerCase().includes(q));
    }, [items, searchValue]);

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
                                    <span className="line-clamp-1">{item.title}</span>
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
                            {item.title} x
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

const DiscountsPage = () => {
    const [discounts, setDiscounts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [products, setProducts] = useState([]);

    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState(initialForm);
    const [fieldErrors, setFieldErrors] = useState({});
    const [alertErrors, setAlertErrors] = useState([]);

    const [categorySearch, setCategorySearch] = useState('');
    const [productSearch, setProductSearch] = useState('');

    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [editingId, setEditingId] = useState(null);

    const [deleteTarget, setDeleteTarget] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setIsLoading(true);
            const [discountsResponse, optionsResponse] = await Promise.all([
                discountService.getDiscounts({ limit: 200 }),
                discountService.getFormOptions(),
            ]);

            setDiscounts(discountsResponse?.data?.discounts || []);
            setCategories(optionsResponse?.data?.categories || []);
            setProducts(optionsResponse?.data?.products || []);
        } catch (error) {
            const parsed = extractApiErrors(error);
            notify.error(parsed.message, 'Failed to load discounts');
        } finally {
            setIsLoading(false);
        }
    };

    const activeCount = useMemo(() => discounts.filter((item) => item.isActive).length, [discounts]);

    const openCreateForm = () => {
        setEditingId(null);
        setFormData(initialForm);
        setFieldErrors({});
        setAlertErrors([]);
        setCategorySearch('');
        setProductSearch('');
        setShowForm(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const closeForm = () => {
        setShowForm(false);
        setEditingId(null);
        setFieldErrors({});
        setAlertErrors([]);
        setCategorySearch('');
        setProductSearch('');
    };

    const setFieldValue = (field, value) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
        if (fieldErrors[field]) {
            setFieldErrors((prev) => ({ ...prev, [field]: null }));
        }
    };

    const toggleSelection = (field, value) => {
        setFormData((prev) => {
            const exists = prev[field].includes(value);
            const next = exists
                ? prev[field].filter((id) => id !== value)
                : [...prev[field], value];
            return { ...prev, [field]: next };
        });

        if (fieldErrors[field]) {
            setFieldErrors((prev) => ({ ...prev, [field]: null }));
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
            setAlertErrors(parsed.messages);
            notify.error(parsed.messages[0], 'Please fix form errors');
            return;
        }

        setIsSaving(true);
        setAlertErrors([]);

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

            if (editingId) {
                await discountService.updateDiscount(editingId, payload);
                notify.success('Discount updated successfully');
            } else {
                await discountService.createDiscount(payload);
                notify.success('Discount created successfully');
            }

            closeForm();
            setFormData(initialForm);
            await loadData();
        } catch (error) {
            const parsed = extractApiErrors(error);
            setFieldErrors(parsed.fieldMap);
            setAlertErrors(parsed.messages);
            notify.error(parsed.message, 'Failed to save discount');
        } finally {
            setIsSaving(false);
        }
    };

    const handleEdit = (discount) => {
        setEditingId(discount._id);
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

        setFieldErrors({});
        setAlertErrors([]);
        setShowForm(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const confirmDelete = async () => {
        if (!deleteTarget?._id) return;

        try {
            setIsDeleting(true);
            await discountService.deleteDiscount(deleteTarget._id);
            notify.success('Discount deleted successfully');
            if (editingId === deleteTarget._id) {
                closeForm();
                setFormData(initialForm);
            }
            setDeleteTarget(null);
            await loadData();
        } catch (error) {
            const parsed = extractApiErrors(error);
            notify.error(parsed.message, 'Failed to delete discount');
        } finally {
            setIsDeleting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex h-[420px] items-center justify-center">
                <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
                    <div className="mx-auto mb-4 h-16 w-16 animate-spin rounded-full border-b-4 border-slate-700" />
                    <p className="text-lg font-semibold text-slate-800">Loading discounts...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="relative w-full space-y-6 px-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-black text-slate-900">Discount List</h1>
                        <p className="mt-1 text-sm text-slate-600">
                            Total: <span className="font-semibold text-slate-900">{discounts.length}</span> | Active: <span className="font-semibold text-emerald-700">{activeCount}</span>
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={openCreateForm}
                        className="rounded-xl bg-indigo-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-indigo-600"
                    >
                        + Add Discount
                    </button>
                </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm overflow-x-auto">
                <table className="w-full min-w-[900px] text-sm">
                    <thead>
                        <tr className="border-b border-slate-200 text-left text-slate-600">
                            <th className="py-2 pr-2">Title</th>
                            <th className="py-2 pr-2">Type</th>
                            <th className="py-2 pr-2">Value</th>
                            <th className="py-2 pr-2">Categories</th>
                            <th className="py-2 pr-2">Products</th>
                            <th className="py-2 pr-2">Status</th>
                            <th className="py-2 pr-2">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {discounts.map((discount) => (
                            <tr key={discount._id} className="border-b border-slate-100">
                                <td className="py-2 pr-2 font-semibold text-slate-900">{discount.title}</td>
                                <td className="py-2 pr-2 capitalize">{discount.type}</td>
                                <td className="py-2 pr-2">{discount.type === 'percentage' ? `${discount.value}%` : `$${Number(discount.value).toFixed(2)}`}</td>
                                <td className="py-2 pr-2">{(discount.categories || []).length}</td>
                                <td className="py-2 pr-2">{(discount.products || []).length}</td>
                                <td className="py-2 pr-2">
                                    <span className={`rounded px-2 py-1 text-xs font-semibold ${discount.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-700'}`}>
                                        {discount.isActive ? 'Active' : 'Inactive'}
                                    </span>
                                </td>
                                <td className="py-2 pr-2">
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() => handleEdit(discount)}
                                            className="rounded bg-slate-900 px-3 py-1 text-xs font-semibold text-white hover:bg-slate-700"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setDeleteTarget(discount)}
                                            className="rounded border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-100"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {discounts.length === 0 && (
                            <tr>
                                <td colSpan="7" className="py-6 text-center text-slate-500">No discounts found. Please create one.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {showForm && (
                <form onSubmit={handleSubmit} noValidate className="space-y-6 rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-[0_10px_30px_rgba(15,23,42,0.08)] sm:p-7">
                    <div className="flex items-center justify-between gap-3">
                        <h2 className="text-xl font-black text-slate-900">{editingId ? 'Edit Discount' : 'Add Discount'}</h2>
                        <button
                            type="button"
                            onClick={closeForm}
                            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                        >
                            Close
                        </button>
                    </div>

                    <ErrorAlert
                        errors={alertErrors}
                        title="Please fix the following"
                        onClose={() => setAlertErrors([])}
                    />

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                            <label className="mb-2 block text-sm font-semibold text-slate-700">Title <span className="text-rose-500">*</span></label>
                            <input
                                type="text"
                                value={formData.title}
                                onChange={(event) => setFieldValue('title', event.target.value)}
                                placeholder="Enter discount title"
                                className={`w-full rounded-xl border px-4 py-3 text-slate-900 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200 ${fieldErrors.title ? 'border-red-500' : 'border-slate-300'}`}
                            />
                            <FieldError error={fieldErrors.title} />
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-semibold text-slate-700">Discount Type <span className="text-rose-500">*</span></label>
                            <select
                                value={formData.type}
                                onChange={(event) => {
                                    setFieldValue('type', event.target.value);
                                    setFieldValue('value', '');
                                }}
                                className={`w-full rounded-xl border px-4 py-3 text-slate-900 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200 ${fieldErrors.type ? 'border-red-500' : 'border-slate-300'}`}
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
                                onChange={(event) => setFieldValue('value', event.target.value)}
                                step={formData.type === 'percentage' ? '1' : '0.01'}
                                min={formData.type === 'percentage' ? '1' : '0.01'}
                                max={formData.type === 'percentage' ? '100' : undefined}
                                placeholder={formData.type === 'percentage' ? 'Enter integer percentage (1-100)' : 'Enter fixed amount'}
                                className={`w-full rounded-xl border px-4 py-3 text-slate-900 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200 ${fieldErrors.value ? 'border-red-500' : 'border-slate-300'}`}
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
                                className={`w-full rounded-xl border px-4 py-3 text-slate-900 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200 ${fieldErrors.startsAt ? 'border-red-500' : 'border-slate-300'}`}
                            />
                            <FieldError error={fieldErrors.startsAt} />
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-semibold text-slate-700">Ends At <span className="text-rose-500">*</span></label>
                            <input
                                type="datetime-local"
                                value={formData.endsAt}
                                onChange={(event) => setFieldValue('endsAt', event.target.value)}
                                className={`w-full rounded-xl border px-4 py-3 text-slate-900 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200 ${fieldErrors.endsAt ? 'border-red-500' : 'border-slate-300'}`}
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
                            onToggle={(id) => toggleSelection('categories', id)}
                            searchValue={categorySearch}
                            onSearch={setCategorySearch}
                            error={fieldErrors.categories}
                            accent="cyan"
                        />

                        <SelectionPanel
                            title="Products"
                            subtitle="Apply discount to selected products"
                            items={products}
                            selected={formData.products}
                            onToggle={(id) => toggleSelection('products', id)}
                            searchValue={productSearch}
                            onSearch={setProductSearch}
                            error={fieldErrors.products}
                            accent="amber"
                        />
                    </div>

                    <div className="flex flex-col items-center gap-3 sm:flex-row">
                        <button
                            type="button"
                            onClick={closeForm}
                            className="w-full rounded-xl border border-slate-300 bg-white px-6 py-3 font-semibold text-slate-800 transition-colors hover:bg-slate-100 sm:w-auto"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="w-full rounded-xl bg-emerald-400 px-6 py-3 font-bold text-slate-900 transition-colors hover:bg-emerald-300 disabled:opacity-50 sm:flex-1"
                        >
                            {isSaving ? 'Saving...' : editingId ? 'Update Discount' : 'Create Discount'}
                        </button>
                    </div>
                </form>
            )}

            <ConfirmDialog
                isOpen={Boolean(deleteTarget)}
                title="Delete Discount?"
                message="This discount will be permanently removed."
                highlightText={deleteTarget?.title || ''}
                confirmText={isDeleting ? 'Deleting...' : 'Delete'}
                cancelText="Cancel"
                isProcessing={isDeleting}
                onConfirm={confirmDelete}
                onCancel={() => setDeleteTarget(null)}
            />
        </div>
    );
};

export default DiscountsPage;
