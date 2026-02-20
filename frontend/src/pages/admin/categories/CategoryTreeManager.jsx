import { logger } from '../../../utils/logger.js';

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_CONFIG } from '../../../constants';
import authService from '../../../services/authService';
import ConfirmDialog from '../../../components/common/ConfirmDialog';
import notify from '../../../utils/notify';
import {
    DndContext,
    closestCenter,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay,
} from '@dnd-kit/core';
import CategoryTreeItem from './CategoryTreeItem';

const CategoryTreeManager = () => {
    const navigate = useNavigate();
    const [categories, setCategories] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [expandedCategories, setExpandedCategories] = useState(new Set());
    const [activeId, setActiveId] = useState(null);
    const [hasChanges, setHasChanges] = useState(false);
    const [categoryToDelete, setCategoryToDelete] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [openChildDropTargetId, setOpenChildDropTargetId] = useState(null);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        })
    );

    const showToast = (message, type = 'success') => {
        if (type === 'error') {
            notify.error(message);
            return;
        }
        if (type === 'warning' || type === 'info') {
            notify.info(message);
            return;
        }
        notify.success(message);
    };

    useEffect(() => {
        loadCategories();
    }, []);

    const loadCategories = async () => {
        try {
            setIsLoading(true);

            const headers = authService.getAuthHeaders();

            const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.CATEGORIES}`, {
                headers
            });
            
            logger.info('Response status:', response.status);
            
            if (response.status === 401) {
                await authService.logout();
                window.location.href = '/login';
                return;
            }

            const data = await response.json();
            logger.info('Categories data received:', data);

            if (!response.ok) {
                throw new Error(data.message || `HTTP error! status: ${response.status}`);
            }

            const categoriesList = Array.isArray(data?.data) ? data.data : [];
            logger.info('Parsed categories list:', categoriesList.length, 'categories');
            
            const tree = buildCategoryTree(categoriesList);
            logger.info('Built tree:', tree);
            setCategories(tree);
            
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
            logger.info('Auto-expanded categories:', allParentIds.size);
            setOpenChildDropTargetId(null);
            
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
            logger.info('=== All Categories Data ===');
            flatList.forEach(cat => {
                logger.info(`"${cat.title}" - parentId: ${cat.parentId}, _id: ${cat._id}`);
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
                        const flatItem = { 
                ...item, 
                depth,
                parentId: item.parentId || parentId
            };
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

                if (typeof over.id === 'string' && over.id.startsWith('child-drop-')) {
            const targetParentId = over.id.replace('child-drop-', '');
            const activeItem = findCategoryById(categories, active.id);
            const targetParent = findCategoryById(categories, targetParentId);

            if (!activeItem || !targetParent) return;

            if (activeItem._id === targetParentId) {
                showToast('A category cannot be parent of itself', 'warning');
                return;
            }

            if (isDescendant(activeItem, targetParentId)) {
                showToast('Cannot move a category into its own descendant', 'warning');
                return;
            }

            const updatedTree = moveCategoryToParent(categories, active.id, targetParentId);
            setCategories(updatedTree);
            setExpandedCategories((prev) => {
                const next = new Set(prev);
                next.add(targetParentId);
                return next;
            });
            setOpenChildDropTargetId(null);
            setHasChanges(true);
            showToast('Category moved as child. Click "Save Changes" to apply.', 'info');
            return;
        }

        const activeItem = findCategoryById(categories, active.id);
        const overItem = findCategoryById(categories, over.id);

        if (!activeItem || !overItem) return;

                if (isDescendant(activeItem, overItem._id)) {
            showToast('Cannot move a category into its own descendant', 'warning');
            return;
        }

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

    const moveCategoryToParent = (tree, movingId, newParentId = null) => {
        let movingNode = null;

        const removeNode = (items) => {
            const result = [];
            for (const item of items) {
                if (item._id === movingId) {
                    movingNode = { ...item };
                    continue;
                }

                const nextItem = { ...item };
                if (nextItem.children && nextItem.children.length > 0) {
                    nextItem.children = removeNode(nextItem.children);
                }
                result.push(nextItem);
            }
            return result;
        };

        const treeWithoutNode = removeNode(tree);
        if (!movingNode) return tree;

        movingNode.parentId = newParentId || null;

        if (!newParentId) {
            return [...treeWithoutNode, movingNode];
        }

        const insertAsChild = (items) => {
            return items.map((item) => {
                if (item._id === newParentId) {
                    const children = Array.isArray(item.children) ? [...item.children, movingNode] : [movingNode];
                    return { ...item, children };
                }

                if (item.children && item.children.length > 0) {
                    return { ...item, children: insertAsChild(item.children) };
                }

                return item;
            });
        };

        return insertAsChild(treeWithoutNode);
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
                showToast('Category order saved successfully', 'success');
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
        const parentQuery = parentId ? `?parentId=${parentId}` : '';
        navigate(`/admin/categories/create${parentQuery}`);
    };

    const handleEditCategory = (category) => {
        navigate(`/admin/categories/${category._id}/edit`);
    };

    const handleDeleteCategory = (categoryId) => {
        const category = findCategoryById(categories, categoryId);
        setCategoryToDelete({
            id: categoryId,
            title: category?.title || 'Selected Category',
        });
    };

    const toggleChildDropTarget = (categoryId) => {
        setOpenChildDropTargetId((prev) => (prev === categoryId ? null : categoryId));
    };

    const confirmDeleteCategory = async () => {
        if (!categoryToDelete?.id) return;

        try {
            setIsDeleting(true);
            const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.CATEGORIES}/${categoryToDelete.id}`, {
                method: 'DELETE',
                headers: authService.getAuthHeaders(),
            });

            if (response.status === 401) {
                await authService.logout();
                window.location.href = '/login';
                return;
            }

            if (response.ok) {
                setCategoryToDelete(null);
                showToast('Category deleted successfully', 'success');
                loadCategories();
            } else {
                const errorData = await response.json();
                showToast(errorData.message || 'Failed to delete category', 'error');
            }
        } catch (error) {
            console.error('Error deleting category:', error);
            showToast('Failed to delete category', 'error');
        } finally {
            setIsDeleting(false);
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

    const toggleFeatured = async (categoryId, currentIsFeatured) => {
        try {
            const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.CATEGORIES}/${categoryId}`, {
                method: 'PUT',
                headers: authService.getAuthHeaders(),
                body: JSON.stringify({ isFeatured: !currentIsFeatured }),
            });

            if (response.status === 401) {
                await authService.logout();
                window.location.href = '/login';
                return;
            }

            if (response.ok) {
                showToast(
                    !currentIsFeatured ? 'Category marked as featured' : 'Category removed from featured',
                    'success'
                );
                loadCategories();
                return;
            }

            const errorData = await response.json();
            showToast(errorData.message || 'Failed to update featured flag', 'error');
        } catch (error) {
            console.error('Error toggling featured:', error);
            showToast('Failed to update featured flag', 'error');
        }
    };

    const getCategoryStats = () => {
        const flatList = flattenTree(categories);
        const maxDepth = Math.max(...flatList.map(cat => cat.depth), 0);
        const active = flatList.filter((cat) => cat.status === 'active').length;
        const featured = flatList.filter((cat) => cat.isFeatured).length;
        return {
            total: flatList.length,
            maxDepth: maxDepth,
            active,
            inactive: flatList.length - active,
            featured,
        };
    };

    const stats = getCategoryStats();

    return (
        <div className="space-y-8">
            <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 p-6 text-white shadow-lg sm:p-8">
                <div className="absolute -right-10 -top-20 h-48 w-48 rounded-full bg-indigo-400/20 blur-3xl" />
                <div className="absolute -bottom-20 -left-10 h-44 w-44 rounded-full bg-blue-300/20 blur-3xl" />
                <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-200/80">Admin Console</p>
                        <h1 className="mt-2 text-3xl font-black leading-tight sm:text-4xl">Category Studio</h1>
                        <p className="mt-2 max-w-xl text-slate-200/90">
                            Organize your full category hierarchy with drag-and-drop controls, fast nesting, and structure-safe ordering.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <button
                            onClick={() => navigate('/admin/categories')}
                            className="rounded-xl border border-white/30 bg-white/10 px-5 py-3 font-semibold backdrop-blur-sm transition-all hover:bg-white/20"
                        >
                            Table View
                        </button>
                        <button
                            onClick={loadCategories}
                            className="rounded-xl border border-white/30 bg-white/10 px-5 py-3 font-semibold backdrop-blur-sm transition-all hover:bg-white/20"
                        >
                            Refresh
                        </button>
                        <button
                            onClick={() => handleAddCategory(null)}
                            className="flex items-center gap-2 rounded-xl bg-indigo-300 px-5 py-3 font-bold text-slate-900 transition-colors hover:bg-indigo-200"
                        >
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                            </svg>
                            Add Category
                        </button>
                        {hasChanges && (
                            <button
                                onClick={handleSaveChanges}
                                className="rounded-xl bg-indigo-300 px-5 py-3 font-bold text-slate-900 transition-colors hover:bg-indigo-200"
                            >
                                Save Changes
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <p className="text-xs uppercase tracking-widest text-slate-500">Total</p>
                    <p className="mt-2 text-3xl font-black text-slate-900">{stats.total}</p>
                </div>
                <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-5 shadow-sm">
                    <p className="text-xs uppercase tracking-widest text-emerald-700">Active</p>
                    <p className="mt-2 text-3xl font-black text-emerald-800">{stats.active}</p>
                </div>
                <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-5 shadow-sm">
                    <p className="text-xs uppercase tracking-widest text-amber-700">Inactive</p>
                    <p className="mt-2 text-3xl font-black text-amber-800">{stats.inactive}</p>
                </div>
                <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-white p-5 shadow-sm">
                    <p className="text-xs uppercase tracking-widest text-blue-700">Max Depth</p>
                    <p className="mt-2 text-3xl font-black text-blue-800">{stats.maxDepth}</p>
                </div>
                <div className="rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 to-white p-5 shadow-sm">
                    <p className="text-xs uppercase tracking-widest text-violet-700">Featured</p>
                    <p className="mt-2 text-3xl font-black text-violet-800">{stats.featured}</p>
                </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            onClick={expandAll}
                            className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 transition-colors hover:bg-blue-100"
                        >
                            Expand All
                        </button>
                        <button
                            onClick={collapseAll}
                            className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100"
                        >
                            Collapse All
                        </button>
                    </div>
                    <p className="text-sm text-slate-500">
                        Drag rows to reorder. Use row + for child categories and the indigo +/- button for child drop lane.
                    </p>
                </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center gap-3">
                        <svg className="h-6 w-6 text-slate-600" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                        </svg>
                        <h2 className="text-lg font-bold text-slate-900">Category Structure</h2>
                    </div>
                </div>

                <div className="p-6">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-64">
                            <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-indigo-600"></div>
                        </div>
                    ) : categories.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="flex justify-center mb-4">
                                <svg className="h-16 w-16 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                                </svg>
                            </div>
                            <p className="mb-4 text-lg text-slate-500">No categories found yet</p>
                            <button
                                onClick={() => handleAddCategory(null)}
                                className="rounded-xl bg-indigo-500 px-6 py-3 font-semibold text-white transition-colors hover:bg-indigo-400"
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
                                        openChildDropTargetId={openChildDropTargetId}
                                        onToggleExpand={toggleExpand}
                                        onEdit={handleEditCategory}
                                        onDelete={handleDeleteCategory}
                                        onAddChild={handleAddCategory}
                                        onToggleChildDrop={toggleChildDropTarget}
                                        onToggleStatus={toggleStatus}
                                        onToggleFeatured={toggleFeatured}
                                    />
                                ))}
                            </div>
                            <DragOverlay>
                                {activeId ? (
                                    <div className="rounded-xl border-2 border-indigo-400 bg-indigo-50 p-4 shadow-lg">
                                        <span className="font-semibold text-indigo-900">
                                            {findCategoryById(categories, activeId)?.title}
                                        </span>
                                    </div>
                                ) : null}
                            </DragOverlay>
                        </DndContext>
                    )}
                </div>
            </div>

            <ConfirmDialog
                isOpen={Boolean(categoryToDelete)}
                title="Delete Category?"
                message="This action cannot be undone."
                highlightText={categoryToDelete?.title || ''}
                confirmText={isDeleting ? 'Deleting...' : 'Delete Forever'}
                cancelText="Keep Category"
                isProcessing={isDeleting}
                onConfirm={confirmDeleteCategory}
                onCancel={() => setCategoryToDelete(null)}
            />
        </div>
    );
};

export default CategoryTreeManager;

