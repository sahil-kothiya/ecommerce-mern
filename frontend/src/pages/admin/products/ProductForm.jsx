import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { API_CONFIG } from '../../../constants';
import { toast } from 'react-hot-toast';
import { applyServerFieldErrors, clearFieldError, getFieldBorderClass, hasValidationErrors } from '../../../utils/formValidation';

const ProductForm = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEdit = Boolean(id);

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        basePrice: '',
        baseDiscount: 0,
        categoryId: '',
        brandId: '',
        condition: 'new',
        status: 'active',
        isFeatured: false,
    });

    const [images, setImages] = useState([]);
    const [imagePreviews, setImagePreviews] = useState([]);
    const [existingImages, setExistingImages] = useState([]);

    const [categories, setCategories] = useState([]);
    const [brands, setBrands] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [errors, setErrors] = useState({});

    useEffect(() => {
        loadSelectOptions();
        if (isEdit) {
            loadProduct();
        }
         
    }, [id]);

    const getImageUrl = (img) => {
        if (!img) return '';
        const path = typeof img === 'string' ? img : img.path;
        if (!path) return '';
        if (/^https?:\/\//i.test(path)) return path;
        if (path.startsWith('/')) return `${API_CONFIG.BASE_URL}${path}`;
        if (path.startsWith('uploads/')) return `${API_CONFIG.BASE_URL}/${path}`;
        const normalized = path.startsWith('/') ? path.slice(1) : path;
        return `${API_CONFIG.BASE_URL}/uploads/${normalized}`;
    };

    const loadSelectOptions = async () => {
        try {
            const [categoriesRes, brandsRes] = await Promise.all([
                fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.CATEGORIES}`),
                fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.BRANDS}`),
            ]);

            const categoriesData = await categoriesRes.json();
            const brandsData = await brandsRes.json();

            const categoriesList = Array.isArray(categoriesData?.data) ? categoriesData.data : categoriesData?.data?.categories || [];
            const brandsList = Array.isArray(brandsData?.data) ? brandsData.data : brandsData?.data?.brands || [];

            const categoriesWithHierarchy = categoriesList.map((cat) => {
                let displayName = cat.title;
                if (cat.parentId) {
                    const parent = categoriesList.find((p) => p._id === cat.parentId);
                    if (parent) {
                        displayName = `${parent.title} > ${cat.title}`;
                    }
                }
                return { ...cat, displayName };
            });

            setCategories(categoriesWithHierarchy);
            setBrands(brandsList);
        } catch (error) {
            console.error('Error loading options:', error);
            toast.error('Failed to load categories and brands');
        }
    };

    const loadProduct = async () => {
        try {
            setIsLoading(true);
            const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.PRODUCTS}/${id}`);
            const data = await response.json();

            if (data.success) {
                const product = data.data;
                setFormData({
                    title: product.title || '',
                    description: product.description || '',
                    basePrice: product.basePrice || '',
                    baseDiscount: product.baseDiscount || 0,
                    categoryId: product.category?.id || '',
                    brandId: product.brand?.id || '',
                    condition: product.condition || 'new',
                    status: product.status || 'active',
                    isFeatured: product.isFeatured || false,
                });

                if (product.images && Array.isArray(product.images)) {
                    setExistingImages(product.images);
                }
            }
        } catch (error) {
            console.error('Error loading product:', error);
            toast.error('Failed to load product');
        } finally {
            setIsLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
        }));
        clearFieldError(setErrors, name);
    };

    const handleImageChange = (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        const totalImages = images.length + existingImages.length + files.length;
        if (totalImages > 10) {
            toast.error('Maximum 10 images allowed for products');
            return;
        }

        const validFiles = files.filter((file) => {
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

        setImages((prev) => [...prev, ...validFiles]);
        clearFieldError(setErrors, 'images');

        validFiles.forEach((file) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreviews((prev) => [...prev, { url: reader.result, name: file.name }]);
            };
            reader.readAsDataURL(file);
        });

        toast.success(`${validFiles.length} image(s) added`);
        e.target.value = '';
    };

    const removeImage = (index) => {
        setImages((prev) => prev.filter((_, i) => i !== index));
        setImagePreviews((prev) => prev.filter((_, i) => i !== index));
    };

    const removeExistingImage = (index) => {
        setExistingImages((prev) => prev.filter((_, i) => i !== index));
    };

    const validateForm = () => {
        const nextErrors = {};

        if (!formData.title.trim()) nextErrors.title = 'Title is required';
        if (!String(formData.basePrice).trim()) nextErrors.basePrice = 'Base price is required';
        else if (Number(formData.basePrice) <= 0) nextErrors.basePrice = 'Base price must be greater than 0';
        if (!formData.categoryId) nextErrors.categoryId = 'Category is required';
        if (!formData.brandId) nextErrors.brandId = 'Brand is required';
        if (!isEdit && images.length + existingImages.length === 0) nextErrors.images = 'At least one image is required';

        setErrors(nextErrors);
        return Object.keys(nextErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const isValid = validateForm();
        if (!isValid) {
            toast.error('Please fix form validation errors');
            return;
        }
        setIsSaving(true);

        try {
            const formDataToSend = new FormData();

            Object.keys(formData).forEach((key) => {
                formDataToSend.append(key, formData[key]);
            });

            images.forEach((image) => {
                formDataToSend.append('images', image);
            });

            if (isEdit) {
                formDataToSend.append('existingImages', JSON.stringify(existingImages));
            }

            const url = isEdit
                ? `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.PRODUCTS}/${id}`
                : `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.PRODUCTS}`;

            const response = await fetch(url, {
                method: isEdit ? 'PUT' : 'POST',
                credentials: 'include',
                body: formDataToSend,
            });

            const data = await response.json();

            if (data.success || response.ok) {
                toast.success(`Product ${isEdit ? 'updated' : 'created'} successfully!`);
                navigate('/admin/products');
            } else {
                const nextErrors = applyServerFieldErrors(setErrors, data?.errors);
                if (hasValidationErrors(nextErrors)) {
                    toast.error(data?.message || 'Please fix form validation errors');
                    return;
                }
                toast.error(data.message || 'Failed to save product');
            }
        } catch (error) {
            console.error('Error saving product:', error);
            toast.error('Failed to save product. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex h-[420px] items-center justify-center">
                <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
                    <div className="mx-auto mb-4 h-16 w-16 animate-spin rounded-full border-b-4 border-slate-700" />
                    <p className="text-lg font-semibold text-slate-800">Loading product workspace...</p>
                    <p className="mt-1 text-sm text-slate-500">Preparing product details and media</p>
                </div>
            </div>
        );
    }

    const totalImages = existingImages.length + imagePreviews.length;
    const productStatus = formData.status || 'draft';

    return (
        <div className="relative w-full space-y-8 px-4">
            <div className="pointer-events-none absolute right-8 top-16 h-40 w-40 rounded-full bg-cyan-300/20 blur-3xl" />
            <div className="pointer-events-none absolute bottom-20 left-8 h-44 w-44 rounded-full bg-sky-300/20 blur-3xl" />

            <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-900 via-slate-800 to-cyan-900 p-6 text-white shadow-[0_20px_60px_rgba(15,23,42,0.35)] sm:p-8">
                <div className="absolute -right-10 -top-20 h-48 w-48 rounded-full bg-cyan-400/20 blur-3xl" />
                <div className="absolute -bottom-20 -left-10 h-44 w-44 rounded-full bg-sky-300/20 blur-3xl" />
                <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-200/80">Product Studio</p>
                        <h1 className="mt-2 text-3xl font-black leading-tight sm:text-4xl">{isEdit ? 'Edit Product' : 'Create Product'}</h1>
                        <p className="mt-2 text-slate-200/90">
                            {isEdit ? 'Update product details, pricing, classification, and images' : 'Create a polished catalog product with consistent metadata and visuals'}
                        </p>
                    </div>
                    <span
                        className={`inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-bold ${
                            productStatus === 'active'
                                ? 'border-emerald-200 bg-emerald-100 text-emerald-800'
                                : productStatus === 'inactive'
                                  ? 'border-amber-200 bg-amber-100 text-amber-800'
                                  : 'border-slate-300 bg-slate-100 text-slate-700'
                        }`}
                    >
                        {productStatus}
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
                <div className="rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm backdrop-blur">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Workflow</p>
                    <p className="mt-1 text-lg font-black text-slate-900">{isEdit ? 'Editing Product' : 'Creating Product'}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm backdrop-blur">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Images</p>
                    <p className="mt-1 text-lg font-black text-slate-900">{totalImages} Selected</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm backdrop-blur">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Price</p>
                    <p className="mt-1 text-lg font-black text-slate-900">{formData.basePrice ? `$${formData.basePrice}` : 'Not Set'}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm backdrop-blur">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Featured</p>
                    <p className="mt-1 text-lg font-black text-slate-900">{formData.isFeatured ? 'Yes' : 'No'}</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} noValidate className="space-y-6">
                <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
                    <div className="order-1 space-y-6 lg:order-1">
                        <div className="space-y-6 rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-[0_10px_30px_rgba(15,23,42,0.08)] transition-all hover:shadow-[0_20px_40px_rgba(15,23,42,0.12)] sm:p-7">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-black text-slate-900">Basic Information</h2>
                                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-cyan-200 bg-gradient-to-br from-cyan-100 to-sky-100 text-cyan-700">
                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6M7 4h10a2 2 0 012 2v12a2 2 0 01-2 2H7a2 2 0 01-2-2V6a2 2 0 012-2z" />
                                    </svg>
                                </span>
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-semibold text-slate-700">Product Title *</label>
                                <input
                                    type="text"
                                    name="title"
                                    value={formData.title}
                                    onChange={handleChange}
                                    className={`w-full rounded-xl border px-4 py-3 text-slate-900 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-200 ${getFieldBorderClass(errors, 'title')}`}
                                    placeholder="Enter product title"
                                />
                                {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title}</p>}
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-semibold text-slate-700">Description</label>
                                <textarea
                                    name="description"
                                    value={formData.description}
                                    onChange={handleChange}
                                    rows="5"
                                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-200"
                                    placeholder="Enter product description"
                                />
                            </div>

                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <div>
                                    <label className="mb-2 block text-sm font-semibold text-slate-700">Base Price *</label>
                                    <input
                                        type="number"
                                        name="basePrice"
                                        value={formData.basePrice}
                                        onChange={handleChange}
                                        step="0.01"
                                        min="0"
                                        className={`w-full rounded-xl border px-4 py-3 text-slate-900 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-200 ${getFieldBorderClass(errors, 'basePrice')}`}
                                        placeholder="0.00"
                                    />
                                    {errors.basePrice && <p className="mt-1 text-sm text-red-600">{errors.basePrice}</p>}
                                </div>

                                <div>
                                    <label className="mb-2 block text-sm font-semibold text-slate-700">Discount (%)</label>
                                    <input
                                        type="number"
                                        name="baseDiscount"
                                        value={formData.baseDiscount}
                                        onChange={handleChange}
                                        step="0.01"
                                        min="0"
                                        max="100"
                                        className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-200"
                                        placeholder="0"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6 rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-[0_10px_30px_rgba(15,23,42,0.08)] transition-all hover:shadow-[0_20px_40px_rgba(15,23,42,0.12)] sm:p-7">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-black text-slate-900">Classification</h2>
                                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-indigo-200 bg-gradient-to-br from-indigo-100 to-sky-100 text-indigo-700">
                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7h18M3 12h18M3 17h18" />
                                    </svg>
                                </span>
                            </div>

                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <div>
                                    <label className="mb-2 block text-sm font-semibold text-slate-700">Category</label>
                                    <select
                                        name="categoryId"
                                        value={formData.categoryId}
                                        onChange={handleChange}
                                        className={`w-full rounded-xl border px-4 py-3 text-slate-900 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-200 ${getFieldBorderClass(errors, 'categoryId')}`}
                                    >
                                        <option value="">Select Category</option>
                                        {categories.map((cat) => (
                                            <option key={cat._id} value={cat._id}>
                                                {cat.displayName || cat.title}
                                            </option>
                                        ))}
                                    </select>
                                    {errors.categoryId && <p className="mt-1 text-sm text-red-600">{errors.categoryId}</p>}
                                </div>

                                <div>
                                    <label className="mb-2 block text-sm font-semibold text-slate-700">Brand</label>
                                    <select
                                        name="brandId"
                                        value={formData.brandId}
                                        onChange={handleChange}
                                        className={`w-full rounded-xl border px-4 py-3 text-slate-900 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-200 ${getFieldBorderClass(errors, 'brandId')}`}
                                    >
                                        <option value="">Select Brand</option>
                                        {brands.map((brand) => (
                                            <option key={brand._id} value={brand._id}>
                                                {brand.title}
                                            </option>
                                        ))}
                                    </select>
                                    {errors.brandId && <p className="mt-1 text-sm text-red-600">{errors.brandId}</p>}
                                </div>

                                <div>
                                    <label className="mb-2 block text-sm font-semibold text-slate-700">Condition</label>
                                    <select
                                        name="condition"
                                        value={formData.condition}
                                        onChange={handleChange}
                                        className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-200"
                                    >
                                        <option value="new">New</option>
                                        <option value="hot">Hot</option>
                                        <option value="default">Default</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="mb-2 block text-sm font-semibold text-slate-700">Status</label>
                                    <select
                                        name="status"
                                        value={formData.status}
                                        onChange={handleChange}
                                        className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-200"
                                    >
                                        <option value="active">Active</option>
                                        <option value="inactive">Inactive</option>
                                        <option value="draft">Draft</option>
                                    </select>
                                </div>
                            </div>

                            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                                <label className="flex cursor-pointer items-center gap-3">
                                    <input
                                        type="checkbox"
                                        name="isFeatured"
                                        checked={formData.isFeatured}
                                        onChange={handleChange}
                                        className="h-5 w-5 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                                    />
                                    <span className="text-sm font-semibold text-slate-700">Mark as Featured Product</span>
                                </label>
                            </div>
                        </div>
                    </div>

                    <div className="order-2 space-y-6 lg:order-2">
                        <div className="media-card">
                            <div className="mb-4 flex items-center justify-between">
                                <h2 className="text-xl font-black text-slate-900">Product Images</h2>
                                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-cyan-200 bg-gradient-to-br from-cyan-100 to-blue-100 text-cyan-700">
                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14" />
                                    </svg>
                                </span>
                            </div>
                            <p className="mb-5 text-sm text-slate-500">Upload up to 10 product images (JPG, PNG, GIF, WEBP), max 5MB each.</p>

                            <div>
                                <label className="mb-2 block text-sm font-semibold text-slate-700">Product Images</label>
                                <input
                                    type="file"
                                    multiple
                                    accept="image/jpeg,image/png,image/gif,image/webp"
                                    onChange={handleImageChange}
                                    className={`media-file-input ${errors.images ? 'border-red-500 focus:ring-red-200' : ''}`}
                                />
                                {errors.images && <p className="mt-2 text-sm text-red-600">{errors.images}</p>}
                            </div>

                            {existingImages.length > 0 && (
                                <div className="mt-6">
                                    <h3 className="mb-3 text-sm font-semibold text-slate-700">Current Images</h3>
                                    <div className="media-grid">
                                        {existingImages.map((img, index) => (
                                            <div key={index} className="group media-thumb">
                                                <img src={getImageUrl(img)} alt={`Product ${index + 1}`} className="h-full w-full object-cover" />
                                                <button
                                                    type="button"
                                                    onClick={() => removeExistingImage(index)}
                                                    className="media-remove-btn"
                                                >
                                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {imagePreviews.length > 0 && (
                                <div className="mt-6">
                                    <h3 className="mb-3 text-sm font-semibold text-slate-700">New Images</h3>
                                    <div className="media-grid">
                                        {imagePreviews.map((preview, index) => (
                                            <div key={index} className="group media-thumb">
                                                <img src={preview.url} alt={preview.name} className="h-full w-full object-cover" />
                                                <button
                                                    type="button"
                                                    onClick={() => removeImage(index)}
                                                    className="media-remove-btn"
                                                >
                                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

                <div className="sticky bottom-3 z-10 flex flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-white/90 p-3 shadow-[0_10px_30px_rgba(15,23,42,0.12)] backdrop-blur sm:flex-row">
                    <button
                        type="button"
                        onClick={() => navigate('/admin/products')}
                        className="w-full rounded-xl border border-slate-300 bg-white px-6 py-3 font-semibold text-slate-800 transition-colors hover:bg-slate-100 sm:w-auto"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={isSaving}
                        className="w-full rounded-xl bg-cyan-400 px-6 py-3 font-bold text-slate-900 transition-colors hover:bg-cyan-300 disabled:opacity-50 sm:flex-1"
                    >
                        {isSaving ? 'Saving...' : isEdit ? 'Update Product' : 'Create Product'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default ProductForm;
