
import React, { useState, useEffect } from 'react';
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
    summary: yup.string().default(''),
    parentId: yup.string().default(''),
    status: yup.string().oneOf(['active', 'inactive']).required(),
    isFeatured: yup.boolean().default(false),
    isNavigationVisible: yup.boolean().default(true),
    sortOrder: yup.number().min(0, 'Sort order must be 0 or more').default(0),
    seoTitle: yup.string().max(60, 'SEO title max 60 characters').default(''),
    seoDescription: yup.string().max(160, 'SEO description max 160 characters').default(''),
});

const CategoryForm = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEdit = Boolean(id);

    const {
        register,
        handleSubmit,
        reset,
        setError,
        watch,
        formState: { errors },
    } = useForm({
        resolver: yupResolver(schema),
        defaultValues: {
            title: '', summary: '', parentId: '', status: 'active',
            isFeatured: false, isNavigationVisible: true, sortOrder: 0,
            seoTitle: '', seoDescription: '',
        },
        mode: 'onBlur',
    });

    const fc = (field) =>
        `w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${errors[field] ? 'border-red-500 bg-red-50' : 'border-gray-300'}`;

    const watchSummary = watch('summary', '');
    const watchSeoTitle = watch('seoTitle', '');
    const watchSeoDesc = watch('seoDescription', '');

        const [images, setImages] = useState([]);
    const [imagePreviews, setImagePreviews] = useState([]);
    const [existingImages, setExistingImages] = useState([]);
    const [primaryImageIndex, setPrimaryImageIndex] = useState(0);

    const [categories, setCategories] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [imagesError, setImagesError] = useState('');

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
            
                        const categoriesWithHierarchy = categoriesList.map(cat => {
                let displayName = cat.title;
                
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
            logger.error('Error loading categories:', error);
            notify.error('Failed to load categories');
        }
    };

    const loadCategory = async () => {
        try {
            setIsLoading(true);
            const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.CATEGORIES}/${id}`);
            const data = await response.json();

            if (data.success) {
                const category = data.data;
                reset({
                    title: category.title || '',
                    summary: category.summary || '',
                    parentId: category.parentId || '',
                    status: category.status || 'active',
                    isFeatured: category.isFeatured || false,
                    isNavigationVisible: category.isNavigationVisible !== false,
                    sortOrder: category.sortOrder || 0,
                    seoTitle: category.seoTitle || '',
                    seoDescription: category.seoDescription || '',
                });

                                if (category.images && Array.isArray(category.images)) {
                    setExistingImages(category.images);
                } else if (category.photo) {
                                        setExistingImages([{
                        path: category.photo,
                        isPrimary: true,
                        sortOrder: 0
                    }]);
                }
            }
        } catch (error) {
            logger.error('Error loading category:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleImageChange = (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

                if (images.length + files.length > 5) {
            notify.error('Maximum 5 images allowed for categories');
            return;
        }

        const validFiles = files.filter(file => {
            if (!file.type.startsWith('image/')) {
                notify.error(`${file.name} is not an image`);
                return false;
            }
            if (file.size > 5 * 1024 * 1024) {
                notify.error(`${file.name} exceeds 5MB`);
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

    const onSubmit = async (data) => {
        if (!isEdit && images.length === 0 && existingImages.length === 0) {
            setImagesError('At least one image is required');
            return;
        }
        setImagesError('');
        setIsSaving(true);

        try {
            const formDataToSend = new FormData();

            Object.keys(data).forEach(key => {
                formDataToSend.append(key, data[key]);
            });

            images.forEach((image, index) => {
                formDataToSend.append('images', image);
                formDataToSend.append(`imageData[${index}][isPrimary]`, imagePreviews[index]?.isPrimary || false);
                formDataToSend.append(`imageData[${index}][sortOrder]`, index);
            });

            if (isEdit) {
                formDataToSend.append('existingImages', JSON.stringify(existingImages));
            }

            const url = isEdit
                ? `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.CATEGORIES}/${id}`
                : `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.CATEGORIES}`;

            const response = await authFetch(url, {
                method: isEdit ? 'PUT' : 'POST',
                body: formDataToSend,
            });

            const result = await response.json();

            if (result.success || response.ok) {
                notify.success(`Category ${isEdit ? 'updated' : 'created'} successfully!`);
                navigate('/admin/categories');
            } else {
                if (result.errors) {
                    result.errors.forEach(({ field, message }) => {
                        if (field) setError(field, { message });
                    });
                } else {
                    notify.error(result.message || 'Failed to save category');
                }
            }
        } catch (error) {
            logger.error('Error saving category:', error);
            notify.error('Failed to save category');
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

            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
                
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
                    <h2 className="text-xl font-bold text-gray-900">Basic Information</h2>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Title *
                        </label>
                        <input
                            {...register('title')}
                            type="text"
                            className={fc('title')}
                            placeholder="Enter category title"
                        />
                        {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Description
                        </label>
                        <textarea
                            {...register('summary')}
                            rows="3"
                            maxLength="500"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            placeholder="Brief category description"
                        />
                        <p className="mt-1 text-sm text-gray-500">{watchSummary.length}/500</p>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Parent Category
                        </label>
                        <select
                            {...register('parentId')}
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

<div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Category Image</h2>

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
                        {imagesError && <p className="mt-2 text-sm text-red-600">{imagesError}</p>}
                    </div>

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

<div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
                    <h2 className="text-xl font-bold text-gray-900">Settings</h2>

                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Status
                            </label>
                            <select
                                {...register('status')}
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
                                {...register('sortOrder')}
                                type="number"
                                min="0"
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    <div className="space-y-3">
                        <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                            <input
                                {...register('isFeatured')}
                                type="checkbox"
                                className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                            />
                            <span className="text-sm font-medium text-gray-700">Featured Category</span>
                        </label>

                        <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                            <input
                                {...register('isNavigationVisible')}
                                type="checkbox"
                                className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                            />
                            <span className="text-sm font-medium text-gray-700">Show in Navigation</span>
                        </label>
                    </div>
                </div>

<div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
                    <h2 className="text-xl font-bold text-gray-900">SEO Settings</h2>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            SEO Title
                        </label>
                        <input
                            {...register('seoTitle')}
                            type="text"
                            maxLength="60"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            placeholder="SEO optimized title"
                        />
                        {errors.seoTitle && <p className="mt-1 text-sm text-red-600">{errors.seoTitle.message}</p>}
                        <p className="mt-1 text-sm text-gray-500">{watchSeoTitle.length}/60</p>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            SEO Description
                        </label>
                        <textarea
                            {...register('seoDescription')}
                            maxLength="160"
                            rows="2"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            placeholder="Meta description for search engines"
                        />
                        {errors.seoDescription && <p className="mt-1 text-sm text-red-600">{errors.seoDescription.message}</p>}
                        <p className="mt-1 text-sm text-gray-500">{watchSeoDesc.length}/160</p>
                    </div>
                </div>

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
