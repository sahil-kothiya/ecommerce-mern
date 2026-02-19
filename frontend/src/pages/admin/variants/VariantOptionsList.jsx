import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ConfirmDialog from '../../../components/common/ConfirmDialog';
import notify from '../../../utils/notify';
import { API_CONFIG } from '../../../constants';

const VariantOptionsList = () => {
    const navigate = useNavigate();
    const [items, setItems] = useState([]);
    const [types, setTypes] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('active');
    const [typeFilter, setTypeFilter] = useState('');
    const [itemToDelete, setItemToDelete] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const getAuthHeader = () => {
        const token = localStorage.getItem('auth_token');
        return token ? { Authorization: `Bearer ${token}` } : {};
    };

    const loadTypes = async () => {
        try {
            const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.VARIANT_TYPES}/active`);
            const data = await response.json();
            if (response.ok && data?.success) {
                setTypes(Array.isArray(data.data) ? data.data : []);
            } else {
                setTypes([]);
            }
        } catch (error) {
            setTypes([]);
        }
    };

    const loadItems = async () => {
        try {
            setIsLoading(true);
            const query = new URLSearchParams({
                page: '1',
                limit: '200',
                status: statusFilter || 'all',
                search: searchTerm.trim(),
                variantTypeId: typeFilter || '',
            });
            const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.VARIANT_OPTIONS}?${query.toString()}`);
            const data = await response.json();
            if (!response.ok || !data?.success) {
                notify.error(data, 'Failed to load variant options');
                setItems([]);
                return;
            }
            setItems(Array.isArray(data?.data?.items) ? data.data.items : []);
        } catch (error) {
            notify.error(error, 'Failed to load variant options');
            setItems([]);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadTypes();
        loadItems();
    }, []);

    useEffect(() => {
        const timer = setTimeout(loadItems, 250);
        return () => clearTimeout(timer);
    }, [searchTerm, statusFilter, typeFilter]);

    const stats = useMemo(() => {
        const total = items.length;
        const active = items.filter((item) => item.status === 'active').length;
        const inactive = items.filter((item) => item.status === 'inactive').length;
        const colored = items.filter((item) => Boolean(item.hexColor)).length;
        return { total, active, inactive, colored };
    }, [items]);

    const handleDelete = async () => {
        if (!itemToDelete?._id) return;
        try {
            setIsDeleting(true);
            const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.VARIANT_OPTIONS}/${itemToDelete._id}`, {
                method: 'DELETE',
                headers: { ...getAuthHeader() },
            });
            const data = await response.json();
            if (!response.ok || !data?.success) {
                notify.error(data, 'Failed to delete variant option');
                return;
            }
            notify.success('Variant option deleted successfully');
            setItemToDelete(null);
            loadItems();
        } catch (error) {
            notify.error(error, 'Failed to delete variant option');
        } finally {
            setIsDeleting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex h-[420px] items-center justify-center">
                <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
                    <div className="mx-auto mb-4 h-16 w-16 animate-spin rounded-full border-b-4 border-slate-700" />
                    <p className="text-lg font-semibold text-slate-800">Loading variant options...</p>
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
                        <h1 className="mt-2 text-3xl font-black sm:text-4xl">Variant Options</h1>
                        <p className="mt-2 text-slate-200/90">Manage selectable options mapped to each variant type.</p>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={loadItems} className="rounded-xl border border-white/30 bg-white/10 px-5 py-3 font-semibold hover:bg-white/20">Refresh</button>
                        <button onClick={() => navigate('/admin/variant-option/create')} className="rounded-xl bg-cyan-400 px-5 py-3 font-bold text-slate-900 hover:bg-cyan-300">+ Add Option</button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs uppercase tracking-widest text-slate-500">Total</p><p className="mt-2 text-3xl font-black text-slate-900">{stats.total}</p></div>
                <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-5 shadow-sm"><p className="text-xs uppercase tracking-widest text-emerald-700">Active</p><p className="mt-2 text-3xl font-black text-emerald-800">{stats.active}</p></div>
                <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-5 shadow-sm"><p className="text-xs uppercase tracking-widest text-amber-700">Inactive</p><p className="mt-2 text-3xl font-black text-amber-800">{stats.inactive}</p></div>
                <div className="rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 to-white p-5 shadow-sm"><p className="text-xs uppercase tracking-widest text-violet-700">With Color</p><p className="mt-2 text-3xl font-black text-violet-800">{stats.colored}</p></div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_auto_auto_auto]">
                    <input type="text" placeholder="Search option value..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-800 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-200" />
                    <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="rounded-xl border border-slate-300 px-4 py-3 text-slate-800 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-200">
                        <option value="">All Types</option>
                        {types.map((type) => <option key={type._id} value={type._id}>{type.displayName}</option>)}
                    </select>
                    <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-xl border border-slate-300 px-4 py-3 text-slate-800 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-200">
                        <option value="">All Status</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                    </select>
                    <button
                        type="button"
                        onClick={() => {
                            setSearchTerm('');
                            setTypeFilter('');
                            setStatusFilter('active');
                        }}
                        className="rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white hover:bg-slate-700"
                    >
                        Reset
                    </button>
                </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm overflow-x-auto">
                <table className="w-full min-w-[860px] text-sm">
                    <thead>
                        <tr className="border-b border-slate-200 text-left text-slate-600">
                            <th className="py-3 pr-3">Type</th>
                            <th className="py-3 pr-3">Value</th>
                            <th className="py-3 pr-3">Display Value</th>
                            <th className="py-3 pr-3">Hex Color</th>
                            <th className="py-3 pr-3">Sort</th>
                            <th className="py-3 pr-3">Status</th>
                            <th className="py-3 pr-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item) => (
                            <tr key={item._id} className="border-b border-slate-100">
                                <td className="py-3 pr-3 font-semibold text-slate-900">{item.variantTypeId?.displayName || '-'}</td>
                                <td className="py-3 pr-3 text-slate-700">{item.value}</td>
                                <td className="py-3 pr-3 text-slate-700">{item.displayValue}</td>
                                <td className="py-3 pr-3">
                                    {item.hexColor ? (
                                        <div className="flex items-center gap-2">
                                            <span className="h-4 w-4 rounded-full border border-slate-300" style={{ backgroundColor: item.hexColor }} />
                                            <span className="text-slate-700">{item.hexColor}</span>
                                        </div>
                                    ) : (
                                        <span className="text-slate-400">-</span>
                                    )}
                                </td>
                                <td className="py-3 pr-3 text-slate-700">{item.sortOrder ?? 0}</td>
                                <td className="py-3 pr-3">
                                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${item.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                                        {item.status}
                                    </span>
                                </td>
                                <td className="py-3 pr-3">
                                    <div className="flex justify-end gap-2">
                                        <button onClick={() => navigate(`/admin/variant-option/${item._id}/edit`)} className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700">Edit</button>
                                        <button onClick={() => setItemToDelete(item)} className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100">Delete</button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {items.length === 0 && (
                            <tr>
                                <td colSpan="7" className="py-8 text-center text-slate-500">No variant options found.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <ConfirmDialog
                isOpen={Boolean(itemToDelete)}
                title="Delete Variant Option?"
                message="This action permanently removes this option."
                highlightText={itemToDelete?.displayValue || ''}
                confirmText={isDeleting ? 'Deleting...' : 'Delete Option'}
                cancelText="Keep Option"
                isProcessing={isDeleting}
                onConfirm={handleDelete}
                onCancel={() => setItemToDelete(null)}
            />
        </div>
    );
};

export default VariantOptionsList;
