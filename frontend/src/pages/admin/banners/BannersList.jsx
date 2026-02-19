import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_CONFIG } from '../../../constants';
import ConfirmDialog from '../../../components/common/ConfirmDialog';
import notify from '../../../utils/notify';

const BannersList = () => {
    const navigate = useNavigate();
    const [banners, setBanners] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('active');
    const [bannerToDelete, setBannerToDelete] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const getAuthHeader = () => {
        const token = localStorage.getItem('auth_token');
        return token ? { Authorization: `Bearer ${token}` } : {};
    };

    const getImageUrl = (path) => {
        if (!path) return '';
        if (/^https?:\/\//i.test(path)) return path;
        if (path.startsWith('/')) return `${API_CONFIG.BASE_URL}${path}`;
        return `${API_CONFIG.BASE_URL}/uploads/${path}`;
    };

    useEffect(() => {
        loadBanners();
    }, []);

    const loadBanners = async () => {
        try {
            setIsLoading(true);
            const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.BANNERS}`);
            const data = await response.json();

            if (!response.ok || !data.success) {
                notify.error(data, 'Failed to load banners');
                setBanners([]);
                return;
            }

            const items = Array.isArray(data.data?.banners)
                ? data.data.banners
                : Array.isArray(data.data)
                    ? data.data
                    : [];
            setBanners(items);
        } catch (error) {
            console.error('Error loading banners:', error);
            notify.error(error, 'Failed to load banners');
            setBanners([]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!bannerToDelete?._id) return;

        try {
            setIsDeleting(true);
            const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.BANNERS}/${bannerToDelete._id}`, {
                method: 'DELETE',
                headers: {
                    ...getAuthHeader(),
                },
            });
            const data = await response.json();

            if (!response.ok || !data.success) {
                notify.error(data, 'Failed to delete banner');
                return;
            }

            notify.success('Banner deleted successfully');
            setBannerToDelete(null);
            loadBanners();
        } catch (error) {
            console.error('Error deleting banner:', error);
            notify.error(error, 'Failed to delete banner');
        } finally {
            setIsDeleting(false);
        }
    };

    const filteredBanners = banners.filter((banner) => {
        const matchesSearch = banner.title?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = !statusFilter || banner.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const totalBanners = banners.length;
    const activeBanners = banners.filter((banner) => banner.status === 'active').length;
    const inactiveBanners = banners.filter((banner) => banner.status === 'inactive').length;
    const scheduledBanners = banners.filter((banner) => banner.status === 'scheduled').length;
    const discountLinked = banners.filter((banner) => (banner.linkType || banner.link_type) === 'discount').length;

    if (isLoading) {
        return (
            <div className="flex h-[420px] items-center justify-center">
                <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
                    <div className="mx-auto mb-4 h-16 w-16 animate-spin rounded-full border-b-4 border-slate-700" />
                    <p className="text-lg font-semibold text-slate-800">Loading banner studio...</p>
                    <p className="mt-1 text-sm text-slate-500">Preparing latest campaign visuals</p>
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
                        <h1 className="mt-2 text-3xl font-black leading-tight sm:text-4xl">Banner Studio</h1>
                        <p className="mt-2 max-w-xl text-slate-200/90">
                            Manage promotional creatives, link routing, and campaign visibility from one polished dashboard.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <button
                            onClick={loadBanners}
                            className="rounded-xl border border-white/30 bg-white/10 px-5 py-3 font-semibold backdrop-blur-sm transition-all hover:bg-white/20"
                        >
                            Refresh
                        </button>
                        <button
                            onClick={() => navigate('/admin/banners/create')}
                            className="flex items-center gap-2 rounded-xl bg-indigo-300 px-5 py-3 font-bold text-slate-900 transition-colors hover:bg-indigo-200"
                        >
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                            </svg>
                            Add Banner
                        </button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <p className="text-xs uppercase tracking-widest text-slate-500">Total</p>
                    <p className="mt-2 text-3xl font-black text-slate-900">{totalBanners}</p>
                </div>
                <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-5 shadow-sm">
                    <p className="text-xs uppercase tracking-widest text-emerald-700">Active</p>
                    <p className="mt-2 text-3xl font-black text-emerald-800">{activeBanners}</p>
                </div>
                <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-5 shadow-sm">
                    <p className="text-xs uppercase tracking-widest text-amber-700">Inactive</p>
                    <p className="mt-2 text-3xl font-black text-amber-800">{inactiveBanners}</p>
                </div>
                <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-white p-5 shadow-sm">
                    <p className="text-xs uppercase tracking-widest text-blue-700">Scheduled</p>
                    <p className="mt-2 text-3xl font-black text-blue-800">{scheduledBanners}</p>
                </div>
                <div className="rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 to-white p-5 shadow-sm">
                    <p className="text-xs uppercase tracking-widest text-violet-700">Discount Linked</p>
                    <p className="mt-2 text-3xl font-black text-violet-800">{discountLinked}</p>
                </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_auto_auto]">
                    <div className="relative">
                        <svg className="absolute left-3 top-3.5 h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                            type="text"
                            placeholder="Search by banner title..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full rounded-xl border border-slate-300 px-4 py-3 pl-10 pr-10 text-slate-800 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"
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
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="rounded-xl border border-slate-300 px-4 py-3 text-slate-800 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"
                    >
                        <option value="">All Status</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                        <option value="scheduled">Scheduled</option>
                    </select>
                    <button
                        type="button"
                        onClick={() => {
                            setSearchTerm('');
                            setStatusFilter('active');
                        }}
                        className="rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white transition-colors hover:bg-slate-700"
                    >
                        Reset
                    </button>
                </div>
                <p className="mt-3 text-sm text-slate-500">
                    Showing <span className="font-semibold text-slate-800">{filteredBanners.length}</span> result{filteredBanners.length !== 1 ? 's' : ''}.
                </p>
            </div>

            {filteredBanners.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
                    <svg className="mx-auto mb-4 h-16 w-16 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14m-6 2h3a2 2 0 002-2V10a2 2 0 00-2-2H9m-4 8h.01M5 8h.01" />
                    </svg>
                    <h3 className="mb-2 text-2xl font-black text-slate-900">No banners found</h3>
                    <p className="mb-5 text-slate-600">
                        {searchTerm ? 'Try a different search term' : 'Create your first campaign banner to get started'}
                    </p>
                    {!searchTerm && (
                        <button
                            onClick={() => navigate('/admin/banners/create')}
                            className="rounded-xl bg-indigo-500 px-6 py-3 font-bold text-white transition-colors hover:bg-indigo-400"
                        >
                            Add Banner
                        </button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                    {filteredBanners.map((banner) => (
                        <div
                            key={banner._id}
                            className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
                        >
                            <div className="relative h-48 overflow-hidden bg-gradient-to-br from-slate-100 via-slate-50 to-indigo-100">
                                {banner.image ? (
                                    <img
                                        src={getImageUrl(banner.image)}
                                        alt={banner.title}
                                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                    />
                                ) : (
                                    <div className="flex h-full items-center justify-center text-slate-500">
                                        No image
                                    </div>
                                )}
                                <div className="absolute right-3 top-3 flex gap-2">
                                    <span className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${
                                        banner.status === 'active'
                                            ? 'border-emerald-200 bg-emerald-100 text-emerald-700'
                                            : banner.status === 'scheduled'
                                                ? 'border-blue-200 bg-blue-100 text-blue-700'
                                                : 'border-amber-200 bg-amber-100 text-amber-700'
                                    }`}>
                                        {banner.status || 'inactive'}
                                    </span>
                                </div>
                            </div>

                            <div className="space-y-4 p-6">
                                <h3 className="text-xl font-black leading-tight text-slate-900">{banner.title}</h3>
                                {banner.description && (
                                    <p className="min-h-[40px] line-clamp-2 text-sm text-slate-600">{banner.description}</p>
                                )}

                                <div className="flex flex-wrap gap-2">
                                    <span className="rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">
                                        Link: {banner.linkType || banner.link_type || 'none'}
                                    </span>
                                    {banner.link ? (
                                        <span className="max-w-full truncate rounded-lg border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                                            {banner.link}
                                        </span>
                                    ) : null}
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        onClick={() => navigate(`/admin/banners/${banner._id}/edit`)}
                                        className="flex-1 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-700"
                                    >
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => setBannerToDelete(banner)}
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

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-sm text-slate-600">
                    Showing <span className="font-semibold text-slate-900">{filteredBanners.length}</span> of{' '}
                    <span className="font-semibold text-slate-900">{banners.length}</span> banners
                </p>
            </div>

            <ConfirmDialog
                isOpen={Boolean(bannerToDelete)}
                title="Delete Banner?"
                message="This action permanently removes banner content and media."
                highlightText={bannerToDelete?.title || ''}
                confirmText={isDeleting ? 'Deleting...' : 'Delete Forever'}
                cancelText="Keep Banner"
                isProcessing={isDeleting}
                onConfirm={handleDelete}
                onCancel={() => setBannerToDelete(null)}
            />
        </div>
    );
};

export default BannersList;
