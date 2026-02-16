import React, { useState, useEffect } from 'react';
import { API_CONFIG } from '../../../constants';
import authService from '../../../services/authService';
import ConfirmDialog from '../../../components/common/ConfirmDialog';
import notify from '../../../utils/notify';

const CategoriesList = () => {
    const [categories, setCategories] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null);
    const [formData, setFormData] = useState({ title: '', summary: '', photo: '', status: 'active' });
    const [imagePreview, setImagePreview] = useState('');
    const [selectedFile, setSelectedFile] = useState(null);
    const [categoryToDelete, setCategoryToDelete] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        loadCategories();
    }, []);

    const loadCategories = async () => {
        try {
            setIsLoading(true);
            const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.CATEGORIES}`);
            const data = await response.json();
            
            if (response.status === 401) {
                await authService.logout();
                window.location.href = '/login';
                return;
            }
            
            setCategories(Array.isArray(data?.data) ? data.data : data?.data?.categories || []);
        } catch (error) {
            console.error('Error loading categories:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const url = editingCategory
                ? `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.CATEGORIES}/${editingCategory._id}`
                : `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.CATEGORIES}`;

            // Create FormData for file upload
            const submitData = new FormData();
            submitData.append('title', formData.title);
            submitData.append('summary', formData.summary);
            submitData.append('status', formData.status);
            
            // Add file if selected, otherwise keep existing photo URL if editing
            if (selectedFile) {
                submitData.append('photo', selectedFile);
            } else if (!editingCategory && formData.photo) {
                submitData.append('photo', formData.photo);
            }

            // Get auth headers without Content-Type (browser sets it automatically for FormData)
            const headers = authService.getAuthHeaders();
            delete headers['Content-Type'];

            const response = await fetch(url, {
                method: editingCategory ? 'PUT' : 'POST',
                headers: headers,
                body: submitData,
            });

            const responseData = await response.json();

            if (response.ok) {
                notify.success(`Category ${editingCategory ? 'updated' : 'created'} successfully`);
                setShowModal(false);
                setEditingCategory(null);
                setFormData({ title: '', summary: '', photo: '', status: 'active' });
                setImagePreview('');
                setSelectedFile(null);
                loadCategories();
            } else {
                // Handle authentication errors
                if (response.status === 401) {
                    notify.info('Your session has expired. Please login again.');
                    await authService.logout();
                    window.location.href = '/login';
                    return;
                }
                notify.error(responseData, 'Failed to save category');
            }
        } catch (error) {
            console.error('Error saving category:', error);
            notify.error(error, 'Failed to save category');
        }
    };

    const handleEdit = (category) => {
        setEditingCategory(category);
        setFormData({
            title: category.title,
            summary: category.summary || '',
            photo: category.photo || '',
            status: category.status || 'active',
        });
        setImagePreview(category.photo ? `${API_CONFIG.BASE_URL}${category.photo}` : '');
        setSelectedFile(null);
        setShowModal(true);
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Validate file type
            const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
            if (!validTypes.includes(file.type)) {
                notify.info('Please select a valid image file (JPG, PNG, GIF, or WEBP)');
                return;
            }
            
            // Validate file size (5MB)
            if (file.size > 5 * 1024 * 1024) {
                notify.info('File size must be less than 5MB');
                return;
            }

            setSelectedFile(file);
            
            // Create preview URL
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleDelete = async () => {
        if (!categoryToDelete?._id) return;
        try {
            setIsDeleting(true);
            const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.CATEGORIES}/${categoryToDelete._id}`, {
                method: 'DELETE',
                headers: authService.getAuthHeaders(),
            });

            if (response.status === 401) {
                notify.info('Your session has expired. Please login again.');
                await authService.logout();
                window.location.href = '/login';
                return;
            }

            if (response.ok) {
                setCategoryToDelete(null);
                notify.success('Category deleted successfully');
                loadCategories();
            } else {
                const errorData = await response.json();
                notify.error(errorData, 'Failed to delete category');
            }
        } catch (error) {
            console.error('Error deleting category:', error);
            notify.error(error, 'Failed to delete category');
        } finally {
            setIsDeleting(false);
        }
    };

    const totalCategories = categories.length;
    const activeCategories = categories.filter((cat) => cat.status === 'active').length;
    const inactiveCategories = totalCategories - activeCategories;
    const withImage = categories.filter((cat) => Boolean(cat.photo)).length;

    return (
        <div className="space-y-8">
            <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 p-6 text-white shadow-lg sm:p-8">
                <div className="absolute -right-10 -top-20 h-48 w-48 rounded-full bg-indigo-400/20 blur-3xl" />
                <div className="absolute -bottom-20 -left-10 h-44 w-44 rounded-full bg-blue-300/20 blur-3xl" />
                <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-200/80">Admin Console</p>
                        <h1 className="mt-2 text-3xl font-black leading-tight sm:text-4xl">Category Library</h1>
                        <p className="mt-2 max-w-xl text-slate-200/90">Quickly review, edit, and maintain flat category records.</p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <button
                            onClick={loadCategories}
                            className="rounded-xl border border-white/30 bg-white/10 px-5 py-3 font-semibold backdrop-blur-sm transition-all hover:bg-white/20"
                        >
                            Refresh
                        </button>
                        <button
                            onClick={() => {
                                setEditingCategory(null);
                                setFormData({ title: '', summary: '', photo: '', status: 'active' });
                                setImagePreview('');
                                setSelectedFile(null);
                                setShowModal(true);
                            }}
                            className="flex items-center gap-2 rounded-xl bg-indigo-300 px-5 py-3 font-bold text-slate-900 transition-colors hover:bg-indigo-200"
                        >
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                            </svg>
                            Add Category
                        </button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <p className="text-xs uppercase tracking-widest text-slate-500">Total</p>
                    <p className="mt-2 text-3xl font-black text-slate-900">{totalCategories}</p>
                </div>
                <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-5 shadow-sm">
                    <p className="text-xs uppercase tracking-widest text-emerald-700">Active</p>
                    <p className="mt-2 text-3xl font-black text-emerald-800">{activeCategories}</p>
                </div>
                <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-5 shadow-sm">
                    <p className="text-xs uppercase tracking-widest text-amber-700">Inactive</p>
                    <p className="mt-2 text-3xl font-black text-amber-800">{inactiveCategories}</p>
                </div>
                <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-white p-5 shadow-sm">
                    <p className="text-xs uppercase tracking-widest text-blue-700">With Image</p>
                    <p className="mt-2 text-3xl font-black text-blue-800">{withImage}</p>
                </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                {isLoading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-indigo-600"></div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
                        {categories.map((category) => (
                            <div key={category._id} className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                                {category.photo && (
                                    <div className="h-40 overflow-hidden bg-gradient-to-br from-slate-100 via-slate-50 to-indigo-100">
                                        <img 
                                            src={`${API_CONFIG.BASE_URL}${category.photo}`} 
                                            alt={category.title}
                                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                            onError={(e) => { e.target.style.display = 'none'; }}
                                        />
                                    </div>
                                )}
                                <div className="p-6">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex-1">
                                            <h3 className="mb-1 text-lg font-black text-slate-900">{category.title}</h3>
                                            <p className="text-sm text-slate-500">{category.summary || 'No description'}</p>
                                        </div>
                                        <span className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${
                                            category.status === 'active'
                                                ? 'border-emerald-200 bg-emerald-100 text-emerald-700'
                                                : 'border-amber-200 bg-amber-100 text-amber-700'
                                        }`}>
                                            {category.status}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => handleEdit(category)}
                                            className="flex-1 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-700"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => setCategoryToDelete(category)}
                                            className="flex-1 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700 transition-colors hover:bg-rose-100"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
                        <h2 className="mb-4 text-2xl font-black text-slate-900">
                            {editingCategory ? 'Edit' : 'Create'} Category
                        </h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="mb-2 block text-sm font-semibold text-slate-700">Title *</label>
                                <input
                                    type="text"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    required
                                    className="w-full rounded-xl border border-slate-300 px-4 py-2.5 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"
                                />
                            </div>
                            <div>
                                <label className="mb-2 block text-sm font-semibold text-slate-700">Description</label>
                                <textarea
                                    value={formData.summary}
                                    onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                                    rows="3"
                                    className="w-full rounded-xl border border-slate-300 px-4 py-2.5 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"
                                />
                            </div>
                            <div>
                                <label className="mb-2 block text-sm font-semibold text-slate-700">Category Image</label>
                                <div className="space-y-3">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleFileChange}
                                        className="w-full rounded-xl border border-slate-300 px-4 py-2 file:mr-4 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-indigo-700 hover:file:bg-indigo-100 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"
                                    />
                                    {imagePreview && (
                                        <div className="relative">
                                            <img 
                                                src={imagePreview} 
                                                alt="Preview" 
                                                className="h-40 w-full rounded-xl border border-slate-200 object-cover"
                                                onError={(e) => {
                                                    e.target.src = 'https://via.placeholder.com/400x200?text=Image+Error';
                                                }}
                                            />
                                            {selectedFile && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedFile(null);
                                                        setImagePreview(editingCategory?.photo ? `${API_CONFIG.BASE_URL}${editingCategory.photo}` : '');
                                                    }}
                                                    className="absolute right-2 top-2 rounded-full bg-rose-500 p-2 text-white transition-colors hover:bg-rose-400"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </button>
                                            )}
                                        </div>
                                    )}
                                    <p className="text-xs text-gray-500">
                                        {selectedFile ? `Selected: ${selectedFile.name}` : 'Upload an image (JPG, PNG, GIF, WEBP - Max 5MB)'}
                                    </p>
                                </div>
                            </div>
                            <div>
                                <label className="mb-2 block text-sm font-semibold text-slate-700">Status</label>
                                <select
                                    value={formData.status}
                                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                    className="w-full rounded-xl border border-slate-300 px-4 py-2.5 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"
                                >
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                </select>
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button
                                    type="submit"
                                    className="flex-1 rounded-xl bg-indigo-500 px-4 py-2.5 font-semibold text-white transition-colors hover:bg-indigo-400"
                                >
                                    {editingCategory ? 'Update' : 'Create'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2.5 font-semibold text-slate-800 transition-colors hover:bg-slate-100"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <ConfirmDialog
                isOpen={Boolean(categoryToDelete)}
                title="Delete Category?"
                message="This action permanently removes this category."
                highlightText={categoryToDelete?.title || ''}
                confirmText={isDeleting ? 'Deleting...' : 'Delete Forever'}
                cancelText="Keep Category"
                isProcessing={isDeleting}
                onConfirm={handleDelete}
                onCancel={() => setCategoryToDelete(null)}
            />
        </div>
    );
};

export default CategoriesList;
