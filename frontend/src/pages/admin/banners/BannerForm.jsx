import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { API_CONFIG } from '../../../constants';
import notify from '../../../utils/notify';

const BannerForm = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEdit = Boolean(id);

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        link: '',
        linkType: '',
        linkTarget: '_self',
        sortOrder: 0,
        status: 'inactive',
        startDate: '',
        endDate: '',
    });

    const [image, setImage] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [existingImage, setExistingImage] = useState(null);
    const [discountOptions, setDiscountOptions] = useState([]);
    const [selectedDiscountId, setSelectedDiscountId] = useState('');
    const [errors, setErrors] = useState({});
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const getAuthHeader = () => {
        const token = localStorage.getItem('auth_token');
        return token ? { Authorization: `Bearer ${token}` } : {};
    };

    const getImageUrl = (path) => {
        if (!path) return '';
        if (/^https?:\/\//i.test(path)) return path;
        return `${API_CONFIG.BASE_URL}/uploads/${path}`;
    };

    useEffect(() => {
        loadDiscountOptions();
        if (isEdit) {
            loadBanner();
        }
    }, [id]);

    const loadDiscountOptions = async () => {
        try {
            const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.BANNERS}/discount-options`, {
                headers: {
                    ...getAuthHeader(),
                },
            });
            const data = await response.json();
            if (response.ok && data.success) {
                setDiscountOptions(Array.isArray(data.data) ? data.data : []);
            }
        } catch (error) {
            console.error('Error loading discounts:', error);
        }
    };

    const loadBanner = async () => {
        try {
            setIsLoading(true);
            const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.BANNERS}/${id}`);
            const data = await response.json();

            if (!response.ok || !data.success) {
                notify.error(data, 'Failed to load banner');
                return;
            }

            const banner = data.data;
            setFormData({
                title: banner.title || '',
                description: banner.description || '',
                link: banner.link || '',
                linkType: banner.linkType || banner.link_type || '',
                linkTarget: banner.linkTarget || '_self',
                sortOrder: banner.sortOrder || 0,
                status: banner.status || 'inactive',
                startDate: banner.startDate ? new Date(banner.startDate).toISOString().slice(0, 16) : '',
                endDate: banner.endDate ? new Date(banner.endDate).toISOString().slice(0, 16) : '',
            });

            const existingDiscountId = Array.isArray(banner.discountIds) && banner.discountIds.length > 0
                ? (banner.discountIds[0]?._id || banner.discountIds[0])
                : '';
            setSelectedDiscountId(existingDiscountId || '');
            setExistingImage(banner.image || null);
        } catch (error) {
            console.error('Error loading banner:', error);
            notify.error(error, 'Failed to load banner');
        } finally {
            setIsLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));

        if (name === 'linkType') {
            setFormData((prev) => ({ ...prev, linkType: value, link: '' }));
            setSelectedDiscountId('');
        }

        if (errors[name]) {
            setErrors((prev) => ({ ...prev, [name]: null }));
        }
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            notify.error('Please select an image file');
            setErrors((prev) => ({ ...prev, image: 'Please select an image file' }));
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            notify.error('Image must be less than 5MB');
            setErrors((prev) => ({ ...prev, image: 'Image must be less than 5MB' }));
            return;
        }

        setImage(file);
        setErrors((prev) => ({ ...prev, image: null }));

        const reader = new FileReader();
        reader.onloadend = () => {
            setImagePreview(reader.result);
        };
        reader.readAsDataURL(file);
    };

    const removeImage = () => {
        setImage(null);
        setImagePreview(null);
    };

    const removeExistingImage = () => {
        setExistingImage(null);
    };

    const validateForm = () => {
        const nextErrors = {};

        if (!formData.title.trim()) {
            nextErrors.title = 'Title is required';
        }

        if (!isEdit && !image && !existingImage) {
            nextErrors.image = 'Banner image is required';
        }

        if (!formData.linkType) {
            nextErrors.linkType = 'Link type is required';
        } else if (formData.linkType === 'discount') {
            if (!selectedDiscountId) nextErrors.discount = 'Please select a discount';
        } else if (!formData.link.trim()) {
            nextErrors.link = 'Redirect URL / SKU is required';
        }

        if (formData.status === 'scheduled' && !formData.startDate && !formData.endDate) {
            nextErrors.startDate = 'Start or end date required for scheduled banners';
        }

        setErrors(nextErrors);
        return Object.keys(nextErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) {
            notify.error('Please fix form errors');
            return;
        }

        try {
            setIsSaving(true);
            const payload = new FormData();

            Object.keys(formData).forEach((key) => {
                if (formData[key]) {
                    payload.append(key, formData[key]);
                }
            });

            payload.append('link_type', formData.linkType);

            if (formData.linkType === 'discount' && selectedDiscountId) {
                payload.append('discountIds', JSON.stringify([selectedDiscountId]));
                payload.append('discounts', JSON.stringify([selectedDiscountId]));
                payload.set('link', '');
            }

            if (image) {
                payload.append('image', image);
            }

            if (isEdit) {
                payload.append('keepExistingImage', existingImage ? 'true' : 'false');
            }

            const url = isEdit
                ? `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.BANNERS}/${id}`
                : `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.BANNERS}`;

            const response = await fetch(url, {
                method: isEdit ? 'PUT' : 'POST',
                headers: {
                    ...getAuthHeader(),
                },
                body: payload,
            });
            const data = await response.json();

            if (!response.ok || !data.success) {
                notify.error(data, `Failed to ${isEdit ? 'update' : 'create'} banner`);
                return;
            }

            notify.success(`Banner ${isEdit ? 'updated' : 'created'} successfully`);
            navigate('/admin/banners');
        } catch (error) {
            console.error('Error saving banner:', error);
            notify.error(error, 'Failed to save banner');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex h-[420px] items-center justify-center">
                <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
                    <div className="mx-auto mb-4 h-16 w-16 animate-spin rounded-full border-b-4 border-slate-700" />
                    <p className="text-lg font-semibold text-slate-800">Loading banner workspace...</p>
                    <p className="mt-1 text-sm text-slate-500">Preparing campaign details and assets</p>
                </div>
            </div>
        );
    }

    const hasBannerImage = Boolean(imagePreview || existingImage);

    return (
        <div className="relative w-full space-y-8 px-4 py-8">
            <div className="pointer-events-none absolute right-8 top-16 h-40 w-40 rounded-full bg-indigo-300/20 blur-3xl" />
            <div className="pointer-events-none absolute bottom-20 left-8 h-44 w-44 rounded-full bg-sky-300/20 blur-3xl" />

            <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 p-6 text-white shadow-[0_20px_60px_rgba(15,23,42,0.35)] sm:p-8">
                <div className="absolute -right-10 -top-20 h-48 w-48 rounded-full bg-indigo-400/20 blur-3xl" />
                <div className="absolute -bottom-20 -left-10 h-44 w-44 rounded-full bg-blue-300/20 blur-3xl" />
                <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-200/80">Banner Studio</p>
                        <h1 className="mt-2 text-3xl font-black leading-tight sm:text-4xl">
                            {isEdit ? 'Edit Banner' : 'Create Banner'}
                        </h1>
                        <p className="mt-1 text-xs font-semibold text-rose-200">Fields marked with * are required</p>
                        <p className="mt-2 text-slate-200/90">
                            {isEdit ? 'Refine campaign visuals, link behavior, and schedule' : 'Launch a polished promotional banner with targeted routing'}
                        </p>
                    </div>
                    <span className={`inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-bold ${
                        formData.status === 'active'
                            ? 'border-emerald-200 bg-emerald-100 text-emerald-800'
                            : formData.status === 'scheduled'
                                ? 'border-blue-200 bg-blue-100 text-blue-800'
                                : 'border-amber-200 bg-amber-100 text-amber-800'
                    }`}>
                        {formData.status || 'inactive'}
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm backdrop-blur">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Workflow</p>
                    <p className="mt-1 text-lg font-black text-slate-900">{isEdit ? 'Editing Existing Banner' : 'Creating New Banner'}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm backdrop-blur">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Image</p>
                    <p className="mt-1 text-lg font-black text-slate-900">{hasBannerImage ? 'Ready' : 'Not Added'}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm backdrop-blur">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Link Type</p>
                    <p className="mt-1 text-lg font-black text-slate-900">{formData.linkType || 'Not Selected'}</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} noValidate className="space-y-6">
                <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
                    <div className="order-2 space-y-6 lg:order-2">
                        <div className="rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-[0_10px_30px_rgba(15,23,42,0.08)] transition-all hover:shadow-[0_20px_40px_rgba(15,23,42,0.12)] sm:p-7">
                            <div className="mb-4 flex items-center justify-between">
                                <h2 className="text-xl font-black text-slate-900">Banner Image</h2>
                                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-indigo-200 bg-gradient-to-br from-indigo-100 to-blue-100 text-indigo-700">
                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14" />
                                    </svg>
                                </span>
                            </div>
                            <p className="mb-5 text-sm text-slate-500">Upload a clear banner image to boost campaign visibility.</p>

                            <div className="space-y-5">
                                <div>
                                    {hasBannerImage ? (
                                        <div className="group relative">
                                            <img
                                                src={imagePreview || getImageUrl(existingImage)}
                                                alt="Banner preview"
                                                className="h-48 w-full rounded-xl border-2 border-slate-200 object-cover"
                                            />
                                            <button
                                                type="button"
                                                onClick={imagePreview ? removeImage : removeExistingImage}
                                                className="absolute right-3 top-3 rounded-full bg-rose-500 p-2 text-white hover:bg-rose-600"
                                            >
                                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex h-48 items-center justify-center rounded-2xl border-2 border-dashed border-indigo-200 bg-gradient-to-br from-indigo-50 via-slate-50 to-blue-100">
                                            <div className="text-center">
                                                <svg className="mx-auto mb-2 h-12 w-12 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14" />
                                                </svg>
                                                <p className="text-sm font-semibold text-slate-600">No banner image</p>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                                        Banner Image {!isEdit && <span className="text-rose-500">*</span>}
                                    </label>
                                    <input
                                        type="file"
                                        accept="image/jpeg,image/png,image/gif,image/webp"
                                        onChange={handleImageChange}
                                        className={`block w-full cursor-pointer rounded-xl border bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:outline-none ${
                                            errors.image ? 'border-red-500' : 'border-slate-300'
                                        }`}
                                    />
                                    <p className="mt-2 text-sm text-slate-500">Upload image (JPG, PNG, GIF, WEBP - Max 5MB)</p>
                                    {errors.image && <p className="mt-2 text-sm text-red-600">{errors.image}</p>}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="order-1 space-y-6 lg:order-1">
                        <div className="space-y-6 rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-[0_10px_30px_rgba(15,23,42,0.08)] transition-all hover:shadow-[0_20px_40px_rgba(15,23,42,0.12)] sm:p-7">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-black text-slate-900">Campaign Details</h2>
                                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-indigo-200 bg-gradient-to-br from-indigo-100 to-sky-100 text-indigo-700">
                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6M7 4h10a2 2 0 012 2v12a2 2 0 01-2 2H7a2 2 0 01-2-2V6a2 2 0 012-2z" />
                                    </svg>
                                </span>
                            </div>
                            <p className="text-sm text-slate-500">Configure banner content, routing behavior, and campaign schedule.</p>

                            <div>
                                <label className="mb-2 block text-sm font-semibold text-slate-700">
                                    Title <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    name="title"
                                    value={formData.title}
                                    onChange={handleChange}
                                    className={`w-full rounded-xl border px-4 py-3 text-slate-900 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200 ${
                                        errors.title ? 'border-red-500' : 'border-slate-300'
                                    }`}
                                    placeholder="Enter banner title"
                                />
                                {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title}</p>}
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-semibold text-slate-700">Description</label>
                                <textarea
                                    name="description"
                                    value={formData.description}
                                    onChange={handleChange}
                                    rows="4"
                                    maxLength="500"
                                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"
                                    placeholder="Write a short campaign description"
                                />
                                <p className="mt-1 text-sm text-slate-500">{formData.description.length}/500</p>
                            </div>

                            <div className={`grid gap-4 ${formData.linkType ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
                                <div>
                                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                                        Link Type <span className="text-rose-500">*</span>
                                    </label>
                                    <select
                                        name="linkType"
                                        value={formData.linkType}
                                        onChange={handleChange}
                                        className={`w-full rounded-xl border px-4 py-3 text-slate-900 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200 ${
                                            errors.linkType ? 'border-red-500' : 'border-slate-300'
                                        }`}
                                    >
                                        <option value="">-- Select Link Type --</option>
                                        <option value="product">Product</option>
                                        <option value="category">Category</option>
                                        <option value="url">URL</option>
                                        <option value="discount">Discount</option>
                                    </select>
                                    {errors.linkType && <p className="mt-1 text-sm text-red-600">{errors.linkType}</p>}
                                </div>

                                {formData.linkType === 'discount' ? (
                                    <div>
                                        <label className="mb-2 block text-sm font-semibold text-slate-700">
                                            Discount <span className="text-rose-500">*</span>
                                        </label>
                                        <select
                                            value={selectedDiscountId}
                                            onChange={(e) => {
                                                setSelectedDiscountId(e.target.value);
                                                if (errors.discount) setErrors((prev) => ({ ...prev, discount: null }));
                                            }}
                                            className={`w-full rounded-xl border px-4 py-3 text-slate-900 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200 ${
                                                errors.discount ? 'border-red-500' : 'border-slate-300'
                                            }`}
                                        >
                                            <option value="">-- Select Discount --</option>
                                            {discountOptions.map((discount) => (
                                                <option key={discount._id} value={discount._id}>
                                                    {discount.title} ({discount.type === 'percentage' ? `${discount.value}%` : `$${discount.value}`})
                                                </option>
                                            ))}
                                        </select>
                                        {errors.discount && <p className="mt-1 text-sm text-red-600">{errors.discount}</p>}
                                    </div>
                                ) : formData.linkType ? (
                                    <div>
                                        <label className="mb-2 block text-sm font-semibold text-slate-700">
                                            Redirect URL / SKU <span className="text-rose-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            name="link"
                                            value={formData.link}
                                            onChange={handleChange}
                                            className={`w-full rounded-xl border px-4 py-3 text-slate-900 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200 ${
                                                errors.link ? 'border-red-500' : 'border-slate-300'
                                            }`}
                                            placeholder="e.g. /product/sku-123 OR /category/electronics OR https://example.com"
                                        />
                                        {errors.link && <p className="mt-1 text-sm text-red-600">{errors.link}</p>}
                                    </div>
                                ) : null}
                            </div>

                            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                                <div>
                                    <label className="mb-2 block text-sm font-semibold text-slate-700">Status</label>
                                    <select
                                        name="status"
                                        value={formData.status}
                                        onChange={handleChange}
                                        className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"
                                    >
                                        <option value="active">Active</option>
                                        <option value="inactive">Inactive</option>
                                        <option value="scheduled">Scheduled</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="mb-2 block text-sm font-semibold text-slate-700">Link Target</label>
                                    <select
                                        name="linkTarget"
                                        value={formData.linkTarget}
                                        onChange={handleChange}
                                        className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"
                                    >
                                        <option value="_self">Same Window</option>
                                        <option value="_blank">New Window</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="mb-2 block text-sm font-semibold text-slate-700">Sort Order</label>
                                    <input
                                        type="number"
                                        name="sortOrder"
                                        value={formData.sortOrder}
                                        onChange={handleChange}
                                        min="0"
                                        className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"
                                    />
                                </div>
                            </div>
                        </div>

                        {formData.status === 'scheduled' && (
                            <div className="rounded-3xl border border-blue-200 bg-blue-50/70 p-6 sm:p-7">
                                <h3 className="text-lg font-black text-blue-900">Schedule Window</h3>
                                <p className="mt-1 text-sm text-blue-700">Define when this banner should automatically run.</p>
                                <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <div>
                                        <label className="mb-2 block text-sm font-semibold text-blue-900">
                                            Start Date & Time <span className="text-rose-500">*</span>
                                        </label>
                                        <input
                                            type="datetime-local"
                                            name="startDate"
                                            value={formData.startDate}
                                            onChange={handleChange}
                                            className={`w-full rounded-xl border px-4 py-3 text-slate-900 focus:border-blue-400 focus:ring-2 focus:ring-blue-200 ${
                                                errors.startDate ? 'border-red-500' : 'border-blue-200'
                                            }`}
                                        />
                                        {errors.startDate && <p className="mt-1 text-sm text-red-600">{errors.startDate}</p>}
                                    </div>
                                    <div>
                                        <label className="mb-2 block text-sm font-semibold text-blue-900">End Date & Time</label>
                                        <input
                                            type="datetime-local"
                                            name="endDate"
                                            value={formData.endDate}
                                            onChange={handleChange}
                                            className="w-full rounded-xl border border-blue-200 px-4 py-3 text-slate-900 focus:border-blue-400 focus:ring-2 focus:ring-blue-200"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="sticky bottom-3 z-10 flex flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-white/90 p-3 shadow-[0_10px_30px_rgba(15,23,42,0.12)] backdrop-blur sm:flex-row">
                    <button
                        type="button"
                        onClick={() => navigate('/admin/banners')}
                        className="w-full rounded-xl border border-slate-300 bg-white px-6 py-3 font-semibold text-slate-800 transition-colors hover:bg-slate-100 sm:w-auto"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={isSaving}
                        className="w-full rounded-xl bg-indigo-400 px-6 py-3 font-bold text-slate-900 transition-colors hover:bg-indigo-300 disabled:opacity-50 sm:flex-1"
                    >
                        {isSaving ? 'Saving...' : isEdit ? 'Update Banner' : 'Create Banner'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default BannerForm;
