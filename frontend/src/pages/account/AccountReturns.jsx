import React, { useEffect, useState } from 'react';
import apiClient from '../../services/apiClient';
import { API_CONFIG } from '../../constants';

const RETURN_STATUS_STYLES = {
    pending: 'bg-yellow-100 text-yellow-700',
    approved: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
    completed: 'bg-blue-100 text-blue-700',
};

const AccountReturns = () => {
    const [returns, setReturns] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const load = async () => {
            try {
                const data = await apiClient.get(`${API_CONFIG.ENDPOINTS.ORDERS}/returns`);
                setReturns(Array.isArray(data?.data?.returnRequests) ? data.data.returnRequests : data?.returnRequests || []);
            } catch (err) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };
        load();
    }, []);

    if (isLoading) {
        return (
            <div className="flex min-h-[40vh] items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
            </div>
        );
    }

    return (
        <div className="space-y-5">
            <div>
                <h1 className="text-xl font-bold text-slate-800">Returns & Refunds</h1>
                <p className="text-sm text-slate-500">{returns.length} return request{returns.length !== 1 ? 's' : ''}</p>
            </div>

            {error && (
                <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200">{error}</div>
            )}

            {returns.length === 0 ? (
                <div className="rounded-2xl bg-white py-16 text-center shadow-sm ring-1 ring-slate-100">
                    <svg className="mx-auto mb-4 h-14 w-14 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                    </svg>
                    <p className="text-slate-500">No return requests submitted yet.</p>
                    <p className="mt-1 text-xs text-slate-400">You can request a return from a delivered order.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {returns.map((req) => (
                        <div key={req._id} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                    <p className="font-bold text-slate-800">Order #{req.orderNumber || req.orderId?.slice(-8)?.toUpperCase()}</p>
                                    <p className="mt-1 text-sm text-slate-500">
                                        Requested: {new Date(req.requestedAt || req.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                                    </p>
                                    <p className="mt-2 text-sm text-slate-700">
                                        <span className="font-medium">Reason:</span> {req.reason}
                                    </p>
                                    {req.items?.length > 0 && (
                                        <p className="mt-1 text-xs text-slate-400">{req.items.length} item{req.items.length !== 1 ? 's' : ''} in this return</p>
                                    )}
                                </div>
                                <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${RETURN_STATUS_STYLES[req.status] || 'bg-slate-100 text-slate-600'}`}>
                                    {req.status || 'pending'}
                                </span>
                            </div>

                            {req.adminNote && (
                                <div className="mt-3 rounded-xl bg-blue-50 px-4 py-3 text-sm text-blue-700 ring-1 ring-blue-100">
                                    <p className="font-medium">Store note:</p>
                                    <p>{req.adminNote}</p>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default AccountReturns;
