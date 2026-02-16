import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_CONFIG } from '../../../constants';
import ConfirmDialog from '../../../components/common/ConfirmDialog';
import notify from '../../../utils/notify';

const BrandsList = () => {
    const navigate = useNavigate();
    const [brands, setBrands] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [brandToDelete, setBrandToDelete] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const getImageUrl = (path) => {
        if (!path) return '';
        if (/^https?:\/\//i.test(path)) return path;
        const normalizedPath = path.startsWith('/') ? path : `/${path}`;
        return `${API_CONFIG.BASE_URL}${normalizedPath}`;
    };

    useEffect(() => {
        loadBrands();
    }, []);

    const loadBrands = async () => {
        try {
            setIsLoading(true);
            const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.BRANDS}`);
            const data = await response.json();
            
            if (data.success) {
                // API returns { data: { items: [...], pagination: {...} } }
                const items = data.data?.items || (Array.isArray(data.data) ? data.data : []);
                setBrands(items);
            } else {
                setBrands([]);
            }
        } catch (error) {
            console.error('Error loading brands:', error);
            notify.error(error, 'Failed to load brands');
            setBrands([]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!brandToDelete?._id) return;
        try {
            setIsDeleting(true);
            const token = localStorage.getItem('auth_token');
            const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.BRANDS}/${brandToDelete._id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json();

            if (data.success || response.ok) {
                notify.success('Brand deleted successfully');
                setBrandToDelete(null);
                loadBrands();
            } else {
                notify.error(data, 'Failed to delete brand');
            }
        } catch (error) {
            console.error('Error deleting brand:', error);
            notify.error(error, 'Failed to delete brand');
        } finally {
            setIsDeleting(false);
        }
    };

    const filteredBrands = brands.filter(brand =>
        brand.title?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalBrands = brands.length;
    const activeBrands = brands.filter((brand) => brand.status === 'active').length;
    const inactiveBrands = totalBrands - activeBrands;
    const brandsWithLogo = brands.filter((brand) => Boolean(brand.logo)).length;

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-[420px]">
                <div className="text-center bg-white border border-slate-200 rounded-2xl p-10 shadow-sm">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-slate-700 mx-auto mb-4"></div>
                    <p className="text-lg font-semibold text-slate-800">Loading brand hub...</p>
                    <p className="text-sm text-slate-500 mt-1">Preparing your latest brand data</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Hero Header */}
            <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-900 via-slate-800 to-cyan-900 p-6 sm:p-8 text-white shadow-lg">
                <div className="absolute -top-20 -right-10 h-48 w-48 rounded-full bg-cyan-400/20 blur-3xl" />
                <div className="absolute -bottom-20 -left-10 h-44 w-44 rounded-full bg-teal-300/20 blur-3xl" />
                <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-200/80">Admin Console</p>
                        <h1 className="mt-2 text-3xl sm:text-4xl font-black leading-tight">Brand Studio</h1>
                        <p className="mt-2 text-slate-200/90 max-w-xl">
                            Curate brand identity with a clean visual dashboard for logos, status, and campaign banners.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <button
                            onClick={loadBrands}
                            className="px-5 py-3 rounded-xl border border-white/30 bg-white/10 hover:bg-white/20 transition-all font-semibold backdrop-blur-sm"
                        >
                            Refresh
                        </button>
                        <button
                            onClick={() => navigate('/admin/brands/create')}
                            className="px-5 py-3 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-900 font-bold transition-colors flex items-center gap-2"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                            </svg>
                            Add Brand
                        </button>
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <p className="text-xs uppercase tracking-widest text-slate-500">Total Brands</p>
                    <p className="mt-2 text-3xl font-black text-slate-900">{totalBrands}</p>
                </div>
                <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-5 shadow-sm">
                    <p className="text-xs uppercase tracking-widest text-emerald-700">Active</p>
                    <p className="mt-2 text-3xl font-black text-emerald-800">{activeBrands}</p>
                </div>
                <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-5 shadow-sm">
                    <p className="text-xs uppercase tracking-widest text-amber-700">Inactive</p>
                    <p className="mt-2 text-3xl font-black text-amber-800">{inactiveBrands}</p>
                </div>
                <div className="rounded-2xl border border-cyan-200 bg-gradient-to-br from-cyan-50 to-white p-5 shadow-sm">
                    <p className="text-xs uppercase tracking-widest text-cyan-700">With Logo</p>
                    <p className="mt-2 text-3xl font-black text-cyan-800">{brandsWithLogo}</p>
                </div>
            </div>

            {/* Search Section */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm">
                <div className="relative max-w-2xl">
                    <svg className="w-5 h-5 text-slate-400 absolute left-3 top-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                        type="text"
                        placeholder="Search by brand title..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full px-4 py-3 pl-10 pr-10 border border-slate-300 rounded-xl focus:ring-2 focus:ring-cyan-300 focus:border-cyan-400 text-slate-800"
                    />
                    {searchTerm && (
                        <button
                            onClick={() => setSearchTerm('')}
                            className="absolute right-3 top-3 text-slate-400 hover:text-slate-700"
                            aria-label="Clear search"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    )}
                </div>
                <p className="text-sm text-slate-500 mt-3">
                    Showing <span className="font-semibold text-slate-800">{filteredBrands.length}</span> result{filteredBrands.length !== 1 ? 's' : ''}.
                </p>
            </div>

            {/* Brands Grid */}
            {filteredBrands.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
                    <svg className="w-16 h-16 text-slate-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                    <h3 className="text-2xl font-black text-slate-900 mb-2">No brands found</h3>
                    <p className="text-slate-600 mb-5">
                        {searchTerm ? 'Try a different search term' : 'Get started by creating your first brand'}
                    </p>
                    {!searchTerm && (
                        <button
                            onClick={() => navigate('/admin/brands/create')}
                            className="px-6 py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-900 rounded-xl font-bold transition-colors"
                        >
                            Add Brand
                        </button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filteredBrands.map((brand) => (
                        <div
                            key={brand._id}
                            className="group bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                        >
                            {/* Logo */}
                            <div className="relative bg-gradient-to-br from-slate-100 via-slate-50 to-cyan-100 h-48 flex items-center justify-center">
                                <span className={`absolute top-3 right-3 px-3 py-1 text-[11px] font-semibold rounded-full ${
                                    brand.status === 'active'
                                        ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                                        : 'bg-amber-100 text-amber-700 border border-amber-200'
                                }`}>
                                    {brand.status || 'inactive'}
                                </span>
                                {brand.logo ? (
                                    <img
                                        src={getImageUrl(brand.logo)}
                                        alt={brand.title}
                                        className="max-h-full max-w-full object-contain p-5 transition-transform duration-300 group-hover:scale-105"
                                    />
                                ) : (
                                    <div className="text-slate-500 text-center p-4">
                                        <div className="h-16 w-16 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-center mx-auto mb-2">
                                            <span className="text-xl font-black text-slate-700">
                                                {(brand.title || '?').slice(0, 2).toUpperCase()}
                                            </span>
                                        </div>
                                        <p className="text-sm font-medium">No logo uploaded</p>
                                    </div>
                                )}
                            </div>

                            {/* Content */}
                            <div className="p-6">
                                <div className="flex items-start justify-between gap-3 mb-3">
                                    <h3 className="text-xl font-black text-slate-900 leading-tight">{brand.title}</h3>
                                </div>

                                {brand.description && (
                                    <p className="text-slate-600 text-sm mb-4 line-clamp-2 min-h-[40px]">
                                        {brand.description}
                                    </p>
                                )}

                                {/* Banners count */}
                                <div className="mb-5 flex items-center gap-2">
                                    <span className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 border border-slate-200">
                                        {(brand.banners && brand.banners.length) || 0} banner{(brand.banners && brand.banners.length) === 1 ? '' : 's'}
                                    </span>
                                    {brand.logo && (
                                        <span className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-cyan-50 text-cyan-700 border border-cyan-200">
                                            Logo added
                                        </span>
                                    )}
                                </div>

                                {/* Actions */}
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => navigate(`/admin/brands/${brand._id}/edit`)}
                                        className="flex-1 px-4 py-2.5 bg-slate-900 text-white rounded-xl hover:bg-slate-700 transition-colors text-sm font-semibold"
                                    >
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => setBrandToDelete(brand)}
                                        className="flex-1 px-4 py-2.5 bg-rose-50 text-rose-700 rounded-xl border border-rose-200 hover:bg-rose-100 transition-colors text-sm font-semibold"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Summary */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
                <p className="text-sm text-slate-600">
                    Showing <span className="font-semibold text-slate-900">{filteredBrands.length}</span> of{' '}
                    <span className="font-semibold text-slate-900">{brands.length}</span> brands
                </p>
            </div>

            <ConfirmDialog
                isOpen={Boolean(brandToDelete)}
                title="Delete Brand?"
                message="This action permanently removes brand info and related media links."
                highlightText={brandToDelete?.title || ''}
                confirmText={isDeleting ? 'Deleting...' : 'Delete Forever'}
                cancelText="Keep Brand"
                isProcessing={isDeleting}
                onConfirm={handleDelete}
                onCancel={() => setBrandToDelete(null)}
            />
        </div>
    );
};

export default BrandsList;
