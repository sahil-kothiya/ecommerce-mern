import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_CONFIG } from '../../../constants';
import authService from '../../../services/authService';
import ConfirmDialog from '../../../components/common/ConfirmDialog';
import notify from '../../../utils/notify';

const CategoriesList = () => {
    const navigate = useNavigate();
    const [categories, setCategories] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [typeFilter, setTypeFilter] = useState('all');
    const [sortField, setSortField] = useState('title');
    const [sortDirection, setSortDirection] = useState('asc');
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [categoryToDelete, setCategoryToDelete] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        loadCategories();
    }, []);

    const loadCategories = async () => {
        try {
            setIsLoading(true);
            const response = await fetch(
                `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.CATEGORIES}`,
                { headers: authService.getAuthHeaders() }
            );
            const data = await response.json();

            if (response.status === 401) {
                await authService.logout();
                window.location.href = '/login';
                return;
            }

            const list = Array.isArray(data?.data)
                ? data.data
                : Array.isArray(data?.data?.items)
                    ? data.data.items
                    : [];

            setCategories(list);
        } catch (error) {
            notify.error('Failed to load categories');
            setCategories([]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!categoryToDelete?._id) return;
        try {
            setIsDeleting(true);
            const response = await fetch(
                `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.CATEGORIES}/${categoryToDelete._id}`,
                {
                    method: 'DELETE',
                    headers: authService.getAuthHeaders(),
                }
            );

            if (response.status === 401) {
                await authService.logout();
                window.location.href = '/login';
                return;
            }

            const data = await response.json();
            if (!response.ok) {
                notify.error(data?.message || 'Failed to delete category');
                return;
            }

            notify.success('Category deleted successfully');
            setCategoryToDelete(null);
            loadCategories();
        } catch (error) {
            notify.error('Failed to delete category');
        } finally {
            setIsDeleting(false);
        }
    };

    const getImageUrl = (path) => {
        if (!path) return '';
        if (/^https?:\/\//i.test(path)) return path;
        const normalizedPath = path.startsWith('/') ? path : `/${path}`;
        return `${API_CONFIG.BASE_URL}${normalizedPath}`;
    };

    const parentTitleMap = useMemo(
        () => new Map(categories.map((cat) => [String(cat._id), cat.title])),
        [categories]
    );

    const filteredAndSortedCategories = useMemo(() => {
        const q = searchTerm.trim().toLowerCase();

        const filtered = categories.filter((category) => {
            const title = category.title || '';
            const slug = category.slug || '';
            const parentTitle = category.parentId ? parentTitleMap.get(String(category.parentId)) || '' : '';
            const isRoot = !category.parentId;

            const matchesSearch = !q
                || title.toLowerCase().includes(q)
                || slug.toLowerCase().includes(q)
                || parentTitle.toLowerCase().includes(q);

            const matchesStatus = statusFilter === 'all' || (category.status || 'inactive') === statusFilter;
            const matchesType = typeFilter === 'all'
                || (typeFilter === 'root' && isRoot)
                || (typeFilter === 'child' && !isRoot);

            return matchesSearch && matchesStatus && matchesType;
        });

        const sorted = [...filtered].sort((a, b) => {
            const aParent = a.parentId ? parentTitleMap.get(String(a.parentId)) || '' : '';
            const bParent = b.parentId ? parentTitleMap.get(String(b.parentId)) || '' : '';
            const aIsParent = a.parentId ? 0 : 1;
            const bIsParent = b.parentId ? 0 : 1;

            let aValue = '';
            let bValue = '';

            if (sortField === 'title') {
                aValue = a.title || '';
                bValue = b.title || '';
            } else if (sortField === 'slug') {
                aValue = a.slug || '';
                bValue = b.slug || '';
            } else if (sortField === 'parent') {
                aValue = aParent;
                bValue = bParent;
            } else if (sortField === 'status') {
                aValue = a.status || 'inactive';
                bValue = b.status || 'inactive';
            } else if (sortField === 'isParent') {
                aValue = aIsParent;
                bValue = bIsParent;
            } else if (sortField === 'sortOrder') {
                aValue = Number(a.sortOrder || 0);
                bValue = Number(b.sortOrder || 0);
            }

            if (typeof aValue === 'number' && typeof bValue === 'number') {
                return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
            }

            const compareResult = String(aValue).localeCompare(String(bValue));
            return sortDirection === 'asc' ? compareResult : -compareResult;
        });

        return sorted;
    }, [categories, parentTitleMap, searchTerm, statusFilter, typeFilter, sortField, sortDirection]);

    const totalItems = filteredAndSortedCategories.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const safeCurrentPage = Math.min(currentPage, totalPages);
    const pageStartIndex = (safeCurrentPage - 1) * pageSize;
    const paginatedCategories = filteredAndSortedCategories.slice(pageStartIndex, pageStartIndex + pageSize);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, statusFilter, typeFilter, pageSize]);

    useEffect(() => {
        if (currentPage > totalPages) {
            setCurrentPage(totalPages);
        }
    }, [currentPage, totalPages]);

    const stats = useMemo(() => {
        const total = categories.length;
        const active = categories.filter((item) => item.status === 'active').length;
        const inactive = total - active;
        const roots = categories.filter((item) => !item.parentId).length;
        return { total, active, inactive, roots };
    }, [categories]);

    const handleSort = (field) => {
        if (sortField === field) {
            setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
            return;
        }
        setSortField(field);
        setSortDirection('asc');
    };

    const renderSortIcon = (field) => {
        if (sortField !== field) {
            return <span className="ml-1 text-slate-300">↕</span>;
        }
        return <span className="ml-1 text-indigo-600">{sortDirection === 'asc' ? '↑' : '↓'}</span>;
    };

    if (isLoading) {
        return (
            <div className="flex h-[420px] items-center justify-center">
                <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
                    <div className="mx-auto mb-4 h-16 w-16 animate-spin rounded-full border-b-4 border-slate-700" />
                    <p className="text-lg font-semibold text-slate-800">Loading categories...</p>
                    <p className="mt-1 text-sm text-slate-500">Preparing table view</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 p-6 text-white shadow-lg sm:p-8">
                <div className="absolute -right-10 -top-20 h-48 w-48 rounded-full bg-indigo-400/20 blur-3xl" />
                <div className="absolute -bottom-20 -left-10 h-44 w-44 rounded-full bg-blue-300/20 blur-3xl" />
                <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-200/80">Admin Console</p>
                        <h1 className="mt-2 text-3xl font-black leading-tight sm:text-4xl">Category Library</h1>
                        <p className="mt-2 max-w-xl text-slate-200/90">Manage all categories in a structured table view. Use Tree View for nesting and drag-drop reordering.</p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <button
                            onClick={() => navigate('/admin/categories/tree')}
                            className="rounded-xl border border-white/30 bg-white/10 px-5 py-3 font-semibold backdrop-blur-sm transition-all hover:bg-white/20"
                        >
                            Tree View
                        </button>
                        <button
                            onClick={loadCategories}
                            className="rounded-xl border border-white/30 bg-white/10 px-5 py-3 font-semibold backdrop-blur-sm transition-all hover:bg-white/20"
                        >
                            Refresh
                        </button>
                        <button
                            onClick={() => navigate('/admin/categories/create')}
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
                    <p className="text-xs uppercase tracking-widest text-blue-700">Root Categories</p>
                    <p className="mt-2 text-3xl font-black text-blue-800">{stats.roots}</p>
                </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
                    <div className="relative lg:col-span-2">
                        <svg className="absolute left-3 top-3.5 h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(event) => setSearchTerm(event.target.value)}
                            placeholder="Search title, slug, parent category..."
                            className="w-full rounded-xl border border-slate-300 px-4 py-3 pl-10 text-slate-800 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"
                        />
                    </div>
                    <select
                        value={statusFilter}
                        onChange={(event) => setStatusFilter(event.target.value)}
                        className="rounded-xl border border-slate-300 px-4 py-3 text-slate-800 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"
                    >
                        <option value="all">All Status</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                    </select>
                    <select
                        value={typeFilter}
                        onChange={(event) => setTypeFilter(event.target.value)}
                        className="rounded-xl border border-slate-300 px-4 py-3 text-slate-800 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"
                    >
                        <option value="all">All Types</option>
                        <option value="root">Root Only</option>
                        <option value="child">Child Only</option>
                    </select>
                </div>
                <p className="mt-3 text-sm text-slate-500">
                    Showing <span className="font-semibold text-slate-800">{totalItems}</span> filtered categories
                </p>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="overflow-x-auto">
                    <table className="min-w-full border-collapse">
                        <thead>
                            <tr className="border-b border-slate-200 bg-slate-50 text-left">
                                <th className="px-4 py-3 text-sm font-bold text-slate-700">S.N.</th>
                                <th className="px-4 py-3 text-sm font-bold text-slate-700">
                                    <button type="button" onClick={() => handleSort('title')} className="inline-flex items-center">
                                        Title {renderSortIcon('title')}
                                    </button>
                                </th>
                                <th className="px-4 py-3 text-sm font-bold text-slate-700">
                                    <button type="button" onClick={() => handleSort('slug')} className="inline-flex items-center">
                                        Slug {renderSortIcon('slug')}
                                    </button>
                                </th>
                                <th className="px-4 py-3 text-sm font-bold text-slate-700">
                                    <button type="button" onClick={() => handleSort('isParent')} className="inline-flex items-center">
                                        Is Parent {renderSortIcon('isParent')}
                                    </button>
                                </th>
                                <th className="px-4 py-3 text-sm font-bold text-slate-700">
                                    <button type="button" onClick={() => handleSort('parent')} className="inline-flex items-center">
                                        Parent Category {renderSortIcon('parent')}
                                    </button>
                                </th>
                                <th className="px-4 py-3 text-sm font-bold text-slate-700">Photo</th>
                                <th className="px-4 py-3 text-sm font-bold text-slate-700">
                                    <button type="button" onClick={() => handleSort('status')} className="inline-flex items-center">
                                        Status {renderSortIcon('status')}
                                    </button>
                                </th>
                                <th className="px-4 py-3 text-sm font-bold text-slate-700">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedCategories.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-4 py-10 text-center text-slate-500">
                                        No categories found.
                                    </td>
                                </tr>
                            ) : (
                                paginatedCategories.map((category, index) => {
                                    const hasParent = Boolean(category.parentId);
                                    const parentTitle = hasParent ? parentTitleMap.get(String(category.parentId)) || '-' : '-';
                                    return (
                                        <tr key={category._id} className="border-b border-slate-100 align-middle hover:bg-slate-50/70">
                                            <td className="px-4 py-3 text-sm text-slate-700">{pageStartIndex + index + 1}</td>
                                            <td className="px-4 py-3 text-sm font-semibold text-slate-900">{category.title}</td>
                                            <td className="px-4 py-3 text-sm text-slate-600">{category.slug || '-'}</td>
                                            <td className="px-4 py-3 text-sm text-slate-700">{hasParent ? 'No' : 'Yes'}</td>
                                            <td className="px-4 py-3 text-sm text-slate-700">{parentTitle}</td>
                                            <td className="px-4 py-3">
                                                {category.photo ? (
                                                    <img
                                                        src={getImageUrl(category.photo)}
                                                        alt={category.title}
                                                        className="h-12 w-16 rounded-md border border-slate-200 object-cover"
                                                        onError={(event) => {
                                                            event.currentTarget.style.display = 'none';
                                                        }}
                                                    />
                                                ) : (
                                                    <div className="flex h-12 w-16 items-center justify-center rounded-md border border-slate-200 bg-slate-100 text-xs text-slate-500">
                                                        No Image
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${
                                                    category.status === 'active'
                                                        ? 'border-emerald-200 bg-emerald-100 text-emerald-700'
                                                        : 'border-amber-200 bg-amber-100 text-amber-700'
                                                }`}>
                                                    {category.status || 'inactive'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => navigate(`/admin/categories/${category._id}/edit`)}
                                                        className="rounded-lg bg-slate-900 p-2 text-white transition-colors hover:bg-slate-700"
                                                        title="Edit category"
                                                    >
                                                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                        </svg>
                                                    </button>
                                                    <button
                                                        onClick={() => setCategoryToDelete(category)}
                                                        className="rounded-lg bg-rose-500 p-2 text-white transition-colors hover:bg-rose-400"
                                                        title="Delete category"
                                                    >
                                                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                        <span>Show</span>
                        <select
                            value={pageSize}
                            onChange={(event) => setPageSize(Number(event.target.value))}
                            className="rounded-lg border border-slate-300 px-2 py-1 text-sm"
                        >
                            <option value={10}>10</option>
                            <option value={25}>25</option>
                            <option value={50}>50</option>
                        </select>
                        <span>entries</span>
                    </div>

                    <p className="text-sm text-slate-600">
                        Showing {totalItems === 0 ? 0 : pageStartIndex + 1} to {Math.min(pageStartIndex + pageSize, totalItems)} of {totalItems} entries
                    </p>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            disabled={safeCurrentPage <= 1}
                            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            Prev
                        </button>
                        <span className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-semibold text-slate-700">
                            {safeCurrentPage} / {totalPages}
                        </span>
                        <button
                            type="button"
                            disabled={safeCurrentPage >= totalPages}
                            onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            Next
                        </button>
                    </div>
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
                onConfirm={handleDelete}
                onCancel={() => setCategoryToDelete(null)}
            />
        </div>
    );
};

export default CategoriesList;
