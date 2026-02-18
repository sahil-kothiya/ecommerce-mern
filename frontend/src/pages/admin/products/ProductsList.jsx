import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { API_CONFIG } from '../../../constants';
import ConfirmDialog from '../../../components/common/ConfirmDialog';
import notify from '../../../utils/notify';

const ProductsList = () => {
    const [products, setProducts] = useState([]);
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [isFetching, setIsFetching] = useState(false);
    const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 });
    const [searchTerm, setSearchTerm] = useState('');
    const [filters, setFilters] = useState({ category: '', status: 'active' });
    const [productToDelete, setProductToDelete] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const requestCounterRef = useRef(0);

    useEffect(() => {
        loadProducts({}, { background: !isInitialLoading });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pagination.page]);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (pagination.page !== 1) {
                setPagination((prev) => ({ ...prev, page: 1 }));
                return;
            }
            loadProducts({ page: 1 }, { background: true });
        }, 350);

        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchTerm, filters.status, filters.category]);

    const loadProducts = async (overrides = {}, options = {}) => {
        const requestId = ++requestCounterRef.current;
        const isBackground = Boolean(options.background);
        try {
            if (isBackground) {
                setIsFetching(true);
            } else {
                setIsInitialLoading(true);
            }
            const page = overrides.page || pagination.page;
            const activeFilters = {
                category: overrides.category ?? filters.category,
                status: overrides.status ?? filters.status,
            };
            const params = new URLSearchParams({
                page,
                limit: pagination.limit,
                ...activeFilters,
            });

            const activeSearch = (overrides.search ?? searchTerm).trim();
            if (activeSearch) params.append('search', activeSearch);

            const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.PRODUCTS}?${params}`);
            const data = await response.json();
            if (requestId !== requestCounterRef.current) return;

            if (data.success) {
                setProducts(data.data.products);
                setPagination(prev => ({ ...prev, ...data.data.pagination }));
            }
        } catch (error) {
            if (requestId !== requestCounterRef.current) return;
            console.error('Error loading products:', error);
        } finally {
            if (requestId === requestCounterRef.current) {
                setIsInitialLoading(false);
                setIsFetching(false);
            }
        }
    };

    const handleDelete = async () => {
        if (!productToDelete?._id) return;
        try {
            setIsDeleting(true);
            const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.PRODUCTS}/${productToDelete._id}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                setProductToDelete(null);
                loadProducts({ page: pagination.page }, { background: true });
                notify.success('Product deleted successfully');
            } else {
                const errorData = await response.json().catch(() => ({}));
                notify.error(errorData, 'Failed to delete product');
            }
        } catch (error) {
            console.error('Error deleting product:', error);
            notify.error(error, 'Failed to delete product');
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Products</h1>
                    <p className="text-gray-600 mt-1">Manage your product inventory</p>
                </div>
                <Link
                    to="/admin/products/create"
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors flex items-center gap-2"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Product
                </Link>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex gap-4">
                    <div className="flex-1">
                        <input
                            type="text"
                            placeholder="Search products..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                    <select
                        value={filters.status}
                        onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="">All Status</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                        <option value="draft">Draft</option>
                    </select>
                    <button
                        type="button"
                        onClick={() => {
                            setSearchTerm('');
                            setFilters((prev) => ({ ...prev, category: '', status: 'active' }));
                            setPagination((prev) => ({ ...prev, page: 1 }));
                            loadProducts({ page: 1, search: '', status: 'active', category: '' }, { background: true });
                        }}
                        className="px-6 py-2 bg-gray-800 hover:bg-gray-900 text-white rounded-lg font-semibold transition-colors"
                    >
                        Reset
                    </button>
                </div>
                {isFetching && <p className="mt-2 text-xs font-medium text-blue-700">Searching...</p>}
            </div>

            {/* Products Table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                {isInitialLoading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="text-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                            <p className="text-gray-600">Loading products...</p>
                        </div>
                    </div>
                ) : products.length === 0 ? (
                    <div className="text-center py-12">
                        <div className="text-6xl mb-4">📦</div>
                        <h3 className="text-xl font-semibold text-gray-700 mb-2">No Products Found</h3>
                        <p className="text-gray-500 mb-6">Get started by creating your first product</p>
                        <Link
                            to="/admin/products/create"
                            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Add Product
                        </Link>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Product</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Category</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Brand</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Price</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                                        <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {products.map((product) => (
                                        <tr key={product._id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-2xl">
                                                        📦
                                                    </div>
                                                    <div>
                                                        <div className="font-medium text-gray-900">{product.title}</div>
                                                        <div className="text-sm text-gray-500">ID: {product._id.substring(0, 8)}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-900">{product.category?.title || 'N/A'}</td>
                                            <td className="px-6 py-4 text-sm text-gray-900">{product.brand?.title || 'N/A'}</td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm font-semibold text-gray-900">${product.basePrice}</div>
                                                {product.baseDiscount > 0 && (
                                                    <div className="text-xs text-green-600">-{product.baseDiscount}% off</div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                                                    product.status === 'active' ? 'bg-green-100 text-green-800' :
                                                    product.status === 'inactive' ? 'bg-red-100 text-red-800' :
                                                    'bg-gray-100 text-gray-800'
                                                }`}>
                                                    {product.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Link
                                                        to={`/admin/products/${product._id}/edit`}
                                                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                        title="Edit"
                                                    >
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                        </svg>
                                                    </Link>
                                                    <button
                                                        onClick={() => setProductToDelete(product)}
                                                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                        title="Delete"
                                                    >
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                            <div className="text-sm text-gray-700">
                                Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} products
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                                    disabled={!pagination.hasPrev}
                                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    Previous
                                </button>
                                <span className="px-4 py-2 text-sm text-gray-700">
                                    Page {pagination.page} of {pagination.pages}
                                </span>
                                <button
                                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                                    disabled={!pagination.hasNext}
                                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>

            <ConfirmDialog
                isOpen={Boolean(productToDelete)}
                title="Delete Product?"
                message="This action permanently removes this product."
                highlightText={productToDelete?.title || ''}
                confirmText={isDeleting ? 'Deleting...' : 'Delete Forever'}
                cancelText="Keep Product"
                isProcessing={isDeleting}
                onConfirm={handleDelete}
                onCancel={() => setProductToDelete(null)}
            />
        </div>
    );
};

export default ProductsList;
