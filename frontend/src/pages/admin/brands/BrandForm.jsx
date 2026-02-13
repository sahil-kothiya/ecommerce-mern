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

        if (bannerImages.length + files.length > 3) {
            toast.error('Maximum 3 banner images allowed');
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
    };

    const removeExistingBanner = (index) => {
        setExistingBanners(prev => prev.filter((_, i) => i !== index));
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
            <div className="flex items-center justify-center h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-lg text-gray-700">Loading brand...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto px-4 py-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">
                    {isEdit ? 'Edit Brand' : 'Create Brand'}
                </h1>
                <p className="text-gray-600 mt-1">
                    {isEdit ? 'Update brand information and images' : 'Add a new brand with logo and banners'}
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Information */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
                    <h2 className="text-xl font-bold text-gray-900">Basic Information</h2>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Title *
                        </label>
                        <input
                            type="text"
                            name="title"
                            value={formData.title}
                            onChange={handleChange}
                            required
                            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                                errors.title ? 'border-red-500' : 'border-gray-300'
                            }`}
                            placeholder="Enter brand title"
                        />
                        {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Description
                        </label>
                        <textarea
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            rows="4"
                            maxLength="1000"
                            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                                errors.description ? 'border-red-500' : 'border-gray-300'
                            }`}
                            placeholder="Brand description"
                        />
                        {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description}</p>}
                        <p className="mt-1 text-sm text-gray-500">{formData.description.length}/1000</p>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Status
                        </label>
                        <select
                            name="status"
                            value={formData.status}
                            onChange={handleChange}
                            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                                errors.status ? 'border-red-500' : 'border-gray-300'
                            }`}
                        >
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                        </select>
                        {errors.status && <p className="mt-1 text-sm text-red-600">{errors.status}</p>}
                    </div>
                </div>

                {/* Logo Upload */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Brand Logo (Optional)</h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Logo Preview */}
                        <div>
                            {logoPreview || existingLogo ? (
                                <div className="relative group">
                                    <img
                                        src={logoPreview || `${API_CONFIG.BASE_URL}/uploads/${existingLogo}`}
                                        alt="Logo preview"
                                        className="w-full aspect-square object-contain bg-gray-100 rounded-lg border-2 border-gray-200"
                                    />
                                    <button
                                        type="button"
                                        onClick={logoPreview ? removeLogo : removeExistingLogo}
                                        className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full hover:bg-red-600"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                            ) : (
                                <div className="w-full aspect-square bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
                                    <div className="text-center">
                                        <svg className="mx-auto h-12 w-12 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                        <p className="text-sm text-gray-500">No logo</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Upload Button */}
                        <div className="flex flex-col justify-center">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Brand Logo
                                </label>
                                <input
                                    type="file"
                                    accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
                                    onChange={handleLogoChange}
                                    className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none px-3 py-2"
                                />
                                <p className="mt-2 text-sm text-gray-500">Upload logo (JPG, PNG, SVG, WEBP - Max 5MB)</p>
                                {errors.logo && <p className="mt-2 text-sm text-red-600">{errors.logo}</p>}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Banner Images */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Brand Banners (Optional)</h2>

                    {/* Upload Button */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Brand Banners
                        </label>
                        <input
                            type="file"
                            multiple
                            accept="image/jpeg,image/png,image/gif,image/webp"
                            onChange={handleBannerChange}
                            className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none px-3 py-2"
                        />
                        <p className="mt-2 text-sm text-gray-500">Upload banner images (JPG, PNG, GIF, WEBP - Max 5MB, Max 3 banners)</p>
                    </div>

                    {/* Existing Banners */}
                    {existingBanners.length > 0 && (
                        <div className="mb-6">
                            <h3 className="text-sm font-semibold text-gray-700 mb-3">Current Banners</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {existingBanners.map((banner, index) => (
                                    <div key={index} className="relative group aspect-video bg-gray-100 rounded-lg overflow-hidden border-2 border-gray-200">
                                        <img
                                            src={`${API_CONFIG.BASE_URL}/uploads/${banner}`}
                                            alt={`Banner ${index + 1}`}
                                            className="w-full h-full object-cover"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => removeExistingBanner(index)}
                                            className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
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

                    {/* New Banners */}
                    {bannerPreviews.length > 0 && (
                        <div>
                            <h3 className="text-sm font-semibold text-gray-700 mb-3">New Banners</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {bannerPreviews.map((preview, index) => (
                                    <div key={index} className="relative group aspect-video bg-gray-100 rounded-lg overflow-hidden border-2 border-gray-200">
                                        <img
                                            src={preview.url}
                                            alt={preview.name}
                                            className="w-full h-full object-cover"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => removeBanner(index)}
                                            className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
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

                {/* Actions */}
                <div className="flex items-center gap-4">
                    <button
                        type="submit"
                        disabled={isSaving}
                        className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50"
                    >
                        {isSaving ? 'Saving...' : isEdit ? 'Update Brand' : 'Create Brand'}
                    </button>
                    <button
                        type="button"
                        onClick={() => navigate('/admin/brands')}
                        className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-semibold transition-colors"
                    >
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    );
};

export default BrandForm;
