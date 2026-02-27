import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { API_CONFIG } from '../../../constants';
import notify from '../../../utils/notify';
import authFetch from '../../../utils/authFetch.js';
import { logger } from '../../../utils/logger.js';

const schema = yup.object({
    title: yup.string().trim().required('Title is required'),
    description: yup.string().default(''),
    linkType: yup.string().required('Link type is required'),
    link: yup.string().when('linkType', {
        is: (v) => v && v !== 'discount',
        then: (s) => s.trim().required('Redirect URL / SKU is required'),
        otherwise: (s) => s.default(''),
    }),
    linkTarget: yup.string().oneOf(['_self', '_blank']).default('_self'),
    sortOrder: yup.number().min(0).default(0),
    status: yup.string().oneOf(['active', 'inactive', 'scheduled']).required(),
    startDate: yup.string().default(''),
    endDate: yup.string().default(''),
});

const BannerForm = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEdit = Boolean(id);

    const [image, setImage] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [existingImage, setExistingImage] = useState(null);
    const [discountOptions, setDiscountOptions] = useState([]);
    const [selectedDiscountId, setSelectedDiscountId] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [imageError, setImageError] = useState('');
    const [discountError, setDiscountError] = useState('');

    const { register, handleSubmit, reset, setError, watch, setValue, formState: { errors } } = useForm({
        resolver: yupResolver(schema),
        defaultValues: { title: '', description: '', link: '', linkType: '', linkTarget: '_self', sortOrder: 0, status: 'inactive', startDate: '', endDate: '' },
        mode: 'onBlur',
    });

    const fc = (field) => `w-full rounded-xl border px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 ${errors[field] ? 'border-red-400 focus:ring-red-100 bg-red-50' : 'border-slate-300 focus:border-indigo-400 focus:ring-indigo-200'}`;

    const watchLinkType = watch('linkType', '');
    const watchStatus = watch('status', 'inactive');
    const watchDescription = watch('description', '');

    const prevLinkType = useRef(watchLinkType);
    useEffect(() => {
        if (prevLinkType.current !== watchLinkType) {
            setValue('link', '');
            setSelectedDiscountId('');
            setDiscountError('');
            prevLinkType.current = watchLinkType;
        }
    }, [watchLinkType, setValue]);

    const getImageUrl = (path) => {
        if (!path) return '';
        if (/^https?:\/\//i.test(path)) return path;
        if (path.startsWith('/')) return `${API_CONFIG.BASE_URL}${path}`;
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
            const response = await authFetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.BANNERS}/discount-options`);
            const data = await response.json();
            if (response.ok && data.success) {
                setDiscountOptions(Array.isArray(data.data) ? data.data : []);
            }
        } catch (error) {
            logger.error('Error loading discounts:', error);
        }
    };

    const loadBanner = async () => {
        try {
            setIsLoading(true);
            const response = await authFetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.BANNERS}/${id}`);
            const data = await response.json();

            if (!response.ok || !data.success) {
                notify.error(data, 'Failed to load banner');
                return;
            }

            const banner = data.data;
            reset({
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
            logger.error('Error loading banner:', error);
            notify.error(error, 'Failed to load banner');
        } finally {
            setIsLoading(false);
        }
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            notify.error('Please select an image file');
            setImageError('Please select an image file');
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            notify.error('Image must be less than 5MB');
            setImageError('Image must be less than 5MB');
            return;
        }

        setImage(file);
        setImageError('');

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

    const onSubmit = async (data) => {
        if (!isEdit && !image && !existingImage) {
            setImageError('Banner image is required');
            notify.error('Please fix form validation errors');
            return;
        }
        if (data.linkType === 'discount' && !selectedDiscountId) {
            setDiscountError('Please select a discount');
            notify.error('Please fix form validation errors');
            return;
        }
        try {
            setIsSaving(true);
            const payload = new FormData();
            Object.entries(data).forEach(([key, val]) => { if (val !== null && val !== undefined && val !== '') payload.append(key, val); });
            payload.append('link_type', data.linkType);
            if (data.linkType === 'discount' && selectedDiscountId) {
                payload.append('discountIds', JSON.stringify([selectedDiscountId]));
                payload.append('discounts', JSON.stringify([selectedDiscountId]));
                payload.set('link', '');
            }
            if (image) payload.append('image', image);
            if (isEdit) payload.append('keepExistingImage', existingImage ? 'true' : 'false');
            const url = isEdit
                ? `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.BANNERS}/${id}`
                : `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.BANNERS}`;
            const response = await authFetch(url, { method: isEdit ? 'PUT' : 'POST', body: payload });
            const resData = await response.json();
            if (!response.ok || !resData.success) {
                const serverErrors = resData?.errors;
                if (Array.isArray(serverErrors)) {
                    serverErrors.forEach(({ field, message }) => { if (field) setError(field, { message }); });
                    notify.error('Please fix form validation errors');
                } else {
                    notify.error(resData, `Failed to ${isEdit ? 'update' : 'create'} banner`);
                }
                return;
            }
            notify.success(`Banner ${isEdit ? 'updated' : 'created'} successfully`);
            navigate('/admin/banners');
        } catch (error) {
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
        <div className="relative w-full space-y-8 px-4">
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
                        watchStatus === 'active'
                            ? 'border-emerald-200 bg-emerald-100 text-emerald-800'
                            : watchStatus === 'scheduled'
                                ? 'border-blue-200 bg-blue-100 text-blue-800'
                                : 'border-amber-200 bg-amber-100 text-amber-800'
                    }`}>
                        {watchStatus || 'inactive'}
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
                    <p className="mt-1 text-lg font-black text-slate-900">{watchLinkType || 'Not Selected'}</p>
                </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
                <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
                    <div className="order-2 space-y-6 lg:order-2">
                        <div className="media-card">
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
                                        <div className="media-preview-empty h-48">No banner image</div>
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
                                        className={`media-file-input ${imageError ? 'border-red-400 bg-red-50' : ''}`}
                                    />
                                    <p className="mt-2 text-sm text-slate-500">Upload image (JPG, PNG, GIF, WEBP - Max 5MB)</p>
                                    {imageError && <p className="mt-2 text-sm text-red-600">{imageError}</p>}
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
                                    {...register('title')}
                                    type="text"
                                    className={fc('title')}
                                    placeholder="Enter banner title"
                                />
                                {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>}
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-semibold text-slate-700">Description</label>
                                <textarea
                                    {...register('description')}
                                    rows="4"
                                    maxLength="500"
                                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"
                                    placeholder="Write a short campaign description"
                                />
                                <p className="mt-1 text-sm text-slate-500">{watchDescription.length}/500</p>
                            </div>

                            <div className={`grid gap-4 ${watchLinkType ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
                                <div>
                                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                                        Link Type <span className="text-rose-500">*</span>
                                    </label>
                                    <select
                                        {...register('linkType')}
                                        className={fc('linkType')}
                                    >
                                        <option value="">-- Select Link Type --</option>
                                        <option value="product">Product</option>
                                        <option value="category">Category</option>
                                        <option value="url">URL</option>
                                        <option value="discount">Discount</option>
                                    </select>
                                    {errors.linkType && <p className="mt-1 text-sm text-red-600">{errors.linkType.message}</p>}
                                </div>

                                {watchLinkType === 'discount' ? (
                                    <div>
                                        <label className="mb-2 block text-sm font-semibold text-slate-700">
                                            Discount <span className="text-rose-500">*</span>
                                        </label>
                                        <select
                                            value={selectedDiscountId}
                                            onChange={(e) => { setSelectedDiscountId(e.target.value); setDiscountError(''); }}
                                            className={`w-full rounded-xl border px-4 py-3 text-slate-900 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200 ${discountError ? 'border-red-400 bg-red-50' : 'border-slate-300'}`}
                                        >
                                            <option value="">-- Select Discount --</option>
                                            {discountOptions.map((discount) => (
                                                <option key={discount._id} value={discount._id}>
                                                    {discount.title} ({discount.type === 'percentage' ? `${discount.value}%` : `$${discount.value}`})
                                                </option>
                                            ))}
                                        </select>
                                        {discountError && <p className="mt-1 text-sm text-red-600">{discountError}</p>}
                                    </div>
                                ) : watchLinkType ? (
                                    <div>
                                        <label className="mb-2 block text-sm font-semibold text-slate-700">
                                            Redirect URL / SKU <span className="text-rose-500">*</span>
                                        </label>
                                        <input
                                            {...register('link')}
                                            type="text"
                                            className={fc('link')}
                                            placeholder="e.g. /product/sku-123 OR /category/electronics OR https://example.com"
                                        />
                                        {errors.link && <p className="mt-1 text-sm text-red-600">{errors.link.message}</p>}
                                    </div>
                                ) : null}
                            </div>

                            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                                <div>
                                    <label className="mb-2 block text-sm font-semibold text-slate-700">Status</label>
                                    <select {...register('status')} className={fc('status')}>
                                        <option value="active">Active</option>
                                        <option value="inactive">Inactive</option>
                                        <option value="scheduled">Scheduled</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="mb-2 block text-sm font-semibold text-slate-700">Link Target</label>
                                    <select {...register('linkTarget')} className={fc('linkTarget')}>
                                        <option value="_self">Same Window</option>
                                        <option value="_blank">New Window</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="mb-2 block text-sm font-semibold text-slate-700">Sort Order</label>
                                    <input {...register('sortOrder')} type="number" min="0" className={fc('sortOrder')} />
                                </div>
                            </div>
                        </div>

                        {watchStatus === 'scheduled' && (
                            <div className="rounded-3xl border border-blue-200 bg-blue-50/70 p-6 sm:p-7">
                                <h3 className="text-lg font-black text-blue-900">Schedule Window</h3>
                                <p className="mt-1 text-sm text-blue-700">Define when this banner should automatically run.</p>
                                <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <div>
                                        <label className="mb-2 block text-sm font-semibold text-blue-900">
                                            Start Date & Time <span className="text-rose-500">*</span>
                                        </label>
                                        <input
                                            {...register('startDate')}
                                            type="datetime-local"
                                            className={`w-full rounded-xl border px-4 py-3 text-slate-900 focus:border-blue-400 focus:ring-2 focus:ring-blue-200 ${errors.startDate ? 'border-red-400 bg-red-50' : 'border-blue-200'}`}
                                        />
                                        {errors.startDate && <p className="mt-1 text-sm text-red-600">{errors.startDate.message}</p>}
                                    </div>
                                    <div>
                                        <label className="mb-2 block text-sm font-semibold text-blue-900">End Date & Time</label>
                                        <input
                                            {...register('endDate')}
                                            type="datetime-local"
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
