import React, { useState, useEffect } from 'react';
import { API_CONFIG } from '../../../constants';
import authService from '../../../services/authService';
import Toast from '../../../components/common/Toast';
import {
    DndContext,
    closestCenter,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import CategoryTreeItem from './CategoryTreeItem';

const CategoryTreeManager = () => {
    const [categories, setCategories] = useState([]);
    const [flatCategories, setFlatCategories] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [toast, setToast] = useState(null);
    const [expandedCategories, setExpandedCategories] = useState(new Set());
    const [editingCategory, setEditingCategory] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        summary: '',
        parentId: '',
        status: 'active',
        isFeatured: false,
    });
    const [selectedFile, setSelectedFile] = useState(null);
    const [imagePreview, setImagePreview] = useState('');
    const [activeId, setActiveId] = useState(null);
    const [hasChanges, setHasChanges] = useState(false);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        })
    );

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
    };

    useEffect(() => {
        loadCategories();
    }, []);

    const loadCategories = async () => {
        try {
            setIsLoading(true);
            
            const headers = {
                'Content-Type': 'application/json'
            };
            
            // Add auth token if available
            const token = localStorage.getItem('token');
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
            
            const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.CATEGORIES}`, {
                headers
            });
            
            console.log('Response status:', response.status);
            
            if (response.status === 401) {
                await authService.logout();
                window.location.href = '/login';
                return;
            }

            const data = await response.json();
            console.log('Categories data received:', data);

            if (!response.ok) {
                throw new Error(data.message || `HTTP error! status: ${response.status}`);
            }

            const categoriesList = Array.isArray(data?.data) ? data.data : [];
            console.log('Parsed categories list:', categoriesList.length, 'categories');
            
            setFlatCategories(categoriesList);
            const tree = buildCategoryTree(categoriesList);
            console.log('Built tree:', tree);
            setCategories(tree);
            
            // Auto-expand all categories that have children
            const allParentIds = new Set();
            const collectParentIds = (items) => {
                items.forEach(item => {
                    if (item.children && item.children.length > 0) {
                        allParentIds.add(item._id);
                        collectParentIds(item.children);
                    }
                });
            };
            collectParentIds(tree);
            setExpandedCategories(allParentIds);
            console.log('Auto-expanded categories:', allParentIds.size);
            
            setHasChanges(false);
        } catch (error) {
            console.error('Error loading categories:', error);
            showToast(`Failed to load categories: ${error.message}`, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const buildCategoryTree = (flatList, parentId = null) => {
        if (parentId === null) {
            console.log('=== All Categories Data ===');
            flatList.forEach(cat => {
                console.log(`"${cat.title}" - parentId: ${cat.parentId}, _id: ${cat._id}`);
            });
        }
        
        const filtered = flatList.filter(cat => {
            const catParentId = cat.parentId || null;
            return catParentId === parentId;
        });
        
        return filtered
            .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
            .map(cat => ({
                ...cat,
                children: buildCategoryTree(flatList, cat._id),
            }));
    };

    const flattenTree = (tree, depth = 0, parentId = null) => {
        return tree.reduce((acc, item) => {
            // Preserve the original parentId from the item
            const flatItem = { 
                ...item, 
                depth,
                parentId: item.parentId || parentId
            };
            // Remove children from flat representation to avoid circular refs
            delete flatItem.children;
            acc.push(flatItem);
            
            if (item.children && item.children.length > 0) {
                acc.push(...flattenTree(item.children, depth + 1, item._id));
            }
            return acc;
        }, []);
    };

    const findCategoryById = (tree, id) => {
        for (const item of tree) {
            if (item._id === id) return item;
            if (item.children) {
                const found = findCategoryById(item.children, id);
                if (found) return found;
            }
        }
        return null;
    };

    const toggleExpand = (categoryId) => {
        const newExpanded = new Set(expandedCategories);
        if (newExpanded.has(categoryId)) {
            newExpanded.delete(categoryId);
        } else {
            newExpanded.add(categoryId);
        }
        setExpandedCategories(newExpanded);
    };

    const expandAll = () => {
        const allIds = new Set();
        const collectIds = (items) => {
            items.forEach(item => {
                if (item.children && item.children.length > 0) {
                    allIds.add(item._id);
                    collectIds(item.children);
                }
            });
        };
        collectIds(categories);
        setExpandedCategories(allIds);
    };

    const collapseAll = () => {
        setExpandedCategories(new Set());
    };

    const handleDragStart = (event) => {
        setActiveId(event.active.id);
    };

    const handleDragEnd = (event) => {
        const { active, over } = event;
        setActiveId(null);

        if (!over || active.id === over.id) return;

        const activeItem = findCategoryById(categories, active.id);
        const overItem = findCategoryById(categories, over.id);

        if (!activeItem || !overItem) return;

        // Prevent moving a parent into its own child
        if (isDescendant(activeItem, overItem._id)) {
            showToast('Cannot move a category into its own descendant', 'warning');
            return;
        }

        // Update the tree structure
        const updatedTree = moveCategory(categories, active.id, over.id);
        setCategories(updatedTree);
        setHasChanges(true);
        showToast('Category moved. Click "Save Changes" to apply.', 'info');
    };

    const isDescendant = (parent, childId) => {
        if (parent._id === childId) return true;
        if (parent.children) {
            return parent.children.some(child => isDescendant(child, childId));
        }
        return false;
    };

    const moveCategory = (tree, activeId, overId) => {
        // Find the active category and remove it from its current position
        let activeCategory = null;
        const removeFromTree = (items) => {
            return items.filter(item => {
                if (item._id === activeId) {
                    activeCategory = { ...item };
                    return false;
                }
                if (item.children) {
                    item.children = removeFromTree(item.children);
                }
                return true;
            });
        };

        const newTree = removeFromTree([...tree]);

        // Add to new position as sibling of over
        const addToTree = (items) => {
            return items.map(item => {
                if (item._id === overId) {
                    // Add as sibling after the over item
                    return item;
                }
                if (item.children) {
                    item.children = addToTree(item.children);
                }
                return item;
            });
        };

        const insertSibling = (items, targetId, newItem) => {
            const result = [];
            for (let i = 0; i < items.length; i++) {
                result.push(items[i]);
                if (items[i]._id === targetId) {
                    result.push(newItem);
                }
                if (items[i].children) {
                    items[i].children = insertSibling(items[i].children, targetId, newItem);
                }
            }
            return result;
        };

        return insertSibling(newTree, overId, activeCategory);
    };

    const handleSaveChanges = async () => {
        try {
            const flatList = flattenTree(categories);
            const updates = flatList.map((cat, index) => ({
                id: cat._id,
                sortOrder: index,
                parentId: cat.parentId || null,
                level: cat.depth,
            }));

            const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.CATEGORIES}/reorder`, {
                method: 'POST',
                headers: authService.getAuthHeaders(),
                body: JSON.stringify({ updates }),
            });

            if (response.ok) {
                showToast('Category order saved successfully! 🎉', 'success');
                setHasChanges(false);
                loadCategories();
            } else {
                showToast('Failed to save category order', 'error');
            }
        } catch (error) {
            console.error('Error saving order:', error);
            showToast('Failed to save changes', 'error');
        }
    };

    const handleAddCategory = (parentId = null) => {
        setEditingCategory(null);
        setFormData({
            title: '',
            summary: '',
            parentId: parentId || '',
            status: 'active',
            isFeatured: false,
        });
        setImagePreview('');
        setSelectedFile(null);
        setShowModal(true);
    };

    const handleEditCategory = (category) => {
        setEditingCategory(category);
        setFormData({
            title: category.title || '',
            summary: category.summary || '',
            parentId: category.parentId || '',
            status: category.status || 'active',
            isFeatured: category.isFeatured || false,
        });
        setImagePreview(category.photo ? `${API_CONFIG.BASE_URL}${category.photo}` : '');
        setSelectedFile(null);
        setShowModal(true);
    };

    const handleDeleteCategory = async (categoryId) => {
        if (!window.confirm('Are you sure you want to delete this category? This action cannot be undone.')) {
            return;
        }

        try {
            const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.CATEGORIES}/${categoryId}`, {
                method: 'DELETE',
                headers: authService.getAuthHeaders(),
            });

            if (response.status === 401) {
                await authService.logout();
                window.location.href = '/login';
                return;
            }

            if (response.ok) {
                showToast('Category deleted successfully! 🗑️', 'success');
                loadCategories();
            } else {
                const errorData = await response.json();
                showToast(errorData.message || 'Failed to delete category', 'error');
            }
        } catch (error) {
            console.error('Error deleting category:', error);
            showToast('Failed to delete category', 'error');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const url = editingCategory
                ? `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.CATEGORIES}/${editingCategory._id}`
                : `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.CATEGORIES}`;

            const submitData = new FormData();
            submitData.append('title', formData.title);
            submitData.append('summary', formData.summary);
            submitData.append('status', formData.status);
            submitData.append('isFeatured', formData.isFeatured);
            
            if (formData.parentId) {
                submitData.append('parentId', formData.parentId);
            }

            if (selectedFile) {
                submitData.append('photo', selectedFile);
            }

            const headers = authService.getAuthHeaders();
            delete headers['Content-Type'];

            const response = await fetch(url, {
                method: editingCategory ? 'PUT' : 'POST',
                headers: headers,
                body: submitData,
            });

            const responseData = await response.json();

            if (response.ok) {
                showToast(`Category ${editingCategory ? 'updated' : 'created'} successfully! 🎉`, 'success');
                setShowModal(false);
                loadCategories();
            } else {
                if (response.status === 401) {
                    await authService.logout();
                    window.location.href = '/login';
                    return;
                }
                showToast(responseData.message || 'Failed to save category', 'error');
            }
        } catch (error) {
            console.error('Error saving category:', error);
            showToast('Failed to save category', 'error');
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
            if (!validTypes.includes(file.type)) {
                showToast('Please select a valid image file', 'warning');
                return;
            }

            if (file.size > 5 * 1024 * 1024) {
                showToast('File size must be less than 5MB', 'warning');
                return;
            }

            setSelectedFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const toggleStatus = async (categoryId, currentStatus) => {
        try {
            const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
            const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.CATEGORIES}/${categoryId}`, {
                method: 'PUT',
                headers: authService.getAuthHeaders(),
                body: JSON.stringify({ status: newStatus }),
            });

            if (response.ok) {
                showToast(`Category ${newStatus === 'active' ? 'activated' : 'deactivated'}`, 'success');
                loadCategories();
            }
        } catch (error) {
            console.error('Error toggling status:', error);
            showToast('Failed to update status', 'error');
        }
    };

    const getCategoryStats = () => {
        const flatList = flattenTree(categories);
        const maxDepth = Math.max(...flatList.map(cat => cat.depth), 0);
        return {
            total: flatList.length,
            maxDepth: maxDepth,
        };
    };

    const stats = getCategoryStats();

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Category Tree Manager - Infinite Levels</h1>
                    <p className="text-gray-600 mt-1">Drag and drop any category to any level. Create unlimited subcategory levels.</p>
                </div>
                <button
                    onClick={() => window.location.href = '/admin/categories/list'}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-semibold transition-colors"
                >
                    ← Back to List
                </button>
            </div>

            {/* Stats Card */}
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-5xl font-bold">{stats.total}</h2>
                        <p className="text-indigo-100 mt-2">Total Categories</p>
                        <p className="text-sm text-indigo-200 mt-1">Max Depth: {stats.maxDepth}</p>
                    </div>
                    <div className="text-6xl opacity-20">
                        <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                        </svg>
                    </div>
                </div>
            </div>

            {/* Actions Bar */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => handleAddCategory(null)}
                            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors flex items-center gap-2"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Add Root Category
                        </button>
                        <button
                            onClick={expandAll}
                            className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg font-semibold transition-colors"
                        >
                            Expand All
                        </button>
                        <button
                            onClick={collapseAll}
                            className="px-4 py-2 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-lg font-semibold transition-colors"
                        >
                            Collapse All
                        </button>
                    </div>
                    {hasChanges && (
                        <button
                            onClick={handleSaveChanges}
                            className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors animate-pulse"
                        >
                            💾 Save Changes
                        </button>
                    )}
                </div>
            </div>

            {/* Category Structure */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="bg-gray-50 border-b border-gray-200 p-4">
                    <div className="flex items-center gap-3">
                        <svg className="w-6 h-6 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                        </svg>
                        <h2 className="text-lg font-bold text-gray-900">Category Structure</h2>
                    </div>
                </div>

                <div className="p-6">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-64">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                        </div>
                    ) : categories.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="flex justify-center mb-4">
                                <svg className="w-16 h-16 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                                </svg>
                            </div>
                            <p className="text-gray-500 text-lg mb-4">Drop here to make root category</p>
                            <button
                                onClick={() => handleAddCategory(null)}
                                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold"
                            >
                                Create Your First Category
                            </button>
                        </div>
                    ) : (
                        <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragStart={handleDragStart}
                            onDragEnd={handleDragEnd}
                        >
                            <div className="space-y-2">
                                {categories.map((category) => (
                                    <CategoryTreeItem
                                        key={category._id}
                                        category={category}
                                        depth={0}
                                        expandedCategories={expandedCategories}
                                        onToggleExpand={toggleExpand}
                                        onEdit={handleEditCategory}
                                        onDelete={handleDeleteCategory}
                                        onAddChild={handleAddCategory}
                                        onToggleStatus={toggleStatus}
                                    />
                                ))}
                            </div>
                            <DragOverlay>
                                {activeId ? (
                                    <div className="bg-blue-100 border-2 border-blue-500 rounded-lg p-4 shadow-lg">
                                        <span className="font-semibold text-blue-900">
                                            {findCategoryById(categories, activeId)?.title}
                                        </span>
                                    </div>
                                ) : null}
                            </DragOverlay>
                        </DndContext>
                    )}
                </div>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">
                            {editingCategory ? 'Edit' : 'Create'} Category
                        </h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Title *</label>
                                <input
                                    type="text"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    required
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Parent Category</label>
                                <select
                                    value={formData.parentId}
                                    onChange={(e) => setFormData({ ...formData, parentId: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">-- Root Category --</option>
                                    {flatCategories
                                        .filter(cat => !editingCategory || cat._id !== editingCategory._id)
                                        .map(cat => (
                                            <option key={cat._id} value={cat._id}>
                                                {'─'.repeat(cat.level || 0)} {cat.title}
                                            </option>
                                        ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Summary</label>
                                <textarea
                                    value={formData.summary}
                                    onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                                    rows="3"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Category Image</label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileChange}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                />
                                {imagePreview && (
                                    <div className="mt-3">
                                        <img
                                            src={imagePreview}
                                            alt="Preview"
                                            className="w-full h-40 object-cover rounded-lg border-2 border-gray-300"
                                        />
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
                                    <select
                                        value={formData.status}
                                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="active">Active</option>
                                        <option value="inactive">Inactive</option>
                                    </select>
                                </div>
                                <div className="flex items-center">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={formData.isFeatured}
                                            onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked })}
                                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                        />
                                        <span className="text-sm font-semibold text-gray-700">Featured Category</span>
                                    </label>
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold"
                                >
                                    {editingCategory ? 'Update' : 'Create'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-semibold"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Toast Notification */}
            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(null)}
                />
            )}
        </div>
    );
};

export default CategoryTreeManager;
