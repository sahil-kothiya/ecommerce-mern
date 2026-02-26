import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_CONFIG } from '../../../constants';
import ConfirmDialog from '../../../components/common/ConfirmDialog';
import notify from '../../../utils/notify';

const ProductsList = () => {
    const navigate = useNavigate();
    const [products, setProducts] = useState([]);
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [isFetching, setIsFetching] = useState(false);
    const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0, hasPrev: false, hasNext: false });
    const [searchTerm, setSearchTerm] = useState('');
    const [filters, setFilters] = useState({ category: '', status: '' });
    const [productToDelete, setProductToDelete] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const requestCounterRef = useRef(0);

    useEffect(() => {
        loadProducts({}, { background: !isInitialLoading });
         
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
         
    }, [searchTerm, filters.status, filters.category]);

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

    const getPrimaryProductImage = (product) => {
        if (!product) return null;

        const directImages = Array.isArray(product.images) ? product.images : [];
        const directPrimary = directImages.find((img) => img?.isPrimary) || directImages[0];
        if (directPrimary) return directPrimary;

        const variants = Array.isArray(product.variants) ? product.variants : [];
        const activeVariants = variants.filter((variant) => !variant?.status || variant.status === 'active');
        const sourceVariants = activeVariants.length ? activeVariants : variants;

        for (const variant of sourceVariants) {
            const variantImages = Array.isArray(variant?.images) ? variant.images : [];
            const variantPrimary = variantImages.find((img) => img?.isPrimary) || variantImages[0];
            if (variantPrimary) {
                return variantPrimary;
            }
        }

        return null;
    };

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
                setProducts(Array.isArray(data.data?.products) ? data.data.products : []);
                setPagination((prev) => ({ ...prev, ...data.data.pagination }));
            } else {
                setProducts([]);
            }
        } catch (error) {
            if (requestId !== requestCounterRef.current) return;
            console.error('Error loading products:', error);
            notify.error(error, 'Failed to load products');
            setProducts([]);
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
                credentials: 'include',
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

    const activeOnPage = products.filter((product) => product.status === 'active').length;
    const inactiveOnPage = products.filter((product) => product.status === 'inactive').length;
    const draftOnPage = products.filter((product) => product.status === 'draft').length;
    const featuredOnPage = products.filter((product) => product.isFeatured).length;

    if (isInitialLoading) {
        return (
            <div className="flex h-[420px] items-center justify-center">
                <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
                    <div className="mx-auto mb-4 h-16 w-16 animate-spin rounded-full border-b-4 border-slate-700" />
                    <p className="text-lg font-semibold text-slate-800">Loading product studio...</p>
                    <p className="mt-1 text-sm text-slate-500">Preparing your product inventory</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-900 via-slate-800 to-cyan-900 p-6 text-white shadow-lg sm:p-8">
                <div className="absolute -right-10 -top-20 h-48 w-48 rounded-full bg-cyan-400/20 blur-3xl" />
                <div className="absolute -bottom-20 -left-10 h-44 w-44 rounded-full bg-sky-300/20 blur-3xl" />
                <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-200/80">Admin Console</p>
                        <h1 className="mt-2 text-3xl font-black leading-tight sm:text-4xl">Product Studio</h1>
                        <p className="mt-2 max-w-xl text-slate-200/90">
                            Manage product catalog, pricing, status, and media with the same polished workflow as the rest of admin.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <button
                            onClick={() => loadProducts({}, { background: true })}
                            className="rounded-xl border border-white/30 bg-white/10 px-5 py-3 font-semibold backdrop-blur-sm transition-all hover:bg-white/20"
                        >
                            Refresh
                        </button>
                        <button
                            onClick={() => navigate('/admin/products/create')}
                            className="flex items-center gap-2 rounded-xl bg-cyan-400 px-5 py-3 font-bold text-slate-900 transition-colors hover:bg-cyan-300"
                        >
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                            </svg>
                            Add Product
                        </button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <p className="text-xs uppercase tracking-widest text-slate-500">Total Products</p>
                    <p className="mt-2 text-3xl font-black text-slate-900">{pagination.total || 0}</p>
                </div>
                <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-5 shadow-sm">
                    <p className="text-xs uppercase tracking-widest text-emerald-700">Active (Page)</p>
                    <p className="mt-2 text-3xl font-black text-emerald-800">{activeOnPage}</p>
                </div>
                <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-5 shadow-sm">
                    <p className="text-xs uppercase tracking-widest text-amber-700">Inactive (Page)</p>
                    <p className="mt-2 text-3xl font-black text-amber-800">{inactiveOnPage}</p>
                </div>
                <div className="rounded-2xl border border-slate-300 bg-gradient-to-br from-slate-50 to-white p-5 shadow-sm">
                    <p className="text-xs uppercase tracking-widest text-slate-700">Draft (Page)</p>
                    <p className="mt-2 text-3xl font-black text-slate-800">{draftOnPage}</p>
                </div>
                <div className="rounded-2xl border border-cyan-200 bg-gradient-to-br from-cyan-50 to-white p-5 shadow-sm">
                    <p className="text-xs uppercase tracking-widest text-cyan-700">Featured (Page)</p>
                    <p className="mt-2 text-3xl font-black text-cyan-800">{featuredOnPage}</p>
                </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_auto_auto]">
                    <div className="relative">
                        <svg className="absolute left-3 top-3.5 h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                            type="text"
                            placeholder="Search by product title..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full rounded-xl border border-slate-300 px-4 py-3 pl-10 pr-10 text-slate-800 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-200"
                        />
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm('')}
                                className="absolute right-3 top-3 text-slate-400 hover:text-slate-700"
                                aria-label="Clear search"
                            >
                                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        )}
                    </div>

                    <select
                        value={filters.status}
                        onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
                        className="rounded-xl border border-slate-300 px-4 py-3 text-slate-800 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-200"
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
                            setFilters({ category: '', status: '' });
                            setPagination((prev) => ({ ...prev, page: 1 }));
                            loadProducts({ page: 1, search: '', status: '', category: '' }, { background: true });
                        }}
                        className="rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white transition-colors hover:bg-slate-700"
                    >
                        Reset
                    </button>
                </div>

                <p className="mt-3 text-sm text-slate-500">
                    Showing <span className="font-semibold text-slate-800">{products.length}</span> result{products.length !== 1 ? 's' : ''} on this page.
                    {isFetching ? <span className="ml-2 font-semibold text-cyan-700">Updating...</span> : null}
                </p>
            </div>

            {products.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
                    <svg className="mx-auto mb-4 h-16 w-16 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V7a2 2 0 00-2-2h-3V4a2 2 0 00-2-2h-2a2 2 0 00-2 2v1H6a2 2 0 00-2 2v6m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0H4" />
                    </svg>
                    <h3 className="mb-2 text-2xl font-black text-slate-900">No products found</h3>
                    <p className="mb-5 text-slate-600">{searchTerm ? 'Try a different search term or filter' : 'Get started by creating your first product'}</p>
                    {!searchTerm && (
                        <button
                            onClick={() => navigate('/admin/products/create')}
                            className="rounded-xl bg-cyan-500 px-6 py-3 font-bold text-slate-900 transition-colors hover:bg-cyan-400"
                        >
                            Add Product
                        </button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                    {products.map((product) => {
                        const primaryImage = getPrimaryProductImage(product);
                        const isVariant = product.hasVariants;
                        const finalPrice = isVariant
                            ? null
                            : Number(product.basePrice || 0) - (Number(product.basePrice || 0) * Number(product.baseDiscount || 0) / 100);

                        const variantPrices = (Array.isArray(product.variants) ? product.variants : [])
                            .filter((variant) => !variant?.status || variant.status === 'active')
                            .map((variant) => {
                                const price = Number(variant?.price || 0);
                                const discount = Number(variant?.discount || 0);
                                if (price <= 0) return null;
                                return price - (price * discount / 100);
                            })
                            .filter((price) => Number.isFinite(price) && price > 0);

                        const minVariantPrice = variantPrices.length ? Math.min(...variantPrices) : null;
                        const maxVariantPrice = variantPrices.length ? Math.max(...variantPrices) : null;

                        const variantPriceLabel = minVariantPrice === null
                            ? 'Varies'
                            : minVariantPrice === maxVariantPrice
                              ? `$${minVariantPrice.toFixed(2)}`
                              : `$${minVariantPrice.toFixed(2)} - $${maxVariantPrice.toFixed(2)}`;

                        return (
                            <div
                                key={product._id}
                                className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
                            >
                                <div className="relative h-48 overflow-hidden bg-gradient-to-br from-slate-100 via-slate-50 to-cyan-100">
                                    {primaryImage ? (
                                        <img
                                            src={getImageUrl(primaryImage)}
                                            alt={product.title}
                                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                        />
                                    ) : (
                                        <div className="flex h-full items-center justify-center text-slate-500">No image</div>
                                    )}
                                    <div className="absolute right-3 top-3 flex gap-2">
                                        <span
                                            className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${
                                                product.status === 'active'
                                                    ? 'border-emerald-200 bg-emerald-100 text-emerald-700'
                                                    : product.status === 'inactive'
                                                      ? 'border-amber-200 bg-amber-100 text-amber-700'
                                                      : 'border-slate-300 bg-slate-100 text-slate-700'
                                            }`}
                                        >
                                            {product.status || 'draft'}
                                        </span>
                                    </div>
                                </div>

                                <div className="space-y-4 p-6">
                                    <h3 className="line-clamp-2 text-xl font-black leading-tight text-slate-900">{product.title}</h3>

                                    <div className="flex flex-wrap gap-2">
                                        <span className="rounded-lg border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                                            {product.category?.title || 'No Category'}
                                        </span>
                                        <span className="rounded-lg border border-cyan-200 bg-cyan-50 px-2.5 py-1 text-xs font-semibold text-cyan-700">
                                            {product.brand?.title || 'No Brand'}
                                        </span>
                                        {product.isFeatured ? (
                                            <span className="rounded-lg border border-violet-200 bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700">Featured</span>
                                        ) : null}
                                    </div>

                                    <div className="flex items-end justify-between">
                                        <div>
                                            <p className="text-xs uppercase tracking-wider text-slate-500">Price</p>
                                            {isVariant ? (
                                                <p className="text-lg font-black text-indigo-600">{variantPriceLabel}</p>
                                            ) : (
                                                <p className="text-lg font-black text-slate-900">${Number(finalPrice || 0).toFixed(2)}</p>
                                            )}
                                        </div>
                                        {Number(product.baseDiscount) > 0 ? (
                                            <span className="rounded-full border border-emerald-200 bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                                                -{product.baseDiscount}%
                                            </span>
                                        ) : null}
                                    </div>

                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => navigate(`/admin/products/${product._id}/edit`)}
                                            className="flex-1 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-700"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => setProductToDelete(product)}
                                            className="flex-1 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700 transition-colors hover:bg-rose-100"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
                <p className="text-sm text-slate-600">
                    Showing{' '}
                    <span className="font-semibold text-slate-900">
                        {products.length ? (pagination.page - 1) * pagination.limit + 1 : 0}
                    </span>{' '}
                    to <span className="font-semibold text-slate-900">{Math.min(pagination.page * pagination.limit, pagination.total || 0)}</span> of{' '}
                    <span className="font-semibold text-slate-900">{pagination.total || 0}</span> products
                </p>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
                        disabled={!pagination.hasPrev}
                        className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        Previous
                    </button>
                    <span className="px-2 text-sm font-semibold text-slate-700">
                        Page {pagination.page || 1} of {pagination.pages || 1}
                    </span>
                    <button
                        onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
                        disabled={!pagination.hasNext}
                        className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        Next
                    </button>
                </div>
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
