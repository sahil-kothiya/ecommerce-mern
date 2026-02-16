/**
 * @fileoverview Brand Form Component with Multiple Image Support
 * @description Create/Edit brands with logo and banner images
 * @component BrandForm
 * @author Enterprise E-Commerce Team
 * @version 1.0.0
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { API_CONFIG } from '../../../constants';
import { brandService } from '../../../services/brandService';

const BrandForm = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEdit = Boolean(id);

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        status: 'active'
    });

    // Multiple images: logo + banners
    const [logo, setLogo] = useState(null);
    const [logoPreview, setLogoPreview] = useState(null);
    const [existingLogo, setExistingLogo] = useState(null);

    const [bannerImages, setBannerImages] = useState([]);
    const [bannerPreviews, setBannerPreviews] = useState([]);
    const [existingBanners, setExistingBanners] = useState([]);

    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [errors, setErrors] = useState({});

    const getImageUrl = (path) => {
        if (!path) return '';
        if (/^https?:\/\//i.test(path)) return path;
        const normalizedPath = path.startsWith('/') ? path : `/${path}`;
        return `${API_CONFIG.BASE_URL}${normalizedPath}`;
    };

    useEffect(() => {
        if (isEdit) {
            loadBrand();
        }
    }, [id]);

    const loadBrand = async () => {
        try {
            setIsLoading(true);
            const data = await brandService.getBrandById(id);
            
            const brand = data.data || data;
            setFormData({
                title: brand.title || '',
                description: brand.description || '',
                status: brand.status || 'active'
            });

            if (brand.logo) {
                setExistingLogo(brand.logo);
            }

            if (brand.banners && Array.isArray(brand.banners)) {
                setExistingBanners(brand.banners);
            }
        } catch (error) {
            console.error('Error loading brand:', error);
            toast.error(error.message || 'Failed to load brand');
        } finally {
            setIsLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: null }));
        }
    };

    const handleLogoChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            toast.error('Please select an image file');
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            toast.error('Logo must be less than 5MB');
            return;
        }

        setLogo(file);

        const reader = new FileReader();
        reader.onloadend = () => {
            setLogoPreview(reader.result);
        };
        reader.readAsDataURL(file);
    };

    const handleBannerChange = (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        const currentBannerCount = existingBanners.length + bannerImages.length;
        if (currentBannerCount + files.length > 3) {
            const remainingSlots = Math.max(0, 3 - currentBannerCount);
            setErrors(prev => ({
                ...prev,
                banners: remainingSlots > 0
                    ? `You can upload only ${remainingSlots} more banner image${remainingSlots === 1 ? '' : 's'}`
                    : 'Maximum 3 banner images allowed'
            }));
            toast.error('Maximum 3 banner images allowed');
            e.target.value = '';
            return;
        }

        const validFiles = files.filter(file => {
            if (!file.type.startsWith('image/')) {
                toast.error(`${file.name} is not an image`);
                return false;
            }
            if (file.size > 5 * 1024 * 1024) {
                toast.error(`${file.name} exceeds 5MB`);
                return false;
            }
            return true;
        });

        if (validFiles.length === 0) return;

        setErrors(prev => ({ ...prev, banners: null }));
        setBannerImages(prev => [...prev, ...validFiles]);

        validFiles.forEach(file => {
            const reader = new FileReader();
            reader.onloadend = () => {
                setBannerPreviews(prev => [...prev, {
                    url: reader.result,
                    name: file.name
                }]);
            };
            reader.readAsDataURL(file);
        });

        e.target.value = '';
    };

    const removeLogo = () => {
        setLogo(null);
        setLogoPreview(null);
    };

    const removeExistingLogo = () => {
        setExistingLogo(null);
    };

    const removeBanner = (index) => {
        setBannerImages(prev => prev.filter((_, i) => i !== index));
        setBannerPreviews(prev => prev.filter((_, i) => i !== index));
        setErrors(prev => ({ ...prev, banners: null }));
    };

    const removeExistingBanner = (index) => {
        setExistingBanners(prev => prev.filter((_, i) => i !== index));
        setErrors(prev => ({ ...prev, banners: null }));
    };

    /**
     * Validate form inputs before submission
     * CLIENT-SIDE VALIDATION - First line of defense
     * Server will also validate to ensure data integrity
     */
    const validateForm = () => {
        const newErrors = {};

        // Title validation (required, 2-100 chars)
        if (!formData.title.trim()) {
            newErrors.title = 'Title is required';
        } else if (formData.title.trim().length < 2) {
            newErrors.title = 'Title must be at least 2 characters';
        } else if (formData.title.trim().length > 100) {
            newErrors.title = 'Title cannot exceed 100 characters';
        } else if (!/^[a-zA-Z0-9\s\-&.'()]+$/.test(formData.title.trim())) {
            newErrors.title = 'Title can only contain letters, numbers, spaces, and common punctuation';
        }

        // Description validation (optional, max 1000 chars)
        if (formData.description.trim().length > 1000) {
            newErrors.description = 'Description cannot exceed 1000 characters';
        }

        // Logo is now optional - no validation needed

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    /**
     * Handle form submission
     * DUAL VALIDATION PATTERN:
     * 1. Client-side validation (fast feedback)
     * 2. Server-side validation (security & data integrity)
     */
    const handleSubmit = async (e) => {
        e.preventDefault();

        // CLIENT-SIDE VALIDATION - First line of defense
        if (!validateForm()) {
            toast.error('Please fix the validation errors');
            return;
        }

        setIsSaving(true);

        try {
            const formDataToSend = new FormData();

            // Trim text inputs to avoid whitespace issues
            formDataToSend.append('title', formData.title.trim());
            formDataToSend.append('description', formData.description.trim());
            formDataToSend.append('status', formData.status);

            // Logo upload (optional)
            if (logo) {
                formDataToSend.append('logo', logo);
            }

            // Banner uploads (optional, multiple)
            bannerImages.forEach((banner) => {
                formDataToSend.append('banners', banner);
            });

            // For edit mode, preserve existing images if not replaced
            if (isEdit) {
                formDataToSend.append('keepExistingLogo', existingLogo ? 'true' : 'false');
                formDataToSend.append('existingBanners', JSON.stringify(existingBanners));
            }

            // Use brandService instead of direct fetch
            let response;
            if (isEdit) {
                response = await brandService.updateBrand(id, formDataToSend);
            } else {
                response = await brandService.createBrand(formDataToSend);
            }

            toast.success(`Brand ${isEdit ? 'updated' : 'created'} successfully!`);
            navigate('/admin/brands');
            
        } catch (error) {
            console.error('Error saving brand:', error);
            
            // Handle server-side validation errors
            if (error.errors && Array.isArray(error.errors)) {
                // Format: [{ field: 'title', message: 'error message' }]
                const serverErrors = {};
                error.errors.forEach(err => {
                    serverErrors[err.field] = err.message;
                });
                setErrors(serverErrors);
                
                // Show first error in toast
                toast.error(error.errors[0].message || 'Validation failed');
            } else {
                // Display generic error message
                const errorMessage = error.message || 
                    error.response?.data?.message || 
                    `Failed to ${isEdit ? 'update' : 'create'} brand`;
                
                toast.error(errorMessage);
            }
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-[420px]">
                <div className="text-center bg-white border border-slate-200 rounded-2xl p-10 shadow-sm">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-slate-700 mx-auto mb-4"></div>
                    <p className="text-lg font-semibold text-slate-800">Loading brand workspace...</p>
                    <p className="text-sm text-slate-500 mt-1">Preparing brand data and assets</p>
                </div>
            </div>
        );
    }

    const totalBannerCount = existingBanners.length + bannerPreviews.length;

    return (
        <div className="w-full px-4 py-8 space-y-8 relative">
            <div className="pointer-events-none absolute top-16 right-8 h-40 w-40 rounded-full bg-cyan-300/20 blur-3xl" />
            <div className="pointer-events-none absolute bottom-20 left-8 h-44 w-44 rounded-full bg-sky-300/20 blur-3xl" />

            <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-900 via-slate-800 to-cyan-900 p-6 sm:p-8 text-white shadow-[0_20px_60px_rgba(15,23,42,0.35)]">
                <div className="absolute -top-20 -right-10 h-48 w-48 rounded-full bg-cyan-400/20 blur-3xl" />
                <div className="absolute -bottom-20 -left-10 h-44 w-44 rounded-full bg-teal-300/20 blur-3xl" />
                <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-200/80">Brand Studio</p>
                        <h1 className="mt-2 text-3xl sm:text-4xl font-black leading-tight">
                            {isEdit ? 'Edit Brand' : 'Create Brand'}
                        </h1>
                        <p className="mt-2 text-slate-200/90">
                            {isEdit ? 'Update brand profile, logo, and banners' : 'Build a polished brand profile with visual assets'}
                        </p>
                    </div>
                    <span className={`inline-flex items-center px-3 py-1.5 text-xs font-bold rounded-full border ${
                        formData.status === 'active'
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                            : 'bg-amber-100 text-amber-800 border-amber-200'
                    }`}>
                        {formData.status || 'inactive'}
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white/95 backdrop-blur border border-slate-200 rounded-2xl p-4 shadow-sm">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Profile Status</p>
                    <p className="mt-1 text-lg font-black text-slate-900">{isEdit ? 'Editing Existing Brand' : 'Creating New Brand'}</p>
                </div>
                <div className="bg-white/95 backdrop-blur border border-slate-200 rounded-2xl p-4 shadow-sm">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Logo</p>
                    <p className="mt-1 text-lg font-black text-slate-900">{logoPreview || existingLogo ? 'Ready' : 'Not Added'}</p>
                </div>
                <div className="bg-white/95 backdrop-blur border border-slate-200 rounded-2xl p-4 shadow-sm">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Banners</p>
                    <p className="mt-1 text-lg font-black text-slate-900">{totalBannerCount} Selected</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} noValidate className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                    <div className="space-y-6 order-2 lg:order-2">
                        {/* Logo Upload */}
                        <div className="bg-white/95 backdrop-blur rounded-3xl shadow-[0_10px_30px_rgba(15,23,42,0.08)] border border-slate-200 p-6 sm:p-7 transition-all hover:shadow-[0_20px_40px_rgba(15,23,42,0.12)]">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xl font-black text-slate-900">Brand Logo (Optional)</h2>
                                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-cyan-100 to-sky-100 text-cyan-700 border border-cyan-200">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14" />
                                    </svg>
                                </span>
                            </div>
                            <p className="text-sm text-slate-500 mb-5">Add a crisp logo for stronger brand recognition in listings and product pages.</p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Logo Preview */}
                                <div>
                                    {logoPreview || existingLogo ? (
                                        <div className="relative group">
                                            <img
                                                src={logoPreview || getImageUrl(existingLogo)}
                                                alt="Logo preview"
                                                className="w-full aspect-square object-contain bg-gradient-to-br from-slate-100 to-cyan-100 rounded-xl border-2 border-slate-200 p-5"
                                            />
                                            <button
                                                type="button"
                                                onClick={logoPreview ? removeLogo : removeExistingLogo}
                                                className="absolute top-3 right-3 bg-rose-500 text-white p-2 rounded-full hover:bg-rose-600"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="w-full aspect-square bg-gradient-to-br from-cyan-50 via-slate-50 to-sky-100 rounded-2xl border-2 border-dashed border-cyan-200 flex items-center justify-center">
                                            <div className="text-center">
                                                <svg className="mx-auto h-12 w-12 text-cyan-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                </svg>
                                                <p className="text-sm text-slate-600 font-semibold">No logo</p>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Upload Button */}
                                <div className="flex flex-col justify-center">
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                                            Brand Logo
                                        </label>
                                        <input
                                            type="file"
                                            accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
                                            onChange={handleLogoChange}
                                            className="block w-full text-sm text-slate-900 border border-slate-300 rounded-xl cursor-pointer bg-slate-50 focus:outline-none px-3 py-2"
                                        />
                                        <p className="mt-2 text-sm text-slate-500">Upload logo (JPG, PNG, SVG, WEBP - Max 5MB)</p>
                                        {errors.logo && <p className="mt-2 text-sm text-red-600">{errors.logo}</p>}
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>

                    <div className="space-y-6 order-1 lg:order-1">
                        {/* Basic Information */}
                        <div className="bg-white/95 backdrop-blur rounded-3xl shadow-[0_10px_30px_rgba(15,23,42,0.08)] border border-slate-200 p-6 sm:p-7 space-y-6 transition-all hover:shadow-[0_20px_40px_rgba(15,23,42,0.12)]">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-black text-slate-900">Basic Information</h2>
                                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-indigo-100 to-sky-100 text-indigo-700 border border-indigo-200">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6M7 4h10a2 2 0 012 2v12a2 2 0 01-2 2H7a2 2 0 01-2-2V6a2 2 0 012-2z" />
                                    </svg>
                                </span>
                            </div>
                            <p className="text-sm text-slate-500">Fill brand identity details used in catalog filtering and storefront presentation.</p>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">
                                    Title *
                                </label>
                                <input
                                    type="text"
                                    name="title"
                                    value={formData.title}
                                    onChange={handleChange}
                                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-cyan-300 focus:border-cyan-400 text-slate-900 ${
                                        errors.title ? 'border-red-500' : 'border-slate-300'
                                    }`}
                                    placeholder="Enter brand title"
                                />
                                {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">
                                    Description
                                </label>
                                <textarea
                                    name="description"
                                    value={formData.description}
                                    onChange={handleChange}
                                    rows="4"
                                    maxLength="1000"
                                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-cyan-300 focus:border-cyan-400 text-slate-900 ${
                                        errors.description ? 'border-red-500' : 'border-slate-300'
                                    }`}
                                    placeholder="Brand description"
                                />
                                {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description}</p>}
                                <p className="mt-1 text-sm text-slate-500">{formData.description.length}/1000</p>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">
                                    Status
                                </label>
                                <select
                                    name="status"
                                    value={formData.status}
                                    onChange={handleChange}
                                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-cyan-300 focus:border-cyan-400 text-slate-900 ${
                                        errors.status ? 'border-red-500' : 'border-slate-300'
                                    }`}
                                >
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                </select>
                                {errors.status && <p className="mt-1 text-sm text-red-600">{errors.status}</p>}
                            </div>
                        </div>

                        {/* Banner Images */}
                        <div className="bg-white/95 backdrop-blur rounded-3xl shadow-[0_10px_30px_rgba(15,23,42,0.08)] border border-slate-200 p-6 sm:p-7 transition-all hover:shadow-[0_20px_40px_rgba(15,23,42,0.12)]">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xl font-black text-slate-900">Brand Banners (Optional)</h2>
                                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-amber-100 to-orange-100 text-amber-700 border border-amber-200">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14M4 6h16" />
                                    </svg>
                                </span>
                            </div>
                            <p className="text-sm text-slate-500 mb-5">Use banners for featured campaigns and seasonal highlights. Up to 3 images.</p>

                            <div className="mb-6">
                                <label className="block text-sm font-semibold text-slate-700 mb-2">
                                    Brand Banners
                                </label>
                                <input
                                    type="file"
                                    multiple
                                    accept="image/jpeg,image/png,image/gif,image/webp"
                                    onChange={handleBannerChange}
                                    className={`block w-full text-sm text-slate-900 border rounded-xl cursor-pointer bg-slate-50 focus:outline-none px-3 py-2 ${
                                        errors.banners ? 'border-red-500 focus:ring-red-200' : 'border-slate-300'
                                    }`}
                                />
                                <p className="mt-2 text-sm text-slate-500">Upload banner images (JPG, PNG, GIF, WEBP - Max 5MB, Max 3 banners)</p>
                                {errors.banners && <p className="mt-2 text-sm text-red-600">{errors.banners}</p>}
                            </div>

                            {existingBanners.length > 0 && (
                                <div className="mb-6">
                                    <h3 className="text-sm font-semibold text-slate-700 mb-3">Current Banners</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        {existingBanners.map((banner, index) => (
                                            <div key={index} className="relative group aspect-video bg-slate-100 rounded-xl overflow-hidden border-2 border-slate-200">
                                                <img
                                                    src={getImageUrl(banner)}
                                                    alt={`Banner ${index + 1}`}
                                                    className="w-full h-full object-cover"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => removeExistingBanner(index)}
                                                    className="absolute top-2 right-2 bg-rose-500 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {bannerPreviews.length > 0 && (
                                <div>
                                    <h3 className="text-sm font-semibold text-slate-700 mb-3">New Banners</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        {bannerPreviews.map((preview, index) => (
                                            <div key={index} className="relative group aspect-video bg-slate-100 rounded-xl overflow-hidden border-2 border-slate-200">
                                                <img
                                                    src={preview.url}
                                                    alt={preview.name}
                                                    className="w-full h-full object-cover"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => removeBanner(index)}
                                                    className="absolute top-2 right-2 bg-rose-500 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="sticky bottom-3 z-10 flex flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-white/90 p-3 shadow-[0_10px_30px_rgba(15,23,42,0.12)] backdrop-blur sm:flex-row">
                    <button
                        type="button"
                        onClick={() => navigate('/admin/brands')}
                        className="w-full rounded-xl border border-slate-300 bg-white px-6 py-3 font-semibold text-slate-800 transition-colors hover:bg-slate-100 sm:w-auto"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={isSaving}
                        className="w-full rounded-xl bg-indigo-400 px-6 py-3 font-bold text-slate-900 transition-colors hover:bg-indigo-300 disabled:opacity-50 sm:flex-1"
                    >
                        {isSaving ? 'Saving...' : isEdit ? 'Update Brand' : 'Create Brand'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default BrandForm;
