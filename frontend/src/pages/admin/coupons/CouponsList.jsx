import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import notify from '../../../utils/notify';
import { ConfirmDialog } from '../../../components/common';
import couponService from '../../../services/couponService';

const isCouponExpired = (coupon) => {
    if (!coupon?.expiryDate) return false;
    const expiry = new Date(coupon.expiryDate);
    if (Number.isNaN(expiry.getTime())) return false;
    return expiry.getTime() < Date.now();
};

const CouponsList = () => {
    const navigate = useNavigate();
    const [coupons, setCoupons] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [typeFilter, setTypeFilter] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const loadCoupons = async () => {
        try {
            setIsLoading(true);
            const response = await couponService.getCoupons({ limit: 200 });
            setCoupons(response?.data?.coupons || []);
        } catch (error) {
            notify.error(error, 'Failed to load coupons');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadCoupons();
    }, []);

    const filteredCoupons = useMemo(() => (
        coupons.filter((item) => {
            const expired = isCouponExpired(item);
            const matchesSearch = (item.code || '').toLowerCase().includes(searchTerm.toLowerCase())
                || (item.description || '').toLowerCase().includes(searchTerm.toLowerCase());
            const effectiveStatus = expired ? 'expired' : item.status;
            const matchesStatus = !statusFilter || effectiveStatus === statusFilter;
            const matchesType = !typeFilter || item.type === typeFilter;
            return matchesSearch && matchesStatus && matchesType;
        })
    ), [coupons, searchTerm, statusFilter, typeFilter]);

    const activeCount = useMemo(
        () => coupons.filter((item) => item.status === 'active' && !isCouponExpired(item)).length,
        [coupons],
    );

    const confirmDelete = async () => {
        if (!deleteTarget?._id) return;
        try {
            setIsDeleting(true);
            await couponService.deleteCoupon(deleteTarget._id);
            notify.success('Coupon deleted successfully');
            setDeleteTarget(null);
            await loadCoupons();
        } catch (error) {
            notify.error(error, 'Failed to delete coupon');
        } finally {
            setIsDeleting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex h-[420px] items-center justify-center">
                <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
                    <div className="mx-auto mb-4 h-16 w-16 animate-spin rounded-full border-b-4 border-slate-700" />
                    <p className="text-lg font-semibold text-slate-800">Loading coupons...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-900 via-slate-800 to-cyan-900 p-6 text-white shadow-lg sm:p-8">
                <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-200/80">Admin Console</p>
                        <h1 className="mt-2 text-3xl font-black leading-tight sm:text-4xl">Coupon Studio</h1>
                        <p className="mt-2 max-w-xl text-slate-200/90">Create and manage coupon codes for checkout discounts.</p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <button type="button" onClick={loadCoupons} className="rounded-xl border border-white/30 bg-white/10 px-5 py-3 font-semibold backdrop-blur-sm transition-all hover:bg-white/20">
                            Refresh
                        </button>
                        <button type="button" onClick={() => navigate('/admin/coupons/create')} className="rounded-xl bg-cyan-400 px-5 py-3 font-bold text-slate-900 transition-colors hover:bg-cyan-300">
                            + Add Coupon
                        </button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <p className="text-xs uppercase tracking-widest text-slate-500">Total Coupons</p>
                    <p className="mt-2 text-3xl font-black text-slate-900">{coupons.length}</p>
                </div>
                <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-5 shadow-sm">
                    <p className="text-xs uppercase tracking-widest text-emerald-700">Active</p>
                    <p className="mt-2 text-3xl font-black text-emerald-800">{activeCount}</p>
                </div>
                <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-5 shadow-sm">
                    <p className="text-xs uppercase tracking-widest text-amber-700">Inactive</p>
                    <p className="mt-2 text-3xl font-black text-amber-800">{coupons.length - activeCount}</p>
                </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_auto_auto_auto]">
                    <input
                        type="text"
                        placeholder="Search by code or description..."
                        value={searchTerm}
                        onChange={(event) => setSearchTerm(event.target.value)}
                        className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-800 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-200"
                    />
                    <select
                        value={typeFilter}
                        onChange={(event) => setTypeFilter(event.target.value)}
                        className="rounded-xl border border-slate-300 px-4 py-3 text-slate-800 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-200"
                    >
                        <option value="">All Types</option>
                        <option value="percent">Percent</option>
                        <option value="fixed">Fixed</option>
                    </select>
                    <select
                        value={statusFilter}
                        onChange={(event) => setStatusFilter(event.target.value)}
                        className="rounded-xl border border-slate-300 px-4 py-3 text-slate-800 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-200"
                    >
                        <option value="">All Status</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                        <option value="expired">Expired</option>
                    </select>
                    <button
                        type="button"
                        onClick={() => {
                            setSearchTerm('');
                            setTypeFilter('');
                            setStatusFilter('');
                        }}
                        className="rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white transition-colors hover:bg-slate-700"
                    >
                        Reset
                    </button>
                </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <table className="w-full min-w-[980px] text-sm">
                    <thead>
                        <tr className="border-b border-slate-200 text-left text-slate-600">
                            <th className="py-2 pr-2">Sr. No</th>
                            <th className="py-2 pr-2">Code</th>
                            <th className="py-2 pr-2">Type</th>
                            <th className="py-2 pr-2">Value</th>
                            <th className="py-2 pr-2">Min Purchase</th>
                            <th className="py-2 pr-2">Usage</th>
                            <th className="py-2 pr-2">Expiry</th>
                            <th className="py-2 pr-2">Status</th>
                            <th className="py-2 pr-2">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredCoupons.map((coupon, index) => (
                            (() => {
                                const expired = isCouponExpired(coupon);
                                const statusLabel = expired ? 'expired' : coupon.status;
                                const statusTone = expired
                                    ? 'bg-rose-100 text-rose-700'
                                    : coupon.status === 'active'
                                        ? 'bg-emerald-100 text-emerald-700'
                                        : 'bg-slate-200 text-slate-700';

                                return (
                            <tr key={coupon._id} className="border-b border-slate-100">
                                <td className="py-2 pr-2 font-semibold text-slate-700">{index + 1}</td>
                                <td className="py-2 pr-2 font-semibold text-slate-900">{coupon.code}</td>
                                <td className="py-2 pr-2 capitalize">{coupon.type}</td>
                                <td className="py-2 pr-2">{coupon.type === 'percent' ? `${coupon.value}%` : `$${Number(coupon.value).toFixed(2)}`}</td>
                                <td className="py-2 pr-2">${Number(coupon.minPurchase || 0).toFixed(2)}</td>
                                <td className="py-2 pr-2">{coupon.usedCount || 0}{coupon.usageLimit ? `/${coupon.usageLimit}` : ''}</td>
                                <td className="py-2 pr-2 text-slate-600">
                                    {coupon.expiryDate
                                        ? new Date(coupon.expiryDate).toLocaleString()
                                        : '-'
                                    }
                                </td>
                                <td className="py-2 pr-2">
                                    <span className={`rounded px-2 py-1 text-xs font-semibold ${statusTone}`}>
                                        {statusLabel}
                                    </span>
                                </td>
                                <td className="py-2 pr-2">
                                    <div className="flex gap-2">
                                        <button type="button" onClick={() => navigate(`/admin/coupons/${coupon._id}/edit`)} className="rounded bg-slate-900 px-3 py-1 text-xs font-semibold text-white hover:bg-slate-700">
                                            Edit
                                        </button>
                                        <button type="button" onClick={() => setDeleteTarget(coupon)} className="rounded border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-100">
                                            Delete
                                        </button>
                                    </div>
                                </td>
                            </tr>
                                );
                            })()
                        ))}
                        {filteredCoupons.length === 0 && (
                            <tr>
                                <td colSpan="9" className="py-8 text-center text-slate-500">No coupons found.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <ConfirmDialog
                isOpen={Boolean(deleteTarget)}
                title="Delete Coupon?"
                message="This coupon will be permanently removed."
                highlightText={deleteTarget?.code || ''}
                confirmText={isDeleting ? 'Deleting...' : 'Delete'}
                cancelText="Cancel"
                isProcessing={isDeleting}
                onConfirm={confirmDelete}
                onCancel={() => setDeleteTarget(null)}
            />
        </div>
    );
};

export default CouponsList;
