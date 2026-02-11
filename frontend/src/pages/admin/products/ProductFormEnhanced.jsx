import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { API_CONFIG } from '../../../constants';

const ProductFormEnhanced = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEdit = Boolean(id);

    // ===========================
    // State Management
    // ===========================

    const [formData, setFormData] = useState({
        title: '',
        summary: '',
        description: '',
        basePrice: '',
        baseDiscount: 0,
        baseStock: 0,
        baseSku: '',
        categoryId: '',
        brandId: '',
        condition: 'new',
        status: 'draft',
        isFeatured: false,
        tags: [],
        size: []
    });

    const [images, setImages] = useState([]);
    const [imagePreviews, setImagePreviews] = useState([]);
    const [existingImages, setExistingImages] = useState([]);
    const [draggedIndex, setDraggedIndex] = useState(null);

    const [categories, setCategories] = useState([]);
    const [brands, setBrands] = useState([]);
    
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [errors, setErrors] = useState({});

    // ===========================
    // Effects
    // ===========================

    useEffect(() => {
        loadSelectOptions();
        if (isEdit) {
            loadProduct();
        }
    }, [id]);

    // ===========================
    // Data Loading Functions
    // ===========================

    /**
     * Load categories and brands for select dropdowns
     */
    const loadSelectOptions = async () => {
        try {
            const [categoriesRes, brandsRes] = await Promise.all([
                fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.CATEGORIES}`),
                fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.BRANDS}`)
            ]);

            const categoriesData = await categoriesRes.json();
            const brandsData = await brandsRes.json();

            setCategories(
                Array.isArray(categoriesData?.data) 
                    ? categoriesData.data 
                    : categoriesData?.data?.categories || []
            );
            
            setBrands(
                Array.isArray(brandsData?.data) 
                    ? brandsData.data 
                    : brandsData?.data?.brands || []
            );
        } catch (error) {
            console.error('Error loading options:', error);
            showNotification('Failed to load categories and brands', 'error');
        }
    };

    /**
     * Load product data for editing
     */
    const loadProduct = async () => {
        try {
            setIsLoading(true);
            const response = await fetch(
                `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.PRODUCTS}/${id}`
            );
            const data = await response.json();

            if (data.success) {
                const product = data.data;
                
                setFormData({
                    title: product.title || '',
                    summary: product.summary || '',
                    description: product.description || '',
                    basePrice: product.basePrice || '',
                    baseDiscount: product.baseDiscount || 0,
                    baseStock: product.baseStock || 0,
                    baseSku: product.baseSku || '',
                    categoryId: product.category?.id || '',
                    brandId: product.brand?.id || '',
                    condition: product.condition || 'new',
                    status: product.status || 'draft',
                    isFeatured: product.isFeatured || false,
                    tags: product.tags || [],
                    size: product.size || []
                });

                if (product.images && product.images.length > 0) {
                    setExistingImages(product.images);
                }
            }
        } catch (error) {
            console.error('Error loading product:', error);
            showNotification('Failed to load product', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    // ===========================
    // Form Handlers
    // ===========================

    /**
     * Handle input field changes
     */
    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));

        // Clear error for this field
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: null }));
        }
    };

    /**
     * Handle tag input
     */
    const handleTagsChange = (e) => {
        const tags = e.target.value.split(',').map(tag => tag.trim()).filter(Boolean);
        setFormData(prev => ({ ...prev, tags }));
    };

    /**
     * Handle size input
     */
    const handleSizeChange = (e) => {
        const sizes = e.target.value.split(',').map(size => size.trim()).filter(Boolean);
        setFormData(prev => ({ ...prev, size: sizes }));
    };

    // ===========================
    // Image Upload Handlers
    // ===========================

    /**
     * Handle image file selection
     */
    const handleImageChange = (e) => {
        const files = Array.from(e.target.files);
        
        if (files.length === 0) return;

        // Validate file count
        if (images.length + files.length > 10) {
            showNotification('Maximum 10 images allowed', 'error');
            return;
        }

        // Validate file types and sizes
        const validFiles = files.filter(file => {
            const isImage = file.type.startsWith('image/');
            const isValidSize = file.size <= 5 * 1024 * 1024; // 5MB

            if (!isImage) {
                showNotification(`${file.name} is not an image`, 'error');
                return false;
            }

            if (!isValidSize) {
                showNotification(`${file.name} exceeds 5MB`, 'error');
                return false;
            }

            return true;
        });

        if (validFiles.length === 0) return;

        // Add new images
        setImages(prev => [...prev, ...validFiles]);

        // Create previews
        validFiles.forEach(file => {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreviews(prev => [...prev, {
                    url: reader.result,
                    name: file.name,
                    isPrimary: false
                }]);
            };
            reader.readAsDataURL(file);
        });
    };

    /**
     * Remove image from upload queue
     */
    const removeImage = (index) => {
        setImages(prev => prev.filter((_, i) => i !== index));
        setImagePreviews(prev => prev.filter((_, i) => i !== index));
    };

    /**
     * Remove existing image
     */
    const removeExistingImage = (index) => {
        setExistingImages(prev => prev.filter((_, i) => i !== index));
    };

    /**
     * Set primary image
     */
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

    // ===========================
    // Drag and Drop Handlers
    // ===========================

    /**
     * Handle drag start
     */
    const handleDragStart = (e, index) => {
        setDraggedIndex(index);
        e.dataTransfer.effectAllowed = 'move';
    };

    /**
     * Handle drag over
     */
    const handleDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    /**
     * Handle drop
     */
    const handleDrop = (e, dropIndex) => {
        e.preventDefault();
        
        if (draggedIndex === null || draggedIndex === dropIndex) return;

        const newPreviews = [...imagePreviews];
        const newImages = [...images];
        
        const draggedPreview = newPreviews[draggedIndex];
        const draggedImage = newImages[draggedIndex];

        newPreviews.splice(draggedIndex, 1);
        newPreviews.splice(dropIndex, 0, draggedPreview);

        newImages.splice(draggedIndex, 1);
        newImages.splice(dropIndex, 0, draggedImage);

        setImagePreviews(newPreviews);
        setImages(newImages);
        setDraggedIndex(null);
    };

    // ===========================
    // Form Validation
    // ===========================

    /**
     * Validate form data
     */
    const validateForm = () => {
        const newErrors = {};

        if (!formData.title.trim()) {
            newErrors.title = 'Title is required';
        }

        if (!formData.basePrice || parseFloat(formData.basePrice) <= 0) {
            newErrors.basePrice = 'Valid price is required';
        }

        if (!formData.baseSku.trim() && !isEdit) {
            newErrors.baseSku = 'SKU is required';
        }

        if (!isEdit && images.length === 0 && existingImages.length === 0) {
            newErrors.images = 'At least one image is required';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // ===========================
    // Form Submission
    // ===========================

    /**
     * Handle form submission
     */
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            showNotification('Please fix form errors', 'error');
            return;
        }

        setIsSaving(true);

        try {
            const formDataToSend = new FormData();

            // Append text fields
            Object.keys(formData).forEach(key => {
                if (Array.isArray(formData[key])) {
                    formData[key].forEach(item => {
                        formDataToSend.append(`${key}[]`, item);
                    });
                } else {
                    formDataToSend.append(key, formData[key]);
                }
            });

            // Append images
            images.forEach((image, index) => {
                formDataToSend.append('images', image);
                formDataToSend.append(`imageData[${index}][isPrimary]`, 
                    imagePreviews[index]?.isPrimary || false
                );
            });

            // Append existing images data
            if (isEdit) {
                formDataToSend.append('existingImages', JSON.stringify(existingImages));
            }

            const url = isEdit
                ? `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.PRODUCTS}/${id}`
                : `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.PRODUCTS}`;

            const response = await fetch(url, {
                method: isEdit ? 'PUT' : 'POST',
                body: formDataToSend
            });

            const data = await response.json();

            if (data.success || response.ok) {
                showNotification(
                    `Product ${isEdit ? 'updated' : 'created'} successfully!`,
                    'success'
                );
                navigate('/admin/products');
            } else {
                showNotification(data.message || 'Failed to save product', 'error');
            }
        } catch (error) {
            console.error('Error saving product:', error);
            showNotification('Failed to save product', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    // ===========================
    // Utility Functions
    // ===========================

    /**
     * Show notification (implement with your notification system)
     */
    const showNotification = (message, type = 'info') => {
        // TODO: Implement with toast/notification library
        if (type === 'error') {
            alert(`Error: ${message}`);
        } else {
            console.log(`${type}: ${message}`);
        }
    };

    /**
     * Calculate final price with discount
     */
    const calculateFinalPrice = () => {
        const price = parseFloat(formData.basePrice) || 0;
        const discount = parseFloat(formData.baseDiscount) || 0;
        return price - (price * discount / 100);
    };

    // ===========================
    // Render Loading State
    // ===========================

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-lg text-gray-700 font-medium">Loading product...</p>
                </div>
            </div>
        );
    }

    // ===========================
    // Main Render
    // ===========================

    return (
        <div className="max-w-6xl mx-auto px-4 py-8">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-4xl font-bold text-gray-900 mb-2">
                    {isEdit ? 'Edit Product' : 'Create New Product'}
                </h1>
                <p className="text-gray-600">
                    {isEdit ? 'Update product information and images' : 'Add a new product with images and details'}
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
                {/* Basic Information Section */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                        <span className="bg-blue-100 text-blue-600 w-8 h-8 rounded-full flex items-center justify-center mr-3 text-sm font-bold">1</span>
                        Basic Information
                    </h2>

                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Product Title *
                            </label>
                            <input
                                type="text"
                                name="title"
                                value={formData.title}
                                onChange={handleChange}
                                required
                                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all ${
                                    errors.title ? 'border-red-500' : 'border-gray-300'
                                }`}
                                placeholder="Enter product title"
                            />
                            {errors.title && (
                                <p className="mt-1 text-sm text-red-600">{errors.title}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Summary
                            </label>
                            <textarea
                                name="summary"
                                value={formData.summary}
                                onChange={handleChange}
                                rows="2"
                                maxLength="500"
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                placeholder="Brief product summary (max 500 characters)"
                            />
                            <p className="mt-1 text-sm text-gray-500">
                                {formData.summary.length}/500 characters
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Description
                            </label>
                            <textarea
                                name="description"
                                value={formData.description}
                                onChange={handleChange}
                                rows="6"
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                placeholder="Detailed product description"
                            />
                        </div>
                    </div>
                </div>

                {/* Pricing & Inventory Section */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                        <span className="bg-green-100 text-green-600 w-8 h-8 rounded-full flex items-center justify-center mr-3 text-sm font-bold">2</span>
                        Pricing & Inventory
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Base Price *
                            </label>
                            <div className="relative">
                                <span className="absolute left-4 top-3 text-gray-500 font-medium">$</span>
                                <input
                                    type="number"
                                    name="basePrice"
                                    value={formData.basePrice}
                                    onChange={handleChange}
                                    required
                                    step="0.01"
                                    min="0"
                                    className={`w-full pl-8 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all ${
                                        errors.basePrice ? 'border-red-500' : 'border-gray-300'
                                    }`}
                                    placeholder="0.00"
                                />
                            </div>
                            {errors.basePrice && (
                                <p className="mt-1 text-sm text-red-600">{errors.basePrice}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Discount (%)
                            </label>
                            <input
                                type="number"
                                name="baseDiscount"
                                value={formData.baseDiscount}
                                onChange={handleChange}
                                step="0.01"
                                min="0"
                                max="100"
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                placeholder="0"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Final Price
                            </label>
                            <div className="px-4 py-3 bg-gray-100 border border-gray-300 rounded-xl text-gray-900 font-bold text-lg">
                                ${calculateFinalPrice().toFixed(2)}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Stock Quantity *
                            </label>
                            <input
                                type="number"
                                name="baseStock"
                                value={formData.baseStock}
                                onChange={handleChange}
                                required
                                min="0"
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                placeholder="0"
                            />
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                SKU (Stock Keeping Unit) *
                            </label>
                            <input
                                type="text"
                                name="baseSku"
                                value={formData.baseSku}
                                onChange={handleChange}
                                required={!isEdit}
                                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all uppercase ${
                                    errors.baseSku ? 'border-red-500' : 'border-gray-300'
                                }`}
                                placeholder="e.g., PROD-12345"
                            />
                            {errors.baseSku && (
                                <p className="mt-1 text-sm text-red-600">{errors.baseSku}</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Image Upload Section */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                        <span className="bg-purple-100 text-purple-600 w-8 h-8 rounded-full flex items-center justify-center mr-3 text-sm font-bold">3</span>
                        Product Images
                    </h2>

                    <div className="space-y-6">
                        {/* Upload Button */}
                        <div>
                            <label className="block">
                                <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-blue-500 hover:bg-blue-50 transition-all cursor-pointer">
                                    <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                    </svg>
                                    <p className="text-gray-700 font-semibold mb-1">
                                        Click to upload or drag and drop
                                    </p>
                                    <p className="text-sm text-gray-500">
                                        PNG, JPG, GIF, WEBP up to 5MB (Max 10 images)
                                    </p>
                                </div>
                                <input
                                    type="file"
                                    multiple
                                    accept="image/*"
                                    onChange={handleImageChange}
                                    className="hidden"
                                />
                            </label>
                            {errors.images && (
                                <p className="mt-2 text-sm text-red-600">{errors.images}</p>
                            )}
                        </div>

                        {/* Existing Images */}
                        {existingImages.length > 0 && (
                            <div>
                                <h3 className="text-sm font-semibold text-gray-700 mb-3">
                                    Current Images
                                </h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                    {existingImages.map((img, index) => (
                                        <div
                                            key={index}
                                            className="relative group aspect-square bg-gray-100 rounded-xl overflow-hidden border-2 border-gray-200"
                                        >
                                            <img
                                                src={`${API_CONFIG.BASE_URL}/uploads/${img.path}`}
                                                alt={img.altText || `Product ${index + 1}`}
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
                                                    className="bg-white text-gray-800 p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-100"
                                                    title="Set as primary"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                    </svg>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => removeExistingImage(index)}
                                                    className="bg-red-500 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                                                    title="Remove"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* New Image Previews with Drag & Drop */}
                        {imagePreviews.length > 0 && (
                            <div>
                                <h3 className="text-sm font-semibold text-gray-700 mb-3">
                                    New Images (Drag to reorder)
                                </h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                    {imagePreviews.map((preview, index) => (
                                        <div
                                            key={index}
                                            draggable
                                            onDragStart={(e) => handleDragStart(e, index)}
                                            onDragOver={handleDragOver}
                                            onDrop={(e) => handleDrop(e, index)}
                                            className={`relative group aspect-square bg-gray-100 rounded-xl overflow-hidden border-2 cursor-move transition-all ${
                                                draggedIndex === index 
                                                    ? 'border-blue-500 opacity-50' 
                                                    : 'border-gray-200'
                                            }`}
                                        >
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
                                            <div className="absolute top-2 right-2 bg-white bg-opacity-90 text-gray-700 text-xs px-2 py-1 rounded-full font-semibold">
                                                {index + 1}
                                            </div>
                                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all flex items-center justify-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setPrimaryImage(index, false)}
                                                    className="bg-white text-gray-800 p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-100"
                                                    title="Set as primary"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                    </svg>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => removeImage(index)}
                                                    className="bg-red-500 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                                                    title="Remove"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                </div>

                {/* Classification Section */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                        <span className="bg-orange-100 text-orange-600 w-8 h-8 rounded-full flex items-center justify-center mr-3 text-sm font-bold">4</span>
                        Classification & Attributes
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Category
                            </label>
                            <select
                                name="categoryId"
                                value={formData.categoryId}
                                onChange={handleChange}
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                            >
                                <option value="">Select Category</option>
                                {categories.map((cat) => (
                                    <option key={cat._id} value={cat._id}>
                                        {cat.title}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Brand
                            </label>
                            <select
                                name="brandId"
                                value={formData.brandId}
                                onChange={handleChange}
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                            >
                                <option value="">Select Brand</option>
                                {brands.map((brand) => (
                                    <option key={brand._id} value={brand._id}>
                                        {brand.title}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Condition
                            </label>
                            <select
                                name="condition"
                                value={formData.condition}
                                onChange={handleChange}
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                            >
                                <option value="new">New</option>
                                <option value="hot">Hot</option>
                                <option value="default">Default</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Status
                            </label>
                            <select
                                name="status"
                                value={formData.status}
                                onChange={handleChange}
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                            >
                                <option value="draft">Draft</option>
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                            </select>
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Tags (comma-separated)
                            </label>
                            <input
                                type="text"
                                value={formData.tags.join(', ')}
                                onChange={handleTagsChange}
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                placeholder="e.g., summer, sale, trending"
                            />
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Available Sizes (comma-separated)
                            </label>
                            <input
                                type="text"
                                value={formData.size.join(', ')}
                                onChange={handleSizeChange}
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                placeholder="e.g., S, M, L, XL"
                            />
                        </div>

                        <div className="md:col-span-2 flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                            <input
                                type="checkbox"
                                name="isFeatured"
                                id="isFeatured"
                                checked={formData.isFeatured}
                                onChange={handleChange}
                                className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <label htmlFor="isFeatured" className="text-sm font-medium text-gray-700 cursor-pointer">
                                ⭐ Mark as Featured Product (Display on homepage)
                            </label>
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-4 justify-end bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                    <button
                        type="button"
                        onClick={() => navigate('/admin/products')}
                        className="px-8 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-xl font-semibold transition-all"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={isSaving}
                        className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {isSaving ? (
                            <>
                                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                Saving...
                            </>
                        ) : (
                            <>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                {isEdit ? 'Update Product' : 'Create Product'}
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default ProductFormEnhanced;
