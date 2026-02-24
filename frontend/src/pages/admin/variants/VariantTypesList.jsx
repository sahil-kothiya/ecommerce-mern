import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ConfirmDialog from '../../../components/common/ConfirmDialog';
import notify from '../../../utils/notify';
import { API_CONFIG } from '../../../constants';

const VariantTypesList = () => {
    const navigate = useNavigate();
    const [items, setItems] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('active');
    const [typeToDelete, setTypeToDelete] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const loadItems = async () => {
        try {
            setIsLoading(true);
            const query = new URLSearchParams({
                page: '1',
                limit: '200',
                status: statusFilter || 'all',
                search: searchTerm.trim(),
            });
            const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.VARIANT_TYPES}?${query.toString()}`, {
                credentials: 'include',
            });
            const data = await response.json();
            if (!response.ok || !data?.success) {
                notify.error(data, 'Failed to load variant types');
                setItems([]);
                return;
            }
            setItems(Array.isArray(data?.data?.items) ? data.data.items : []);
        } catch (error) {
            notify.error(error, 'Failed to load variant types');
            setItems([]);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadItems();
    }, []);

    useEffect(() => {
        const timer = setTimeout(loadItems, 250);
        return () => clearTimeout(timer);
    }, [searchTerm, statusFilter]);

    const stats = useMemo(() => {
        const total = items.length;
        const active = items.filter((item) => item.status === 'active').length;
        const inactive = items.filter((item) => item.status === 'inactive').length;
        const options = items.reduce((sum, item) => sum + Number(item.optionsCount || 0), 0);
        return { total, active, inactive, options };
    }, [items]);

    const handleDelete = async () => {
        if (!typeToDelete?._id) return;
        try {
            setIsDeleting(true);
            const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.VARIANT_TYPES}/${typeToDelete._id}`, {
                method: 'DELETE',
                credentials: 'include',
            });
            const data = await response.json();
            if (!response.ok || !data?.success) {
                notify.error(data, 'Failed to delete variant type');
                return;
            }
            notify.success('Variant type deleted successfully');
            setTypeToDelete(null);
            loadItems();
        } catch (error) {
            notify.error(error, 'Failed to delete variant type');
        } finally {
            setIsDeleting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex h-[420px] items-center justify-center">
                <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
                    <div className="mx-auto mb-4 h-16 w-16 animate-spin rounded-full border-b-4 border-slate-700" />
                    <p className="text-lg font-semibold text-slate-800">Loading variant types...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-900 via-slate-800 to-cyan-900 p-6 text-white shadow-lg sm:p-8">
                <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-200/80">Variants</p>
                        <h1 className="mt-2 text-3xl font-black sm:text-4xl">Variant Types</h1>
                        <p className="mt-2 text-slate-200/90">Manage variant groups like color, size, and material.</p>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={loadItems} className="rounded-xl border border-white/30 bg-white/10 px-5 py-3 font-semibold hover:bg-white/20">Refresh</button>
                        <button onClick={() => navigate('/admin/variant-type/create')} className="rounded-xl bg-cyan-400 px-5 py-3 font-bold text-slate-900 hover:bg-cyan-300">+ Add Type</button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs uppercase tracking-widest text-slate-500">Total</p><p className="mt-2 text-3xl font-black text-slate-900">{stats.total}</p></div>
                <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-5 shadow-sm"><p className="text-xs uppercase tracking-widest text-emerald-700">Active</p><p className="mt-2 text-3xl font-black text-emerald-800">{stats.active}</p></div>
                <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-5 shadow-sm"><p className="text-xs uppercase tracking-widest text-amber-700">Inactive</p><p className="mt-2 text-3xl font-black text-amber-800">{stats.inactive}</p></div>
                <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-white p-5 shadow-sm"><p className="text-xs uppercase tracking-widest text-blue-700">Total Options</p><p className="mt-2 text-3xl font-black text-blue-800">{stats.options}</p></div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_auto_auto]">
                    <input
                        type="text"
                        placeholder="Search type name..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-800 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-200"
                    />
                    <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-xl border border-slate-300 px-4 py-3 text-slate-800 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-200">
                        <option value="">All Status</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                    </select>
                    <button
                        type="button"
                        onClick={() => {
                            setSearchTerm('');
                            setStatusFilter('active');
                        }}
                        className="rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white hover:bg-slate-700"
                    >
                        Reset
                    </button>
                </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm overflow-x-auto">
                <table className="w-full min-w-[760px] text-sm">
                    <thead>
                        <tr className="border-b border-slate-200 text-left text-slate-600">
                            <th className="py-3 pr-3 text-xs font-semibold uppercase tracking-wide">S.N.</th>
                            <th className="py-3 pr-3 text-xs font-semibold uppercase tracking-wide">Name</th>
                            <th className="py-3 pr-3 text-xs font-semibold uppercase tracking-wide">Display Name</th>
                            <th className="py-3 pr-3 text-xs font-semibold uppercase tracking-wide">Sort Order</th>
                            <th className="py-3 pr-3 text-xs font-semibold uppercase tracking-wide">Status</th>
                            <th className="py-3 pr-3 text-right text-xs font-semibold uppercase tracking-wide">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item, index) => (
                            <tr key={item._id} className="border-b border-slate-100 hover:bg-slate-50">
                                <td className="py-3 pr-3 text-slate-500">{index + 1}</td>
                                <td className="py-3 pr-3 font-semibold text-slate-900">{item.name}</td>
                                <td className="py-3 pr-3 text-slate-700">{item.displayName}</td>
                                <td className="py-3 pr-3 text-slate-700">{item.sortOrder ?? 0}</td>
                                <td className="py-3 pr-3">
                                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${item.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                                        {item.status === 'active' ? 'Active' : 'Inactive'}
                                    </span>
                                </td>
                                <td className="py-3 pr-3">
                                    <div className="flex justify-end gap-1.5">
                                        {/* View */}
                                        <button
                                            onClick={() => navigate(`/admin/variant-type/${item._id}`)}
                                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-cyan-200 bg-cyan-50 text-cyan-600 hover:bg-cyan-100"
                                            title="View"
                                        >
                                            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                            </svg>
                                        </button>
                                        {/* Edit */}
                                        <button
                                            onClick={() => navigate(`/admin/variant-type/${item._id}/edit`)}
                                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100"
                                            title="Edit"
                                        >
                                            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                            </svg>
                                        </button>
                                        {/* Delete */}
                                        <button
                                            onClick={() => setTypeToDelete(item)}
                                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100"
                                            title="Delete"
                                        >
                                            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {items.length === 0 && (
                            <tr>
                                <td colSpan="7" className="py-8 text-center text-slate-500">No variant types found.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <ConfirmDialog
                isOpen={Boolean(typeToDelete)}
                title="Delete Variant Type?"
                message="This action permanently removes this variant type."
                highlightText={typeToDelete?.displayName || ''}
                confirmText={isDeleting ? 'Deleting...' : 'Delete Type'}
                cancelText="Keep Type"
                isProcessing={isDeleting}
                onConfirm={handleDelete}
                onCancel={() => setTypeToDelete(null)}
            />
        </div>
    );
};

export default VariantTypesList;
