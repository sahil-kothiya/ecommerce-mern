import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_CONFIG } from '@/constants';
import { useBrands, useDeleteBrand } from '@/hooks/queries';
import ConfirmDialog from '@/components/common/ConfirmDialog';

const getImageUrl = (path) => {
    if (!path) return '';
    if (/^https?:\/\//i.test(path)) return path;
    return `${API_CONFIG.BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
};

const BrandsList = () => {
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('active');
    const [brandToDelete, setBrandToDelete] = useState(null);

    const { data: rawData, isLoading } = useBrands();
    const brands = Array.isArray(rawData) ? rawData : (rawData?.items ?? []);

    const { mutate: deleteBrand, isPending: isDeleting } = useDeleteBrand();

    const handleDelete = () => {
        if (!brandToDelete?._id) return;
        deleteBrand(brandToDelete._id, { onSuccess: () => setBrandToDelete(null) });
    };

    const filteredBrands = brands.filter((brand) => {
        const matchesSearch = brand.title?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = !statusFilter || brand.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const totalBrands = brands.length;
    const activeBrands = brands.filter((b) => b.status === 'active').length;
    const brandsWithLogo = brands.filter((b) => Boolean(b.logo)).length;

    if (isLoading) {
        return (
            <div className="flex h-[420px] items-center justify-center">
                <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
                    <div className="mx-auto mb-4 h-16 w-16 animate-spin rounded-full border-b-4 border-slate-700" />
                    <p className="text-lg font-semibold text-slate-800">Loading brand hub...</p>
                    <p className="mt-1 text-sm text-slate-500">Preparing your latest brand data</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-900 via-slate-800 to-primary-900 p-6 text-white shadow-lg sm:p-8">
                <div className="absolute -right-10 -top-20 h-48 w-48 rounded-full bg-primary-400/20 blur-3xl" />
                <div className="absolute -bottom-20 -left-10 h-44 w-44 rounded-full bg-teal-300/20 blur-3xl" />
                <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-200/80">Admin Console</p>
                        <h1 className="mt-2 text-3xl font-black leading-tight sm:text-4xl">Brand Studio</h1>
                        <p className="mt-2 max-w-xl text-slate-200/90">Curate brand identity with a clean visual dashboard for logos, status, and campaign banners.</p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <button onClick={() => navigate('/admin/brands/create')} className="flex items-center gap-2 rounded-xl bg-primary-400 px-5 py-3 font-bold text-slate-900 transition-colors hover:bg-primary-300">
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                            Add Brand
                        </button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs uppercase tracking-widest text-slate-500">Total Brands</p><p className="mt-2 text-3xl font-black text-slate-900">{totalBrands}</p></div>
                <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-5 shadow-sm"><p className="text-xs uppercase tracking-widest text-emerald-700">Active</p><p className="mt-2 text-3xl font-black text-emerald-800">{activeBrands}</p></div>
                <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-5 shadow-sm"><p className="text-xs uppercase tracking-widest text-amber-700">Inactive</p><p className="mt-2 text-3xl font-black text-amber-800">{totalBrands - activeBrands}</p></div>
                <div className="rounded-2xl border border-primary-200 bg-gradient-to-br from-primary-50 to-white p-5 shadow-sm"><p className="text-xs uppercase tracking-widest text-primary-700">With Logo</p><p className="mt-2 text-3xl font-black text-primary-800">{brandsWithLogo}</p></div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_auto_auto]">
                    <div className="relative">
                        <svg className="absolute left-3 top-3.5 h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        <input type="text" placeholder="Search by brand title..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full rounded-xl border border-slate-300 px-4 py-3 pl-10 pr-10 text-slate-800 focus:border-primary-400 focus:ring-2 focus:ring-primary-200" />
                        {searchTerm && <button onClick={() => setSearchTerm('')} className="absolute right-3 top-3 text-slate-400 hover:text-slate-700" aria-label="Clear search"><svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>}
                    </div>
                    <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-xl border border-slate-300 px-4 py-3 text-slate-800 focus:border-primary-400 focus:ring-2 focus:ring-primary-200">
                        <option value="">All Status</option><option value="active">Active</option><option value="inactive">Inactive</option>
                    </select>
                    <button type="button" onClick={() => { setSearchTerm(''); setStatusFilter('active'); }} className="rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white transition-colors hover:bg-slate-700">Reset</button>
                </div>
                <p className="mt-3 text-sm text-slate-500">Showing <span className="font-semibold text-slate-800">{filteredBrands.length}</span> result{filteredBrands.length !== 1 ? 's' : ''}.</p>
            </div>

            {filteredBrands.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
                    <svg className="mx-auto mb-4 h-16 w-16 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                    <h3 className="mb-2 text-2xl font-black text-slate-900">No brands found</h3>
                    <p className="mb-5 text-slate-600">{searchTerm ? 'Try a different search term' : 'Get started by creating your first brand'}</p>
                    {!searchTerm && <button onClick={() => navigate('/admin/brands/create')} className="rounded-xl bg-primary-500 px-6 py-3 font-bold text-slate-900 transition-colors hover:bg-primary-400">Add Brand</button>}
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                    {filteredBrands.map((brand) => (
                        <div key={brand._id} className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                            <div className="relative flex h-48 items-center justify-center bg-gradient-to-br from-slate-100 via-slate-50 to-primary-100">
                                <span className={`absolute right-3 top-3 rounded-full border px-3 py-1 text-[11px] font-semibold ${brand.status === 'active' ? 'border-emerald-200 bg-emerald-100 text-emerald-700' : 'border-amber-200 bg-amber-100 text-amber-700'}`}>{brand.status || 'inactive'}</span>
                                {brand.logo ? (
                                    <img src={getImageUrl(brand.logo)} alt={brand.title} className="max-h-full max-w-full object-contain p-5 transition-transform duration-300 group-hover:scale-105" />
                                ) : (
                                    <div className="p-4 text-center text-slate-500">
                                        <div className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-xl border border-slate-200 bg-white shadow-sm">
                                            <span className="text-xl font-black text-slate-700">{(brand.title || '?').slice(0, 2).toUpperCase()}</span>
                                        </div>
                                        <p className="text-sm font-medium">No logo uploaded</p>
                                    </div>
                                )}
                            </div>
                            <div className="p-6">
                                <h3 className="mb-3 text-xl font-black leading-tight text-slate-900">{brand.title}</h3>
                                {brand.description && <p className="mb-4 line-clamp-2 min-h-[40px] text-sm text-slate-600">{brand.description}</p>}
                                <div className="mb-5 flex items-center gap-2">
                                    <span className="rounded-lg border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{brand.banners?.length || 0} banner{brand.banners?.length === 1 ? '' : 's'}</span>
                                    {brand.logo && <span className="rounded-lg border border-primary-200 bg-primary-50 px-2.5 py-1 text-xs font-semibold text-primary-700">Logo added</span>}
                                </div>
                                <div className="flex gap-3">
                                    <button onClick={() => navigate(`/admin/brands/${brand._id}/edit`)} className="flex-1 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-700">Edit</button>
                                    <button onClick={() => setBrandToDelete(brand)} className="flex-1 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700 transition-colors hover:bg-rose-100">Delete</button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-sm text-slate-600">Showing <span className="font-semibold text-slate-900">{filteredBrands.length}</span> of <span className="font-semibold text-slate-900">{brands.length}</span> brands</p>
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
