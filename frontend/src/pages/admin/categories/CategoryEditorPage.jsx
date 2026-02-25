import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { API_CONFIG } from '../../../constants';
import authService from '../../../services/authService';
import notify from '../../../utils/notify';

const schema = yup.object({
    title: yup.string().trim().required('Title is required'),
    seoTitle: yup.string().default(''),
    summary: yup.string().default(''),
    seoDescription: yup.string().default(''),
    status: yup.string().oneOf(['active', 'inactive']).default('active'),
    sortOrder: yup.number().transform((v, orig) => (orig === '' ? undefined : v)).nullable().min(0, 'Sort order cannot be negative').default(undefined),
    isFeatured: yup.boolean().default(false),
    parentId: yup.string().default(''),
    brandIds: yup.array().of(yup.string()).default([]),
    filterIds: yup.array().of(yup.string()).default([]),
    code: yup.string().default(''),
    codeLocked: yup.boolean().default(false),
});

const CategoryEditorPage = () => {
    const { id } = useParams();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const isEdit = Boolean(id);

    const { register, handleSubmit, reset, setError, watch, setValue, formState: { errors } } = useForm({
        resolver: yupResolver(schema),
        defaultValues: {
            title: '',
            seoTitle: '',
            summary: '',
            seoDescription: '',
            status: 'active',
            sortOrder: undefined,
            isFeatured: false,
            parentId: searchParams.get('parentId') || '',
            brandIds: [],
            filterIds: [],
            code: '',
            codeLocked: false,
        },
        mode: 'onBlur',
    });

    const watchBrandIds = watch('brandIds', []);
    const watchFilterIds = watch('filterIds', []);
    const watchStatus = watch('status', 'active');

    const fc = (field) =>
        `w-full rounded-xl border px-4 py-2.5 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200 ${
            errors[field] ? 'border-red-400 bg-red-50 focus:ring-red-100' : 'border-slate-300'
        }`;

    const [categories, setCategories] = useState([]);
    const [brands, setBrands] = useState([]);
    const [filters, setFilters] = useState([]);
    const [selectedFile, setSelectedFile] = useState(null);
    const [imagePreview, setImagePreview] = useState('');
    const [photoError, setPhotoError] = useState('');
    const [isBrandPickerOpen, setIsBrandPickerOpen] = useState(false);
    const [brandSearchTerm, setBrandSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const brandPickerRef = useRef(null);

    useEffect(() => {
        loadDependencies();
    }, []);

    useEffect(() => {
        if (isEdit) {
            loadCategory();
        } else {
            setIsLoading(false);
        }
    }, [id]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (brandPickerRef.current && !brandPickerRef.current.contains(event.target)) {
                setIsBrandPickerOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const loadDependencies = async () => {
        try {
            const headers = authService.getAuthHeaders();
            const [catRes, brandRes, filterRes] = await Promise.all([
                fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.CATEGORIES}`, { headers }),
                fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.BRANDS}?page=1&limit=500`, { headers }),
                fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.CATEGORIES}/filters`, { headers }),
            ]);

            const catJson = await catRes.json();
            const brandJson = await brandRes.json();
            const filterJson = await filterRes.json();

            const categoryList = Array.isArray(catJson?.data)
                ? catJson.data
                : Array.isArray(catJson?.data?.items)
                    ? catJson.data.items
                    : [];

            const brandList = Array.isArray(brandJson?.data)
                ? brandJson.data
                : Array.isArray(brandJson?.data?.items)
                    ? brandJson.data.items
                    : [];

            const filterList = Array.isArray(filterJson?.data)
                ? filterJson.data
                : Array.isArray(filterJson?.data?.items)
                    ? filterJson.data.items
                    : [];

            setCategories(categoryList);
            setBrands(brandList);
            setFilters(filterList);
        } catch (error) {
            notify.error('Failed to load category dependencies');
        }
    };

    const loadCategory = async () => {
        try {
            setIsLoading(true);
            const headers = authService.getAuthHeaders();
            const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.CATEGORIES}/${id}`, { headers });
            const data = await response.json();

            if (!response.ok || !data?.data) {
                notify.error(data?.message || 'Failed to load category');
                navigate('/admin/categories');
                return;
            }

            const category = data.data;
            reset({
                title: category.title || '',
                seoTitle: category.seoTitle || '',
                summary: category.summary || '',
                seoDescription: category.seoDescription || '',
                status: category.status || 'active',
                sortOrder: category.sortOrder ?? undefined,
                isFeatured: Boolean(category.isFeatured),
                parentId: category.parentId || '',
                brandIds: Array.isArray(category.brandIds) ? category.brandIds.map((x) => String(x)) : [],
                filterIds: Array.isArray(category.filterIds) ? category.filterIds.map((x) => String(x)) : [],
                code: category.code || '',
                codeLocked: Boolean(category.codeLocked),
            });
            setImagePreview(category.photo ? `${API_CONFIG.BASE_URL}${category.photo}` : '');
        } catch (error) {
            notify.error('Failed to load category');
            navigate('/admin/categories');
        } finally {
            setIsLoading(false);
        }
    };

    const handleFileChange = (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            setPhotoError('Please select an image file');
            notify.error('Please select an image file');
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            setPhotoError('Image must be less than 5MB');
            notify.error('Image must be less than 5MB');
            return;
        }

        setSelectedFile(file);
        setPhotoError('');
        const reader = new FileReader();
        reader.onloadend = () => setImagePreview(reader.result);
        reader.readAsDataURL(file);
    };

    const onSubmit = async (data) => {
        setIsSaving(true);
        try {
            const url = isEdit
                ? `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.CATEGORIES}/${id}`
                : `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.CATEGORIES}`;

            const payload = new FormData();
            payload.append('title', data.title);
            payload.append('summary', data.summary || '');
            payload.append('seoTitle', data.seoTitle || '');
            payload.append('seoDescription', data.seoDescription || '');
            payload.append('status', data.status);
            payload.append('sortOrder', data.sortOrder != null ? String(data.sortOrder) : '');
            payload.append('isFeatured', String(data.isFeatured));
            payload.append('codeLocked', String(data.codeLocked));
            payload.append('brandIds', JSON.stringify(data.brandIds));
            payload.append('filterIds', JSON.stringify(data.filterIds));
            if (data.parentId) payload.append('parentId', data.parentId);
            if (selectedFile) payload.append('photo', selectedFile);

            const headers = authService.getAuthHeaders();
            delete headers['Content-Type'];

            const response = await fetch(url, {
                method: isEdit ? 'PUT' : 'POST',
                headers,
                body: payload,
            });

            const resData = await response.json();
            if (!response.ok) {
                if (Array.isArray(resData?.errors)) {
                    resData.errors.forEach(({ field, message }) => {
                        if (field) setError(field, { message });
                    });
                }
                notify.error(resData?.message || 'Failed to save category');
                return;
            }

            notify.success(`Category ${isEdit ? 'updated' : 'created'} successfully`);
            navigate('/admin/categories');
        } catch (error) {
            notify.error('Failed to save category');
        } finally {
            setIsSaving(false);
        }
    };

    const toggleArrayValue = (key, value) => {
        const current = key === 'brandIds' ? watchBrandIds : watchFilterIds;
        const next = current.includes(value) ? current.filter((item) => item !== value) : [...current, value];
        setValue(key, next);
    };

    if (isLoading) {
        return (
            <div className="flex h-[420px] items-center justify-center">
                <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
                    <div className="mx-auto mb-4 h-16 w-16 animate-spin rounded-full border-b-4 border-slate-700" />
                    <p className="text-lg font-semibold text-slate-800">Loading category workspace...</p>
                    <p className="mt-1 text-sm text-slate-500">Preparing fields and relations</p>
                </div>
            </div>
        );
    }

    const selectedBrandsCount = watchBrandIds.length;
    const selectedFiltersCount = watchFilterIds.length;
    const filteredBrands = brands.filter((brand) => (brand.title || '').toLowerCase().includes(brandSearchTerm.toLowerCase()));
    const selectedBrandTitles = brands
        .filter((brand) => watchBrandIds.includes(String(brand._id)))
        .map((brand) => brand.title);

    return (
        <div className="relative w-full space-y-8 px-4">
            <div className="pointer-events-none absolute right-8 top-16 h-40 w-40 rounded-full bg-indigo-300/20 blur-3xl" />
            <div className="pointer-events-none absolute bottom-20 left-8 h-44 w-44 rounded-full bg-blue-300/20 blur-3xl" />

            <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-900 via-slate-800 to-violet-900 p-6 text-white shadow-[0_20px_60px_rgba(15,23,42,0.35)] sm:p-8">
                <div className="absolute -right-10 -top-20 h-48 w-48 rounded-full bg-indigo-400/20 blur-3xl" />
                <div className="absolute -bottom-20 -left-10 h-44 w-44 rounded-full bg-sky-300/20 blur-3xl" />
                <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-200/80">Category Studio</p>
                        <h1 className="mt-2 text-3xl font-black leading-tight sm:text-4xl">
                            {isEdit ? 'Edit Category' : 'Create Category'}
                        </h1>
                        <p className="mt-2 text-slate-200/90">
                            {isEdit ? 'Refine SEO, hierarchy, and merchandising settings' : 'Build a polished category with complete catalog metadata'}
                        </p>
                    </div>
                    <span className={`inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-bold ${
                        watchStatus === 'active'
                            ? 'border-emerald-200 bg-emerald-100 text-emerald-800'
                            : 'border-amber-200 bg-amber-100 text-amber-800'
                    }`}>
                        {watchStatus || 'inactive'}
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
                <div className="rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm backdrop-blur">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Workflow</p>
                    <p className="mt-1 text-lg font-black text-slate-900">{isEdit ? 'Editing Existing Category' : 'Creating New Category'}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm backdrop-blur">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Media</p>
                    <p className="mt-1 text-lg font-black text-slate-900">{imagePreview ? 'Image Ready' : 'No Image'}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm backdrop-blur">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Brands</p>
                    <p className="mt-1 text-lg font-black text-slate-900">{selectedBrandsCount} Selected</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm backdrop-blur">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Filters</p>
                    <p className="mt-1 text-lg font-black text-slate-900">{selectedFiltersCount} Enabled</p>
                </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6 pb-20">
                <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
                    <div className="order-2 space-y-6 lg:order-2">
                        <div className="media-card">
                            <div className="mb-4 flex items-center justify-between">
                                <h2 className="text-xl font-black text-slate-900">Category Media</h2>
                                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-indigo-200 bg-gradient-to-br from-indigo-100 to-blue-100 text-indigo-700">
                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14" />
                                    </svg>
                                </span>
                            </div>
                            <p className="mb-5 text-sm text-slate-500">Upload a clear category image to improve navigation and discovery.</p>

                            <div className="space-y-5">
                                {imagePreview ? (
                                    <img src={imagePreview} alt="preview" className="h-32 w-full rounded-xl border-2 border-slate-200 object-cover md:h-36" />
                                ) : (
                                    <div className="media-preview-empty md:h-36">No category image selected</div>
                                )}

                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileChange}
                                    className={`media-file-input ${photoError ? 'border-red-500 focus:ring-red-200' : ''}`}
                                />
                                {photoError && <p className="text-sm text-red-600">{photoError}</p>}
                            </div>
                        </div>

                        <div className="rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-[0_10px_30px_rgba(15,23,42,0.08)] transition-all hover:shadow-[0_20px_40px_rgba(15,23,42,0.12)] sm:p-7">
                            <h2 className="text-xl font-black text-slate-900">Associations</h2>
                            <p className="mt-1 text-sm text-slate-500">Link brands and filter controls to shape storefront browsing behavior.</p>

                            <div className="mt-5 space-y-5">
                                <div>
                                    <label className="mb-2 block text-sm font-semibold text-slate-700">Associated Brands</label>
                                    <div className="relative" ref={brandPickerRef}>
                                        <button
                                            type="button"
                                            onClick={() => setIsBrandPickerOpen((prev) => !prev)}
                                            className="flex w-full items-center justify-between rounded-xl border border-slate-300 bg-white px-3 py-2 text-left text-sm text-slate-700 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"
                                        >
                                            <span className="truncate">
                                                {selectedBrandTitles.length > 0 ? selectedBrandTitles.join(', ') : 'Select associated brands'}
                                            </span>
                                            <svg className={`ml-2 h-4 w-4 text-slate-500 transition-transform ${isBrandPickerOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </button>

                                        {isBrandPickerOpen && (
                                            <div className="absolute z-30 mt-2 w-full rounded-xl border border-slate-300 bg-white p-2 shadow-lg">
                                                <input
                                                    type="text"
                                                    value={brandSearchTerm}
                                                    onChange={(e) => setBrandSearchTerm(e.target.value)}
                                                    placeholder="Search brands..."
                                                    className="mb-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"
                                                />
                                                <div className="max-h-56 overflow-y-auto rounded-lg border border-slate-200">
                                                    {filteredBrands.length === 0 ? (
                                                        <p className="px-3 py-2 text-sm text-slate-500">No brands found</p>
                                                    ) : (
                                                        filteredBrands.map((brand) => {
                                                            const brandId = String(brand._id);
                                                            const checked = watchBrandIds.includes(brandId);
                                                            return (
                                                                <button
                                                                    key={brand._id}
                                                                    type="button"
                                                                    onClick={() => toggleArrayValue('brandIds', brandId)}
                                                                    className="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                                                                >
                                                                    <span>{brand.title}</span>
                                                                    {checked && (
                                                                        <svg className="h-4 w-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                                        </svg>
                                                                    )}
                                                                </button>
                                                            );
                                                        })
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <label className="mb-2 block text-sm font-semibold text-slate-700">Enabled Filters</label>
                                    {filters.length === 0 ? (
                                        <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-500">
                                            No filters found. Default filters will be created automatically after reload.
                                        </p>
                                    ) : (
                                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                            {filters.map((filter) => (
                                                <label key={filter._id} className="flex items-center gap-2 text-sm text-slate-700">
                                                    <input
                                                        type="checkbox"
                                                        checked={(watchFilterIds || []).includes(String(filter._id))}
                                                        onChange={() => toggleArrayValue('filterIds', String(filter._id))}
                                                        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                                    />
                                                    {filter.title}
                                                </label>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="order-1 space-y-6 lg:order-1">
                        <div className="space-y-6 rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-[0_10px_30px_rgba(15,23,42,0.08)] transition-all hover:shadow-[0_20px_40px_rgba(15,23,42,0.12)] sm:p-7">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-black text-slate-900">Category Details</h2>
                                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-indigo-200 bg-gradient-to-br from-indigo-100 to-sky-100 text-indigo-700">
                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6M7 4h10a2 2 0 012 2v12a2 2 0 01-2 2H7a2 2 0 01-2-2V6a2 2 0 012-2z" />
                                    </svg>
                                </span>
                            </div>

                            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                                <div>
                                    <label className="mb-2 block text-sm font-semibold text-slate-700">Title *</label>
                                    <input
                                        {...register('title')}
                                        className={fc('title')}
                                        placeholder="Enter category title"
                                    />
                                    {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>}
                                </div>
                                <div>
                                    <label className="mb-2 block text-sm font-semibold text-slate-700">SEO Title</label>
                                    <input
                                        {...register('seoTitle')}
                                        className={fc('seoTitle')}
                                        placeholder="Enter SEO title"
                                    />
                                </div>
                                <div>
                                    <label className="mb-2 block text-sm font-semibold text-slate-700">Summary</label>
                                    <textarea
                                        {...register('summary')}
                                        className={fc('summary')}
                                        placeholder="Write summary..."
                                        rows={4}
                                    />
                                </div>
                                <div>
                                    <label className="mb-2 block text-sm font-semibold text-slate-700">SEO Description</label>
                                    <textarea
                                        {...register('seoDescription')}
                                        className={fc('seoDescription')}
                                        placeholder="Write SEO description..."
                                        rows={4}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                                <div>
                                    <label className="mb-2 block text-sm font-semibold text-slate-700">Status</label>
                                    <select
                                        {...register('status')}
                                        className={fc('status')}
                                    >
                                        <option value="active">Active</option>
                                        <option value="inactive">Inactive</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="mb-2 block text-sm font-semibold text-slate-700">Sort Order</label>
                                    <input
                                        {...register('sortOrder')}
                                        type="number"
                                        min="0"
                                        className={fc('sortOrder')}
                                        placeholder="Enter sort order"
                                    />
                                    {errors.sortOrder && <p className="mt-1 text-sm text-red-600">{errors.sortOrder.message}</p>}
                                </div>
                                <div className="flex items-end">
                                    <label className="flex w-full items-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5">
                                        <input
                                            {...register('isFeatured')}
                                            type="checkbox"
                                            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                        />
                                        <span className="text-sm font-semibold text-slate-700">Featured Category</span>
                                    </label>
                                </div>
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-semibold text-slate-700">Parent Category</label>
                                <select
                                    {...register('parentId')}
                                    className={fc('parentId')}
                                >
                                    <option value="">--Select any category--</option>
                                    {categories.filter((cat) => !isEdit || cat._id !== id).map((cat) => (
                                        <option key={cat._id} value={cat._id}>{cat.title}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {isEdit && (
                            <div className="rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-[0_10px_30px_rgba(15,23,42,0.08)] transition-all hover:shadow-[0_20px_40px_rgba(15,23,42,0.12)] sm:p-7">
                                <h2 className="text-xl font-black text-slate-900">Code Settings</h2>
                                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <input
                                        {...register('code')}
                                        readOnly
                                        className="rounded-xl border border-slate-300 bg-slate-100 px-4 py-2.5"
                                        placeholder="Code"
                                    />
                                    <label className="flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5">
                                        <input
                                            {...register('codeLocked')}
                                            type="checkbox"
                                            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                        />
                                        <span className="text-sm font-semibold text-slate-700">Prevent automatic code changes</span>
                                    </label>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="sticky bottom-3 z-10 flex flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-white/90 p-3 shadow-[0_10px_30px_rgba(15,23,42,0.12)] backdrop-blur sm:flex-row">
                    <button
                        type="button"
                        onClick={() => navigate('/admin/categories')}
                        className="w-full rounded-xl border border-slate-300 bg-white px-6 py-3 font-semibold text-slate-800 transition-colors hover:bg-slate-100 sm:w-auto"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={isSaving}
                        className="w-full rounded-xl bg-indigo-400 px-6 py-3 font-bold text-slate-900 transition-colors hover:bg-indigo-300 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-1"
                    >
                        {isSaving ? 'Saving...' : isEdit ? 'Update Category' : 'Create Category'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default CategoryEditorPage;
