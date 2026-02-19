/**
 * @fileoverview Category Form Component with Multiple Image Support
 * @description Create/Edit categories with image gallery upload
 * @component CategoryForm
 * @author Enterprise E-Commerce Team
 * @version 1.0.0
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { API_CONFIG } from '../../../constants';

const CategoryForm = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEdit = Boolean(id);

    const [formData, setFormData] = useState({
        title: '',
        summary: '',
        parentId: '',
        status: 'active',
        isFeatured: false,
        isNavigationVisible: true,
        sortOrder: 0,
        seoTitle: '',
        seoDescription: ''
    });

    // Multiple images support
    const [images, setImages] = useState([]);
    const [imagePreviews, setImagePreviews] = useState([]);
    const [existingImages, setExistingImages] = useState([]);
    const [primaryImageIndex, setPrimaryImageIndex] = useState(0);

    const [categories, setCategories] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [errors, setErrors] = useState({});

    useEffect(() => {
        loadCategories();
        if (isEdit) {
            loadCategory();
        }
    }, [id]);

    const loadCategories = async () => {
        try {
            const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.CATEGORIES}`);
            const data = await response.json();
            const categoriesList = Array.isArray(data?.data) ? data.data : [];
            
            // Build hierarchical category names for parent dropdown
            const categoriesWithHierarchy = categoriesList.map(cat => {
                let displayName = cat.title;
                
                // Find parent if exists
                if (cat.parentId) {
                    const parent = categoriesList.find(p => p._id === cat.parentId);
                    if (parent) {
                        displayName = `${parent.title} > ${cat.title}`;
                    }
                }
                
                return {
                    ...cat,
                    displayName
                };
            });
            
            setCategories(categoriesWithHierarchy);
        } catch (error) {
            console.error('Error loading categories:', error);
            toast.error('Failed to load categories');
        }
    };

    const loadCategory = async () => {
        try {
            setIsLoading(true);
            const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.CATEGORIES}/${id}`);
            const data = await response.json();

            if (data.success) {
                const category = data.data;
                setFormData({
                    title: category.title || '',
                    summary: category.summary || '',
                    parentId: category.parentId || '',
                    status: category.status || 'active',
                    isFeatured: category.isFeatured || false,
                    isNavigationVisible: category.isNavigationVisible !== false,
                    sortOrder: category.sortOrder || 0,
                    seoTitle: category.seoTitle || '',
                    seoDescription: category.seoDescription || ''
                });

                // Load existing images if available
                if (category.images && Array.isArray(category.images)) {
                    setExistingImages(category.images);
                } else if (category.photo) {
                    // Legacy single photo support
                    setExistingImages([{
                        path: category.photo,
                        isPrimary: true,
                        sortOrder: 0
                    }]);
                }
            }
        } catch (error) {
            console.error('Error loading category:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleImageChange = (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        // Limit to 5 images for categories
        if (images.length + files.length > 5) {
            toast.error('Maximum 5 images allowed for categories');
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

        setImages(prev => [...prev, ...validFiles]);

        validFiles.forEach(file => {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreviews(prev => [...prev, {
                    url: reader.result,
                    name: file.name,
                    isPrimary: prev.length === 0 && existingImages.length === 0
                }]);
            };
            reader.readAsDataURL(file);
        });
    };

    const removeImage = (index) => {
        setImages(prev => prev.filter((_, i) => i !== index));
        setImagePreviews(prev => prev.filter((_, i) => i !== index));
    };

    const removeExistingImage = (index) => {
        setExistingImages(prev => prev.filter((_, i) => i !== index));
    };

    const setPrimaryImage = (index, isExisting = false) => {
        if (isExisting) {
            setExistingImages(prev => prev.map((img, i) => ({
                ...img,
                isPrimary: i === index
            })));
        } else {
            setImagePreviews(prev => prev.map((img, i) => ({
                ...img,
                isPrimary: i === index
            })));
        }
    };

    const validateForm = () => {
        const newErrors = {};

        if (!formData.title.trim()) {
            newErrors.title = 'Title is required';
        }

        if (!isEdit && images.length === 0 && existingImages.length === 0) {
            newErrors.images = 'At least one image is required';
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
                formDataToSend.append(key, formData[key]);
            });

            images.forEach((image, index) => {
                formDataToSend.append('images', image);
                formDataToSend.append(`imageData[${index}][isPrimary]`, 
                    imagePreviews[index]?.isPrimary || false
                );
                formDataToSend.append(`imageData[${index}][sortOrder]`, index);
            });

            if (isEdit) {
                formDataToSend.append('existingImages', JSON.stringify(existingImages));
            }

            const url = isEdit
                ? `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.CATEGORIES}/${id}`
                : `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.CATEGORIES}`;

            const token = localStorage.getItem('auth_token');

            const response = await fetch(url, {
                method: isEdit ? 'PUT' : 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formDataToSend
            });

            const data = await response.json();

            if (data.success || response.ok) {
                toast.success(`Category ${isEdit ? 'updated' : 'created'} successfully!`);
                navigate('/admin/categories');
            } else {
                toast.error(data.message || 'Failed to save category');
            }
        } catch (error) {
            console.error('Error saving category:', error);
            toast.error('Failed to save category');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-lg text-gray-700">Loading category...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto px-4 py-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">
                    {isEdit ? 'Edit Category' : 'Create Category'}
                </h1>
                <p className="text-gray-600 mt-1">
                    {isEdit ? 'Update category information and images' : 'Add a new category with images'}
                </p>
            </div>

            <form onSubmit={handleSubmit} noValidate className="space-y-6">
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
                            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                                errors.title ? 'border-red-500' : 'border-gray-300'
                            }`}
                            placeholder="Enter category title"
                        />
                        {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Description
                        </label>
                        <textarea
                            name="summary"
                            value={formData.summary}
                            onChange={handleChange}
                            rows="3"
                            maxLength="500"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            placeholder="Brief category description"
                        />
                        <p className="mt-1 text-sm text-gray-500">{formData.summary.length}/500</p>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Parent Category
                        </label>
                        <select
                            name="parentId"
                            value={formData.parentId}
                            onChange={handleChange}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">None (Top Level)</option>
                            {categories
                                .filter(cat => cat._id !== id)
                                .map(cat => (
                                    <option key={cat._id} value={cat._id}>
                                        {cat.displayName || cat.title}
                                    </option>
                                ))}
                        </select>
                    </div>
                </div>

                {/* Category Images */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Category Image</h2>

                    {/* Simple File Input */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Category Image
                        </label>
                        <input
                            type="file"
                            multiple
                            accept="image/jpeg,image/png,image/gif,image/webp"
                            onChange={handleImageChange}
                            className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none px-3 py-2"
                        />
                        <p className="mt-2 text-sm text-gray-500">Upload an image (JPG, PNG, GIF, WEBP - Max 5MB)</p>
                        {errors.images && <p className="mt-2 text-sm text-red-600">{errors.images}</p>}
                    </div>

                    {/* Existing Images */}
                    {existingImages.length > 0 && (
                        <div className="mb-6">
                            <h3 className="text-sm font-semibold text-gray-700 mb-3">Current Images</h3>
                            <div className="grid grid-cols-3 md:grid-cols-5 gap-4">
                                {existingImages.map((img, index) => (
                                    <div key={index} className="relative group aspect-square bg-gray-100 rounded-lg overflow-hidden border-2 border-gray-200">
                                        <img
                                            src={`${API_CONFIG.BASE_URL}/uploads/${img.path}`}
                                            alt={`Category ${index + 1}`}
                                            className="w-full h-full object-cover"
                                        />
                                        {img.isPrimary && (
                                            <div className="absolute top-2 left-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full font-semibold">
                                                Primary
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all flex items-center justify-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setPrimaryImage(index, true)}
                                                className="bg-white text-gray-800 p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                                title="Set as primary"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                </svg>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => removeExistingImage(index)}
                                                className="bg-red-500 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                                title="Remove"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* New Images */}
                    {imagePreviews.length > 0 && (
                        <div>
                            <h3 className="text-sm font-semibold text-gray-700 mb-3">New Images</h3>
                            <div className="grid grid-cols-3 md:grid-cols-5 gap-4">
                                {imagePreviews.map((preview, index) => (
                                    <div key={index} className="relative group aspect-square bg-gray-100 rounded-lg overflow-hidden border-2 border-gray-200">
                                        <img
                                            src={preview.url}
                                            alt={preview.name}
                                            className="w-full h-full object-cover"
                                        />
                                        {preview.isPrimary && (
                                            <div className="absolute top-2 left-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full font-semibold">
                                                Primary
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all flex items-center justify-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setPrimaryImage(index, false)}
                                                className="bg-white text-gray-800 p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                                title="Set as primary"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                </svg>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => removeImage(index)}
                                                className="bg-red-500 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                                title="Remove"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Settings */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
                    <h2 className="text-xl font-bold text-gray-900">Settings</h2>

                    <div className="grid grid-cols-2 gap-6">
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
                    </div>

                    <div className="space-y-3">
                        <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                            <input
                                type="checkbox"
                                name="isFeatured"
                                checked={formData.isFeatured}
                                onChange={handleChange}
                                className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                            />
                            <span className="text-sm font-medium text-gray-700">Featured Category</span>
                        </label>

                        <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                            <input
                                type="checkbox"
                                name="isNavigationVisible"
                                checked={formData.isNavigationVisible}
                                onChange={handleChange}
                                className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                            />
                            <span className="text-sm font-medium text-gray-700">Show in Navigation</span>
                        </label>
                    </div>
                </div>

                {/* SEO */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
                    <h2 className="text-xl font-bold text-gray-900">SEO Settings</h2>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            SEO Title
                        </label>
                        <input
                            type="text"
                            name="seoTitle"
                            value={formData.seoTitle}
                            onChange={handleChange}
                            maxLength="60"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            placeholder="SEO optimized title"
                        />
                        <p className="mt-1 text-sm text-gray-500">{formData.seoTitle.length}/60</p>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            SEO Description
                        </label>
                        <textarea
                            name="seoDescription"
                            value={formData.seoDescription}
                            onChange={handleChange}
                            maxLength="160"
                            rows="2"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            placeholder="Meta description for search engines"
                        />
                        <p className="mt-1 text-sm text-gray-500">{formData.seoDescription.length}/160</p>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-4">
                    <button
                        type="submit"
                        disabled={isSaving}
                        className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50"
                    >
                        {isSaving ? 'Saving...' : isEdit ? 'Update Category' : 'Create Category'}
                    </button>
                    <button
                        type="button"
                        onClick={() => navigate('/admin/categories')}
                        className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-semibold transition-colors"
                    >
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    );
};

export default CategoryForm;
