import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ConfirmDialog from '../../../components/common/ConfirmDialog';
import notify from '../../../utils/notify';
import { API_CONFIG } from '../../../constants';
import authFetch from '../../../utils/authFetch.js';

const VariantTypeView = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [item, setItem] = useState(null);
    const [options, setOptions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [optionToDelete, setOptionToDelete] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const loadItem = async () => {
        try {
            setIsLoading(true);
            const [typeRes, optRes] = await Promise.all([
                authFetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.VARIANT_TYPES}/${id}`),
                authFetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.VARIANT_OPTIONS}?variantTypeId=${id}&limit=200&status=all`),
            ]);
            const [typeData, optData] = await Promise.all([typeRes.json(), optRes.json()]);

            if (!typeRes.ok || !typeData?.success) {
                notify.error('Failed to load variant type');
                navigate('/admin/variant-type');
                return;
            }
            setItem(typeData.data);
            setOptions(Array.isArray(optData?.data?.items) ? optData.data.items : []);
        } catch (err) {
            notify.error('Failed to load variant type');
            navigate('/admin/variant-type');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadItem();
    }, [id]);

    const handleDeleteOption = async () => {
        if (!optionToDelete?._id) return;
        try {
            setIsDeleting(true);
            const res = await authFetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.VARIANT_OPTIONS}/${optionToDelete._id}`, {
                method: 'DELETE',
            });
            const data = await res.json();
            if (!res.ok || !data?.success) {
                notify.error('Failed to delete option');
                return;
            }
            notify.success('Option deleted successfully');
            setOptionToDelete(null);
            loadItem();
        } catch (err) {
            notify.error('Failed to delete option');
        } finally {
            setIsDeleting(false);
        }
    };

    const fmt = (dateStr) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' });
    };

    if (isLoading) {
        return (
            <div className="flex h-[420px] items-center justify-center">
                <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
                    <div className="mx-auto mb-4 h-16 w-16 animate-spin rounded-full border-b-4 border-slate-700" />
                    <p className="text-lg font-semibold text-slate-800">Loading variant type...</p>
                </div>
            </div>
        );
    }

    if (!item) return null;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-900 via-slate-800 to-cyan-900 p-6 text-white shadow-lg sm:p-8">
                <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-200/80">Variant Studio</p>
                        <h1 className="mt-2 text-3xl font-black sm:text-4xl">View Variant Type: {item.displayName}</h1>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={() => navigate(`/admin/variant-type/${id}/edit`)}
                            className="rounded-xl border border-white/30 bg-white/10 px-5 py-2.5 font-semibold hover:bg-white/20"
                        >
                            Edit
                        </button>
                        <button
                            onClick={() => navigate('/admin/variant-option/create')}
                            className="rounded-xl bg-cyan-400 px-5 py-2.5 font-bold text-slate-900 hover:bg-cyan-300"
                        >
                            Add Option
                        </button>
                    </div>
                </div>
            </div>

            {/* Type Details */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                        <dt className="text-xs font-semibold uppercase tracking-widest text-slate-500">Name</dt>
                        <dd className="mt-1 text-lg font-bold text-slate-900">{item.name}</dd>
                    </div>
                    <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                        <dt className="text-xs font-semibold uppercase tracking-widest text-slate-500">Display Name</dt>
                        <dd className="mt-1 text-lg font-bold text-slate-900">{item.displayName}</dd>
                    </div>
                    <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                        <dt className="text-xs font-semibold uppercase tracking-widest text-slate-500">Sort Order</dt>
                        <dd className="mt-1 text-lg font-bold text-slate-900">{item.sortOrder ?? 0}</dd>
                    </div>
                    <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                        <dt className="text-xs font-semibold uppercase tracking-widest text-slate-500">Status</dt>
                        <dd className="mt-1">
                            <span className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${item.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                                {item.status === 'active' ? 'Active' : 'Inactive'}
                            </span>
                        </dd>
                    </div>
                    <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                        <dt className="text-xs font-semibold uppercase tracking-widest text-slate-500">Created At</dt>
                        <dd className="mt-1 text-sm font-medium text-slate-700">{fmt(item.createdAt)}</dd>
                    </div>
                    <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                        <dt className="text-xs font-semibold uppercase tracking-widest text-slate-500">Updated At</dt>
                        <dd className="mt-1 text-sm font-medium text-slate-700">{fmt(item.updatedAt)}</dd>
                    </div>
                </dl>
            </div>

            {/* Associated Options Table */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-lg font-black text-slate-900">
                    Associated Options
                    <span className="ml-2 text-sm font-normal text-slate-400">({options.length})</span>
                </h2>
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[700px] text-sm">
                        <thead>
                            <tr className="border-b border-slate-200 text-left">
                                <th className="py-3 pr-4 text-xs font-semibold uppercase tracking-wide text-slate-600">Display Value</th>
                                <th className="py-3 pr-4 text-xs font-semibold uppercase tracking-wide text-slate-600">Value</th>
                                <th className="py-3 pr-4 text-xs font-semibold uppercase tracking-wide text-slate-600">Hex Color</th>
                                <th className="py-3 pr-4 text-xs font-semibold uppercase tracking-wide text-slate-600">Sort Order</th>
                                <th className="py-3 pr-4 text-xs font-semibold uppercase tracking-wide text-slate-600">Status</th>
                                <th className="py-3 pr-4 text-right text-xs font-semibold uppercase tracking-wide text-slate-600">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {options.map((opt) => (
                                <tr key={opt._id} className="border-b border-slate-100 hover:bg-slate-50">
                                    <td className="py-3 pr-4 font-semibold text-slate-900">{opt.displayValue}</td>
                                    <td className="py-3 pr-4 text-slate-600">{opt.value}</td>
                                    <td className="py-3 pr-4">
                                        {opt.hexColor ? (
                                            <div className="flex items-center gap-2">
                                                <span className="h-5 w-5 rounded-full border border-slate-300" style={{ backgroundColor: opt.hexColor }} />
                                                <span className="text-slate-600">{opt.hexColor}</span>
                                            </div>
                                        ) : (
                                            <span className="text-slate-400">N/A</span>
                                        )}
                                    </td>
                                    <td className="py-3 pr-4 text-slate-600">{opt.sortOrder ?? 0}</td>
                                    <td className="py-3 pr-4">
                                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${opt.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                                            {opt.status === 'active' ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td className="py-3 pr-4">
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => navigate(`/admin/variant-option/${opt._id}/edit`)}
                                                className="flex h-8 w-8 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100"
                                                title="Edit"
                                            >
                                                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                </svg>
                                            </button>
                                            <button
                                                onClick={() => setOptionToDelete(opt)}
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
                            {options.length === 0 && (
                                <tr>
                                    <td colSpan="6" className="py-8 text-center text-slate-500">
                                        No options found for this type.{' '}
                                        <button onClick={() => navigate('/admin/variant-option/create')} className="text-cyan-600 hover:underline">Add one now</button>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="flex justify-start">
                <button
                    onClick={() => navigate('/admin/variant-type')}
                    className="rounded-xl border border-slate-300 bg-white px-6 py-2.5 font-semibold text-slate-700 hover:bg-slate-100"
                >
                    ← Back to Variant Types
                </button>
            </div>

            <ConfirmDialog
                isOpen={Boolean(optionToDelete)}
                title="Delete Variant Option?"
                message="This action permanently removes this option."
                highlightText={optionToDelete?.displayValue || ''}
                confirmText={isDeleting ? 'Deleting...' : 'Delete Option'}
                cancelText="Keep Option"
                isProcessing={isDeleting}
                onConfirm={handleDeleteOption}
                onCancel={() => setOptionToDelete(null)}
            />
        </div>
    );
};

export default VariantTypeView;
