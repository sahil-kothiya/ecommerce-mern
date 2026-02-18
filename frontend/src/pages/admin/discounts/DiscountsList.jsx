import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import notify from '../../../utils/notify';
import { ConfirmDialog } from '../../../components/common';
import discountService from '../../../services/discountService';

const DiscountsList = () => {
    const navigate = useNavigate();
    const [discounts, setDiscounts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        loadDiscounts();
    }, []);

    const loadDiscounts = async () => {
        try {
            setIsLoading(true);
            const response = await discountService.getDiscounts({ limit: 200 });
            setDiscounts(response?.data?.discounts || []);
        } catch (error) {
            notify.error(error, 'Failed to load discounts');
        } finally {
            setIsLoading(false);
        }
    };

    const activeCount = useMemo(() => discounts.filter((item) => item.isActive).length, [discounts]);

    const confirmDelete = async () => {
        if (!deleteTarget?._id) return;

        try {
            setIsDeleting(true);
            await discountService.deleteDiscount(deleteTarget._id);
            notify.success('Discount deleted successfully');
            setDeleteTarget(null);
            await loadDiscounts();
        } catch (error) {
            notify.error(error, 'Failed to delete discount');
        } finally {
            setIsDeleting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex h-[420px] items-center justify-center">
                <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
                    <div className="mx-auto mb-4 h-16 w-16 animate-spin rounded-full border-b-4 border-slate-700"></div>
                    <p className="text-lg font-semibold text-slate-800">Loading discount studio...</p>
                    <p className="mt-1 text-sm text-slate-500">Preparing your latest discount data</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-900 via-slate-800 to-cyan-900 p-6 sm:p-8 text-white shadow-lg">
                <div className="absolute -top-20 -right-10 h-48 w-48 rounded-full bg-cyan-400/20 blur-3xl"></div>
                <div className="absolute -bottom-20 -left-10 h-44 w-44 rounded-full bg-teal-300/20 blur-3xl"></div>
                <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-200/80">Admin Console</p>
                        <h1 className="mt-2 text-3xl sm:text-4xl font-black leading-tight">Discount Studio</h1>
                        <p className="mt-2 text-slate-200/90 max-w-xl">
                            Create and manage product/category discounts with one consistent admin workflow.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => navigate('/admin/discounts/create')}
                        className="px-5 py-3 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-900 font-bold transition-colors"
                    >
                        + Add Discount
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <p className="text-xs uppercase tracking-widest text-slate-500">Total Discounts</p>
                    <p className="mt-2 text-3xl font-black text-slate-900">{discounts.length}</p>
                </div>
                <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-5 shadow-sm">
                    <p className="text-xs uppercase tracking-widest text-emerald-700">Active</p>
                    <p className="mt-2 text-3xl font-black text-emerald-800">{activeCount}</p>
                </div>
                <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-5 shadow-sm">
                    <p className="text-xs uppercase tracking-widest text-amber-700">Inactive</p>
                    <p className="mt-2 text-3xl font-black text-amber-800">{discounts.length - activeCount}</p>
                </div>
                <div className="rounded-2xl border border-cyan-200 bg-gradient-to-br from-cyan-50 to-white p-5 shadow-sm">
                    <p className="text-xs uppercase tracking-widest text-cyan-700">Coverage</p>
                    <p className="mt-2 text-3xl font-black text-cyan-800">
                        {discounts.reduce((sum, item) => sum + ((item.categories || []).length + (item.products || []).length), 0)}
                    </p>
                </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm overflow-x-auto">
                <table className="w-full min-w-[1020px] text-sm">
                    <thead>
                        <tr className="border-b border-slate-200 text-left text-slate-600">
                            <th className="py-2 pr-2">Sr. No</th>
                            <th className="py-2 pr-2">Title</th>
                            <th className="py-2 pr-2">Type</th>
                            <th className="py-2 pr-2">Value</th>
                            <th className="py-2 pr-2">Categories</th>
                            <th className="py-2 pr-2">Products</th>
                            <th className="py-2 pr-2">Status</th>
                            <th className="py-2 pr-2">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {discounts.map((discount, index) => (
                            <tr key={discount._id} className="border-b border-slate-100">
                                <td className="py-2 pr-2 font-semibold text-slate-700">{index + 1}</td>
                                <td className="py-2 pr-2 font-semibold text-slate-900">{discount.title}</td>
                                <td className="py-2 pr-2 capitalize">{discount.type}</td>
                                <td className="py-2 pr-2">{discount.type === 'percentage' ? `${discount.value}%` : `$${Number(discount.value).toFixed(2)}`}</td>
                                <td className="py-2 pr-2">{(discount.categories || []).length}</td>
                                <td className="py-2 pr-2">{(discount.products || []).length}</td>
                                <td className="py-2 pr-2">
                                    <span className={`rounded px-2 py-1 text-xs font-semibold ${discount.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-700'}`}>
                                        {discount.isActive ? 'Active' : 'Inactive'}
                                    </span>
                                </td>
                                <td className="py-2 pr-2">
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() => navigate(`/admin/discounts/${discount._id}/edit`)}
                                            className="rounded bg-slate-900 px-3 py-1 text-xs font-semibold text-white hover:bg-slate-700"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setDeleteTarget(discount)}
                                            className="rounded border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-100"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {discounts.length === 0 && (
                            <tr>
                                <td colSpan="8" className="py-8 text-center text-slate-500">No discounts found. Please create one.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <ConfirmDialog
                isOpen={Boolean(deleteTarget)}
                title="Delete Discount?"
                message="This discount will be permanently removed."
                highlightText={deleteTarget?.title || ''}
                confirmText={isDeleting ? 'Deleting...' : 'Delete'}
                cancelText="Cancel"
                isProcessing={isDeleting}
                onConfirm={confirmDelete}
                onCancel={() => setDeleteTarget(null)}
            />
        </div>
    );
};

export default DiscountsList;
