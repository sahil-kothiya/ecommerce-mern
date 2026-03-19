import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { API_CONFIG } from "@/constants";
import { useAdminProducts, useDeleteProduct, PRODUCT_KEYS } from "@/hooks/queries/useProducts";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import notify from "@/utils/notify";
import { formatPrice, getProductDisplayPricing } from "@/utils/productUtils";

const FILTER_COUNTS_DEFAULT = Object.freeze({ all: 0, active: 0, inactive: 0, withVariants: 0, withoutVariants: 0 });

const getImageUrl = (img) => {
    if (!img) return "";
    const path = typeof img === "string" ? img : img.path;
    if (!path) return "";
    if (/^https?:\/\//i.test(path)) return path;
    if (path.startsWith("/")) return `${API_CONFIG.BASE_URL}${path}`;
    return `${API_CONFIG.BASE_URL}/uploads/${path.replace(/^uploads\//, '')}`;
};

const getPrimaryProductImage = (product) => {
    if (!product) return null;
    const images = Array.isArray(product.images) ? product.images : [];
    const primary = images.find((img) => img?.isPrimary) || images[0];
    if (primary) return primary;
    const variants = Array.isArray(product.variants) ? product.variants : [];
    for (const v of (variants.filter(v => !v?.status || v.status === "active").length ? variants.filter(v => !v?.status || v.status === "active") : variants)) {
        const vi = Array.isArray(v?.images) ? v.images : [];
        const vp = vi.find(i => i?.isPrimary) || vi[0];
        if (vp) return vp;
    }
    return null;
};

const ProductsList = () => {
    const navigate = useNavigate();
    const qc = useQueryClient();
    const [searchParams, setSearchParams] = useSearchParams();

    const page = Math.max(1, Number(searchParams.get("page") || "1"));
    const status = searchParams.get("status") || "";
    const hasVariants = searchParams.get("hasVariants") || "";
    const searchFromUrl = searchParams.get("search") || "";

    const [searchInput, setSearchInput] = useState(searchFromUrl);
    const [productToDelete, setProductToDelete] = useState(null);

    const queryParams = { page, limit: 20, ...(searchFromUrl && { search: searchFromUrl }), ...(status && { status }), ...(hasVariants && { hasVariants }) };

    const { data, isLoading, isFetching } = useAdminProducts(queryParams);
    const { mutate: deleteProduct, isPending: isDeleting } = useDeleteProduct();

    const products = Array.isArray(data?.products) ? data.products : [];
    const pagination = data?.pagination || { page, limit: 20, total: 0, pages: 0, hasPrev: false, hasNext: false };
    const filterCounts = { ...FILTER_COUNTS_DEFAULT, ...(data?.filterCounts || {}) };

    const updateUrl = (updates) => {
        setSearchParams(prev => {
            const next = new URLSearchParams(prev);
            Object.entries(updates).forEach(([k, v]) => { v ? next.set(k, String(v)) : next.delete(k); });
            return next;
        }, { replace: true });
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            updateUrl({ search: searchInput.trim(), page: '' });
        }, 350);
        return () => clearTimeout(timer);
    }, [searchInput]);

    const handleDelete = () => {
        if (!productToDelete?._id) return;
        deleteProduct(productToDelete._id, {
            onSuccess: () => setProductToDelete(null),
            onError: (err) => notify.error(err.response?.data?.message || err.message || "Failed to delete product"),
        });
    };

    const featuredOnPage = products.filter((p) => p.isFeatured).length;
    const activeOnPage = products.filter((p) => p.status === "active").length;
    const inactiveOnPage = products.filter((p) => p.status === "inactive").length;

    if (isLoading) {
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
            <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-900 via-slate-800 to-primary-900 p-6 text-white shadow-lg sm:p-8">
                <div className="absolute -right-10 -top-20 h-48 w-48 rounded-full bg-primary-400/20 blur-3xl" />
                <div className="absolute -bottom-20 -left-10 h-44 w-44 rounded-full bg-sky-300/20 blur-3xl" />
                <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-200/80">Admin Console</p>
                        <h1 className="mt-2 text-3xl font-black leading-tight sm:text-4xl">Product Studio</h1>
                        <p className="mt-2 max-w-xl text-slate-200/90">Manage product catalog, pricing, status, variants, and media.</p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <button onClick={() => qc.invalidateQueries({ queryKey: PRODUCT_KEYS.adminList(queryParams) })} className="rounded-xl border border-white/30 bg-white/10 px-5 py-3 font-semibold backdrop-blur-sm transition-all hover:bg-white/20">
                            Refresh
                        </button>
                        <button onClick={() => navigate("/admin/products/create")} className="flex items-center gap-2 rounded-xl bg-primary-400 px-5 py-3 font-bold text-slate-900 transition-colors hover:bg-primary-300">
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                            Add Product
                        </button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs uppercase tracking-widest text-slate-500">Total Products</p><p className="mt-2 text-3xl font-black text-slate-900">{pagination.total || 0}</p></div>
                <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-5 shadow-sm"><p className="text-xs uppercase tracking-widest text-emerald-700">Active (Page)</p><p className="mt-2 text-3xl font-black text-emerald-800">{activeOnPage}</p></div>
                <div className="rounded-2xl border border-rose-200 bg-gradient-to-br from-rose-50 to-white p-5 shadow-sm"><p className="text-xs uppercase tracking-widest text-rose-700">Inactive (Page)</p><p className="mt-2 text-3xl font-black text-rose-800">{inactiveOnPage}</p></div>
                <div className="rounded-2xl border border-primary-200 bg-gradient-to-br from-primary-50 to-white p-5 shadow-sm"><p className="text-xs uppercase tracking-widest text-primary-700">Featured (Page)</p><p className="mt-2 text-3xl font-black text-primary-800">{featuredOnPage}</p></div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_auto_auto_auto]">
                    <div className="relative">
                        <svg className="absolute left-3 top-3.5 h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        <input type="text" placeholder="Search by product title..." value={searchInput} onChange={(e) => setSearchInput(e.target.value)} className="w-full rounded-xl border border-slate-300 px-4 py-3 pl-10 pr-10 text-slate-800 focus:border-primary-400 focus:ring-2 focus:ring-primary-200" />
                        {searchInput && <button onClick={() => setSearchInput("")} className="absolute right-3 top-3 text-slate-400 hover:text-slate-700" aria-label="Clear search"><svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>}
                    </div>
                    <select value={status} onChange={(e) => updateUrl({ status: e.target.value, page: '' })} className="rounded-xl border border-slate-300 px-4 py-3 text-slate-800 focus:border-primary-400 focus:ring-2 focus:ring-primary-200">
                        <option value="">{`All Status (${filterCounts.all})`}</option>
                        <option value="active">{`Active (${filterCounts.active})`}</option>
                        <option value="inactive">{`Inactive (${filterCounts.inactive})`}</option>
                    </select>
                    <select value={hasVariants} onChange={(e) => updateUrl({ hasVariants: e.target.value, page: '' })} className="rounded-xl border border-slate-300 px-4 py-3 text-slate-800 focus:border-primary-400 focus:ring-2 focus:ring-primary-200">
                        <option value="">{`All Types (${filterCounts.all})`}</option>
                        <option value="true">{`With Variants (${filterCounts.withVariants})`}</option>
                        <option value="false">{`Without Variants (${filterCounts.withoutVariants})`}</option>
                    </select>
                    <button type="button" onClick={() => { setSearchInput(""); updateUrl({ search: '', status: '', hasVariants: '', page: '' }); }} className="rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white transition-colors hover:bg-slate-700">Reset</button>
                </div>
                <p className="mt-3 text-sm text-slate-500">
                    Showing <span className="font-semibold text-slate-800">{products.length}</span> result{products.length !== 1 ? "s" : ""} on this page.
                    {isFetching && <span className="ml-2 font-semibold text-primary-700">Updating...</span>}
                </p>
            </div>

            {products.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
                    <svg className="mx-auto mb-4 h-16 w-16 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V7a2 2 0 00-2-2h-3V4a2 2 0 00-2-2h-2a2 2 0 00-2 2v1H6a2 2 0 00-2 2v6m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0H4" /></svg>
                    <h3 className="mb-2 text-2xl font-black text-slate-900">No products found</h3>
                    <p className="mb-5 text-slate-600">{searchFromUrl ? "Try a different search term or filter" : "Get started by creating your first product"}</p>
                    {!searchFromUrl && <button onClick={() => navigate("/admin/products/create")} className="rounded-xl bg-primary-500 px-6 py-3 font-bold text-slate-900 transition-colors hover:bg-primary-400">Add Product</button>}
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                    {products.map((product) => {
                        const primaryImage = getPrimaryProductImage(product);
                        const isVariant = Boolean(product.hasVariants);
                        const pricing = getProductDisplayPricing(product);
                        const variants = Array.isArray(product.variants) ? product.variants : [];
                        const displaySku = isVariant ? (variants[0]?.sku || '') : (product.baseSku || '');
                        const variantSkuCount = isVariant ? variants.length : 0;
                        const variantPriceLabel = pricing.isRange ? `${formatPrice(pricing.minPrice, "USD")} - ${formatPrice(pricing.maxPrice, "USD")}` : formatPrice(pricing.finalPrice, "USD");

                        return (
                            <div key={product._id} className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                                <div className="relative h-48 overflow-hidden bg-gradient-to-br from-slate-100 via-slate-50 to-primary-100">
                                    {primaryImage ? <img src={getImageUrl(primaryImage)} alt={product.title} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" /> : <div className="flex h-full items-center justify-center text-slate-500">No image</div>}
                                    <div className="absolute right-3 top-3 flex gap-2">
                                        <span className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${product.status === "active" ? "border-emerald-200 bg-emerald-100 text-emerald-700" : "border-rose-200 bg-rose-100 text-rose-700"}`}>{product.status === "active" ? "Active" : "Inactive"}</span>
                                        <span className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${isVariant ? "border-primary-200 bg-primary-100 text-primary-700" : "border-slate-300 bg-slate-200 text-slate-700"}`}>{isVariant ? "With Variants" : "No Variants"}</span>
                                    </div>
                                </div>
                                <div className="space-y-4 p-6">
                                    <h3 className="line-clamp-2 text-xl font-black leading-tight text-slate-900">{product.title}</h3>
                                    {displaySku && (
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono text-xs text-slate-500">SKU:</span>
                                            <span className="flex-1 truncate font-mono text-xs font-semibold text-slate-700">{displaySku}</span>
                                            {isVariant && variantSkuCount > 1 && <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">+{variantSkuCount - 1} more</span>}
                                            <button type="button" title="Copy SKU" onClick={() => { navigator.clipboard.writeText(displaySku); notify.success(`SKU copied: ${displaySku}`); }} className="shrink-0 rounded-lg border border-slate-200 bg-slate-50 p-1 text-slate-400 transition-colors hover:bg-primary-50 hover:text-primary-700">
                                                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                                            </button>
                                        </div>
                                    )}
                                    <div className="flex flex-wrap gap-2">
                                        <span className="rounded-lg border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{product.category?.title || "No Category"}</span>
                                        <span className="rounded-lg border border-primary-200 bg-primary-50 px-2.5 py-1 text-xs font-semibold text-primary-700">{product.brand?.title || "No Brand"}</span>
                                        {product.isFeatured && <span className="rounded-lg border border-violet-200 bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700">Featured</span>}
                                    </div>
                                    <div className="flex items-end justify-between">
                                        <div>
                                            <p className="text-xs uppercase tracking-wider text-slate-500">Price</p>
                                            <p className={`text-lg font-black ${isVariant ? "text-primary-600" : "text-slate-900"}`}>{variantPriceLabel}</p>
                                        </div>
                                        {pricing.discount > 0 && <span className="rounded-full border border-emerald-200 bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">-{Math.round(pricing.discount)}%</span>}
                                    </div>
                                    <div className="flex gap-3">
                                        <button onClick={() => navigate(`/admin/products/${product._id}/edit`)} className="flex-1 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-700">Edit</button>
                                        <button onClick={() => setProductToDelete(product)} className="flex-1 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700 transition-colors hover:bg-rose-100">Delete</button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
                <p className="text-sm text-slate-600">
                    Showing <span className="font-semibold text-slate-900">{products.length ? (pagination.page - 1) * pagination.limit + 1 : 0}</span> to{" "}
                    <span className="font-semibold text-slate-900">{Math.min(pagination.page * pagination.limit, pagination.total || 0)}</span> of{" "}
                    <span className="font-semibold text-slate-900">{pagination.total || 0}</span> products
                </p>
                <div className="flex items-center gap-2">
                    <button onClick={() => updateUrl({ page: String(page - 1) })} disabled={!pagination.hasPrev} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50">Previous</button>
                    <span className="px-2 text-sm font-semibold text-slate-700">Page {pagination.page || 1} of {pagination.pages || 1}</span>
                    <button onClick={() => updateUrl({ page: String(page + 1) })} disabled={!pagination.hasNext} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50">Next</button>
                </div>
            </div>

            <ConfirmDialog
                isOpen={Boolean(productToDelete)}
                title="Delete Product?"
                message="This action permanently removes this product."
                highlightText={productToDelete?.title || ""}
                confirmText={isDeleting ? "Deleting..." : "Delete Forever"}
                cancelText="Keep Product"
                isProcessing={isDeleting}
                onConfirm={handleDelete}
                onCancel={() => setProductToDelete(null)}
            />
        </div>
    );
};

export default ProductsList;
