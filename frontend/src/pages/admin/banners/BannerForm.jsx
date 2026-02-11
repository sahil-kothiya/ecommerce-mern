/**
 * @fileoverview Banner Form Component
 * @description Create/Edit promotional banners with image upload
 * @component BannerForm
 * @author Enterprise E-Commerce Team
 * @version 1.0.0
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { API_CONFIG } from '../../../constants';

const BannerForm = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEdit = Boolean(id);

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        link: '',
        linkTarget: '_self',
        position: 'home-main',
        sortOrder: 0,
        status: 'inactive',
        startDate: '',
        endDate: ''
    });

    const [image, setImage] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [existingImage, setExistingImage] = useState(null);

    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [errors, setErrors] = useState({});

    useEffect(() => {
        if (isEdit) {
            loadBanner();
        }
    }, [id]);

    const loadBanner = async () => {
        try {
            setIsLoading(true);
            const response = await fetch(`${API_CONFIG.BASE_URL}/api/banners/${id}`);
            const data = await response.json();

            if (data.success) {
                const banner = data.data;
                setFormData({
                    title: banner.title || '',
                    description: banner.description || '',
                    link: banner.link || '',
                    linkTarget: banner.linkTarget || '_self',
                    position: banner.position || 'home-main',
                    sortOrder: banner.sortOrder || 0,
                    status: banner.status || 'inactive',
                    startDate: banner.startDate ? new Date(banner.startDate).toISOString().slice(0, 16) : '',
                    endDate: banner.endDate ? new Date(banner.endDate).toISOString().slice(0, 16) : ''
                });

                if (banner.image) {
                    setExistingImage(banner.image);
                }
            }
        } catch (error) {
            console.error('Error loading banner:', error);
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

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            alert('Please select an image file');
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            alert('Image must be less than 5MB');
            return;
        }

        setImage(file);

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
        const newErrors = {};

        if (!formData.title.trim()) {
            newErrors.title = 'Title is required';
        }

        if (!isEdit && !image && !existingImage) {
            newErrors.image = 'Banner image is required';
        }

        if (formData.status === 'scheduled' && !formData.startDate && !formData.endDate) {
            newErrors.startDate = 'Start or end date required for scheduled banners';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        setIsSaving(true);

        try {
            const formDataToSend = new FormData();

            Object.keys(formData).forEach(key => {
                if (formData[key]) {
                    formDataToSend.append(key, formData[key]);
                }
            });

            if (image) {
                formDataToSend.append('image', image);
            }

            if (isEdit) {
                formDataToSend.append('keepExistingImage', existingImage ? 'true' : 'false');
            }

            const url = isEdit
                ? `${API_CONFIG.BASE_URL}/api/banners/${id}`
                : `${API_CONFIG.BASE_URL}/api/banners`;

            const response = await fetch(url, {
                method: isEdit ? 'PUT' : 'POST',
                body: formDataToSend
            });

            const data = await response.json();

            if (data.success || response.ok) {
                alert(`Banner ${isEdit ? 'updated' : 'created'} successfully!`);
                navigate('/admin/banners');
            } else {
                alert(data.message || 'Failed to save banner');
            }
        } catch (error) {
            console.error('Error saving banner:', error);
            alert('Failed to save banner');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-lg text-gray-700">Loading banner...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto px-4 py-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">
                    {isEdit ? 'Edit Banner' : 'Create Banner'}
                </h1>
                <p className="text-gray-600 mt-1">
                    {isEdit ? 'Update banner information' : 'Add a new promotional banner'}
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Information */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
                    <h2 className="text-xl font-bold text-gray-900">Banner Details</h2>

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
                            placeholder="Enter banner title"
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
                            rows="2"
                            maxLength="500"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            placeholder="Brief description"
                        />
                        <p className="mt-1 text-sm text-gray-500">{formData.description.length}/500</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Link URL
                            </label>
                            <input
                                type="text"
                                name="link"
                                value={formData.link}
                                onChange={handleChange}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                placeholder="https://example.com or /products/sale"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Link Target
                            </label>
                            <select
                                name="linkTarget"
                                value={formData.linkTarget}
                                onChange={handleChange}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="_self">Same Window</option>
                                <option value="_blank">New Window</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Banner Image
                        </label>
                        <input
                            type="file"
                            accept="image/jpeg,image/png,image/gif,image/webp"
                            onChange={handleImageChange}
                            className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none px-3 py-2"
                        />
                        <p className="mt-2 text-sm text-blue-600">Upload an image (JPG, PNG, GIF, WEBP - Max 5MB)</p>
                        {errors.image && <p className="mt-2 text-sm text-red-600">{errors.image}</p>}
                    </div>
                </div>

                {/* Settings */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
                    <h2 className="text-xl font-bold text-gray-900">Settings</h2>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Position
                            </label>
                            <select
                                name="position"
                                value={formData.position}
                                onChange={handleChange}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="home-main">Home - Main</option>
                                <option value="home-side">Home - Side</option>
                                <option value="category">Category Pages</option>
                                <option value="product">Product Pages</option>
                                <option value="checkout">Checkout</option>
                                <option value="custom">Custom</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Sort Order
                            </label>
                            <input
                                type="number"
                                name="sortOrder"
                                value={formData.sortOrder}
                                onChange={handleChange}
                                min="0"
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Status
                            </label>
                            <select
                                name="status"
                                value={formData.status}
                                onChange={handleChange}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                                <option value="scheduled">Scheduled</option>
                            </select>
                        </div>
                    </div>

                    {/* Schedule */}
                    {formData.status === 'scheduled' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Start Date & Time
                                </label>
                                <input
                                    type="datetime-local"
                                    name="startDate"
                                    value={formData.startDate}
                                    onChange={handleChange}
                                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                                        errors.startDate ? 'border-red-500' : 'border-gray-300'
                                    }`}
                                />
                                {errors.startDate && <p className="mt-1 text-sm text-red-600">{errors.startDate}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    End Date & Time
                                </label>
                                <input
                                    type="datetime-local"
                                    name="endDate"
                                    value={formData.endDate}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
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
                        {isSaving ? 'Saving...' : isEdit ? 'Update Banner' : 'Create Banner'}
                    </button>
                    <button
                        type="button"
                        onClick={() => navigate('/admin/banners')}
                        className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-semibold transition-colors"
                    >
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    );
};

export default BannerForm;
