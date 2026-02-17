import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { API_CONFIG } from '../../../constants';
import authService from '../../../services/authService';
import notify from '../../../utils/notify';

const CategoryEditorPage = () => {
    const { id } = useParams();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const isEdit = Boolean(id);

    const initialForm = useMemo(() => ({
        title: '',
        seoTitle: '',
        summary: '',
        seoDescription: '',
        status: 'active',
        sortOrder: '',
        isFeatured: false,
        parentId: searchParams.get('parentId') || '',
        brandIds: [],
        filterIds: [],
        code: '',
        codeLocked: false,
    }), [searchParams]);

    const [formData, setFormData] = useState(initialForm);
    const [categories, setCategories] = useState([]);
    const [brands, setBrands] = useState([]);
    const [filters, setFilters] = useState([]);
    const [selectedFile, setSelectedFile] = useState(null);
    const [imagePreview, setImagePreview] = useState('');
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
            setFormData({
                title: category.title || '',
                seoTitle: category.seoTitle || '',
                summary: category.summary || '',
                seoDescription: category.seoDescription || '',
                status: category.status || 'active',
                sortOrder: category.sortOrder ?? '',
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

        setSelectedFile(file);
        const reader = new FileReader();
        reader.onloadend = () => setImagePreview(reader.result);
        reader.readAsDataURL(file);
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setIsSaving(true);

        try {
            const url = isEdit
                ? `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.CATEGORIES}/${id}`
                : `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.CATEGORIES}`;

            const payload = new FormData();
            payload.append('title', formData.title);
            payload.append('summary', formData.summary || '');
            payload.append('seoTitle', formData.seoTitle || '');
            payload.append('seoDescription', formData.seoDescription || '');
            payload.append('status', formData.status);
            payload.append('sortOrder', String(formData.sortOrder || ''));
            payload.append('isFeatured', String(formData.isFeatured));
            payload.append('codeLocked', String(formData.codeLocked));
            payload.append('brandIds', JSON.stringify(formData.brandIds));
            payload.append('filterIds', JSON.stringify(formData.filterIds));
            if (formData.parentId) payload.append('parentId', formData.parentId);
            if (selectedFile) payload.append('photo', selectedFile);

            const headers = authService.getAuthHeaders();
            delete headers['Content-Type'];

            const response = await fetch(url, {
                method: isEdit ? 'PUT' : 'POST',
                headers,
                body: payload,
            });

            const data = await response.json();
            if (!response.ok) {
                notify.error(data?.message || 'Failed to save category');
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
        setFormData((prev) => {
            const exists = prev[key].includes(value);
            return {
                ...prev,
                [key]: exists ? prev[key].filter((item) => item !== value) : [...prev[key], value],
            };
        });
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

    const selectedBrandsCount = formData.brandIds.length;
    const selectedFiltersCount = formData.filterIds.length;
    const filteredBrands = brands.filter((brand) => (brand.title || '').toLowerCase().includes(brandSearchTerm.toLowerCase()));
    const selectedBrandTitles = brands
        .filter((brand) => formData.brandIds.includes(String(brand._id)))
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
                        formData.status === 'active'
                            ? 'border-emerald-200 bg-emerald-100 text-emerald-800'
                            : 'border-amber-200 bg-amber-100 text-amber-800'
                    }`}>
                        {formData.status || 'inactive'}
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

            <form onSubmit={handleSubmit} className="space-y-6 pb-20">
                <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
                    <div className="order-2 space-y-6 lg:order-2">
                        <div className="rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-[0_10px_30px_rgba(15,23,42,0.08)] transition-all hover:shadow-[0_20px_40px_rgba(15,23,42,0.12)] sm:p-7">
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
                                    <div className="flex h-32 items-center justify-center rounded-2xl border-2 border-dashed border-indigo-200 bg-gradient-to-br from-indigo-50 via-slate-50 to-blue-100 md:h-36">
                                        <p className="text-sm font-semibold text-slate-600">No category image selected</p>
                                    </div>
                                )}

                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileChange}
                                    className="block w-full cursor-pointer rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900"
                                />
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
                                                            const checked = formData.brandIds.includes(brandId);
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
                                                        checked={formData.filterIds.includes(String(filter._id))}
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
                                        className="w-full rounded-xl border border-slate-300 px-4 py-2.5 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"
                                        placeholder="Enter category title"
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="mb-2 block text-sm font-semibold text-slate-700">SEO Title</label>
                                    <input
                                        className="w-full rounded-xl border border-slate-300 px-4 py-2.5 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"
                                        placeholder="Enter SEO title"
                                        value={formData.seoTitle}
                                        onChange={(e) => setFormData({ ...formData, seoTitle: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="mb-2 block text-sm font-semibold text-slate-700">Summary</label>
                                    <textarea
                                        className="w-full rounded-xl border border-slate-300 px-4 py-2.5 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"
                                        placeholder="Write summary..."
                                        rows={4}
                                        value={formData.summary}
                                        onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="mb-2 block text-sm font-semibold text-slate-700">SEO Description</label>
                                    <textarea
                                        className="w-full rounded-xl border border-slate-300 px-4 py-2.5 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"
                                        placeholder="Write SEO description..."
                                        rows={4}
                                        value={formData.seoDescription}
                                        onChange={(e) => setFormData({ ...formData, seoDescription: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                                <div>
                                    <label className="mb-2 block text-sm font-semibold text-slate-700">Status</label>
                                    <select
                                        className="w-full rounded-xl border border-slate-300 px-4 py-2.5 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"
                                        value={formData.status}
                                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                    >
                                        <option value="active">Active</option>
                                        <option value="inactive">Inactive</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="mb-2 block text-sm font-semibold text-slate-700">Sort Order</label>
                                    <input
                                        type="number"
                                        min="0"
                                        className="w-full rounded-xl border border-slate-300 px-4 py-2.5 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"
                                        placeholder="Enter sort order"
                                        value={formData.sortOrder}
                                        onChange={(e) => setFormData({ ...formData, sortOrder: e.target.value })}
                                    />
                                </div>
                                <div className="flex items-end">
                                    <label className="flex w-full items-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5">
                                        <input
                                            type="checkbox"
                                            checked={formData.isFeatured}
                                            onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked })}
                                            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                        />
                                        <span className="text-sm font-semibold text-slate-700">Featured Category</span>
                                    </label>
                                </div>
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-semibold text-slate-700">Parent Category</label>
                                <select
                                    className="w-full rounded-xl border border-slate-300 px-4 py-2.5 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"
                                    value={formData.parentId}
                                    onChange={(e) => setFormData({ ...formData, parentId: e.target.value })}
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
                                        readOnly
                                        className="rounded-xl border border-slate-300 bg-slate-100 px-4 py-2.5"
                                        value={formData.code}
                                        placeholder="Code"
                                    />
                                    <label className="flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5">
                                        <input
                                            type="checkbox"
                                            checked={formData.codeLocked}
                                            onChange={(e) => setFormData({ ...formData, codeLocked: e.target.checked })}
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
