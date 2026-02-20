import React, { useEffect, useMemo, useState } from 'react';
import notify from '../../../utils/notify';
import { API_CONFIG } from '../../../constants';
import { AdminLoadingState, AdminPageHeader, AdminSurface } from '../../../components/admin/AdminTheme';

const ORDER_STATUSES = ['new', 'process', 'delivered', 'cancelled'];
const PAYMENT_STATUSES = ['paid', 'unpaid'];

const OrdersList = () => {
    const [orders, setOrders] = useState([]);
    const [summary, setSummary] = useState({
        totalOrders: 0,
        totalRevenue: 0,
        newOrders: 0,
        processingOrders: 0,
        deliveredOrders: 0,
        cancelledOrders: 0,
    });
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 20,
        total: 0,
        pages: 1,
        hasPrev: false,
        hasNext: false,
    });
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [paymentFilter, setPaymentFilter] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const fetchSummary = async () => {
        const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.ORDERS}/admin/summary`, {
            credentials: 'include',
        });
        const data = await response.json();

        if (!response.ok || !data?.success) {
            throw new Error(data?.message || 'Failed to load order summary');
        }

        setSummary(data.data || {});
    };

    const fetchOrders = async (page = pagination.page) => {
        const params = new URLSearchParams({
            page: String(page),
            limit: String(pagination.limit),
            sort: '-createdAt',
        });

        if (statusFilter) params.set('status', statusFilter);
        if (paymentFilter) params.set('paymentStatus', paymentFilter);
        if (searchTerm.trim()) params.set('search', searchTerm.trim());

        const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.ORDERS}/admin/all?${params}`, {
            credentials: 'include',
        });
        const data = await response.json();

        if (!response.ok || !data?.success) {
            throw new Error(data?.message || 'Failed to load orders');
        }

        setOrders(data?.data?.orders || []);
        setPagination((prev) => ({
            ...prev,
            ...(data?.data?.pagination || {}),
        }));
    };

    const loadData = async (page = pagination.page, background = false) => {
        try {
            if (background) setIsRefreshing(true);
            else setIsLoading(true);

            await Promise.all([fetchSummary(), fetchOrders(page)]);
        } catch (error) {
            notify.error(error, 'Failed to load orders');
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        loadData(1);
         
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            const nextPage = pagination.page === 1 ? 1 : 1;
            setPagination((prev) => ({ ...prev, page: nextPage }));
            loadData(nextPage, true);
        }, 350);

        return () => clearTimeout(timer);
         
    }, [searchTerm, statusFilter, paymentFilter]);

    useEffect(() => {
        if (isLoading) return;
        loadData(pagination.page, true);
         
    }, [pagination.page]);

    const handleStatusUpdate = async (orderId, nextStatus) => {
        try {
            const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.ORDERS}/${orderId}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({ status: nextStatus }),
            });
            const data = await response.json();

            if (!response.ok || !data?.success) {
                notify.error(data, 'Failed to update order status');
                return;
            }

            notify.success('Order status updated');
            loadData(pagination.page, true);
        } catch (error) {
            notify.error(error, 'Failed to update order status');
        }
    };

    const metrics = useMemo(
        () => [
            { label: 'Total Orders', value: summary.totalOrders || 0, tone: 'border-cyan-200 bg-cyan-50 text-cyan-800' },
            { label: 'Revenue', value: `$${Number(summary.totalRevenue || 0).toLocaleString()}`, tone: 'border-blue-200 bg-blue-50 text-blue-800' },
            { label: 'New', value: summary.newOrders || 0, tone: 'border-amber-200 bg-amber-50 text-amber-800' },
            { label: 'Processing', value: summary.processingOrders || 0, tone: 'border-violet-200 bg-violet-50 text-violet-800' },
            { label: 'Delivered', value: summary.deliveredOrders || 0, tone: 'border-emerald-200 bg-emerald-50 text-emerald-800' },
            { label: 'Cancelled', value: summary.cancelledOrders || 0, tone: 'border-rose-200 bg-rose-50 text-rose-800' },
        ],
        [summary]
    );

    if (isLoading) {
        return <AdminLoadingState title="Loading orders..." subtitle="Preparing order management workspace" />;
    }

    return (
        <div className="space-y-8">
            <AdminPageHeader
                eyebrow="Order Studio"
                title="Orders Management"
                subtitle="Track, filter, and update order fulfillment and payment status in real time."
                actions={(
                    <button
                        type="button"
                        onClick={() => loadData(pagination.page, true)}
                        className="rounded-xl border border-white/30 bg-white/10 px-5 py-3 font-semibold text-white transition hover:bg-white/20"
                    >
                        {isRefreshing ? 'Refreshing...' : 'Refresh'}
                    </button>
                )}
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-6">
                {metrics.map((item) => (
                    <div key={item.label} className={`rounded-2xl border p-4 shadow-sm ${item.tone}`}>
                        <p className="text-xs uppercase tracking-widest">{item.label}</p>
                        <p className="mt-2 text-2xl font-black">{item.value}</p>
                    </div>
                ))}
            </div>

            <AdminSurface className="p-4 sm:p-5">
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_auto_auto_auto]">
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(event) => setSearchTerm(event.target.value)}
                        placeholder="Search order number, customer email, customer name..."
                        className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-800 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-200"
                    />

                    <select
                        value={statusFilter}
                        onChange={(event) => setStatusFilter(event.target.value)}
                        className="rounded-xl border border-slate-300 px-4 py-3 text-slate-800 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-200"
                    >
                        <option value="">All Status</option>
                        {ORDER_STATUSES.map((status) => (
                            <option key={status} value={status}>{status}</option>
                        ))}
                    </select>

                    <select
                        value={paymentFilter}
                        onChange={(event) => setPaymentFilter(event.target.value)}
                        className="rounded-xl border border-slate-300 px-4 py-3 text-slate-800 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-200"
                    >
                        <option value="">All Payment</option>
                        {PAYMENT_STATUSES.map((status) => (
                            <option key={status} value={status}>{status}</option>
                        ))}
                    </select>

                    <button
                        type="button"
                        onClick={() => {
                            setSearchTerm('');
                            setStatusFilter('');
                            setPaymentFilter('');
                            setPagination((prev) => ({ ...prev, page: 1 }));
                            loadData(1, true);
                        }}
                        className="rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white transition hover:bg-slate-700"
                    >
                        Reset
                    </button>
                </div>
            </AdminSurface>

            <AdminSurface className="p-4 sm:p-5">
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[1100px] text-sm">
                        <thead>
                            <tr className="border-b border-slate-200 text-left text-slate-600">
                                <th className="py-3 pr-3">Order</th>
                                <th className="py-3 pr-3">Customer</th>
                                <th className="py-3 pr-3">Amount</th>
                                <th className="py-3 pr-3">Payment</th>
                                <th className="py-3 pr-3">Status</th>
                                <th className="py-3 pr-3">Date</th>
                                <th className="py-3 pr-3 text-right">Update Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {orders.map((order) => (
                                <tr key={order._id} className="border-b border-slate-100">
                                    <td className="py-3 pr-3 font-semibold text-slate-900">
                                        {order.orderNumber}
                                    </td>
                                    <td className="py-3 pr-3 text-slate-700">
                                        <p className="font-medium">{order.firstName} {order.lastName}</p>
                                        <p className="text-xs text-slate-500">{order.email}</p>
                                    </td>
                                    <td className="py-3 pr-3 font-semibold text-slate-900">
                                        ${Number(order.totalAmount || 0).toFixed(2)}
                                    </td>
                                    <td className="py-3 pr-3">
                                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                            order.paymentStatus === 'paid'
                                                ? 'bg-emerald-100 text-emerald-800'
                                                : 'bg-amber-100 text-amber-800'
                                        }`}>
                                            {order.paymentStatus}
                                        </span>
                                    </td>
                                    <td className="py-3 pr-3">
                                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                                            {order.status}
                                        </span>
                                    </td>
                                    <td className="py-3 pr-3 text-slate-700">
                                        {new Date(order.createdAt).toLocaleString()}
                                    </td>
                                    <td className="py-3 pr-3 text-right">
                                        <select
                                            value={order.status}
                                            onChange={(event) => handleStatusUpdate(order._id, event.target.value)}
                                            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-800 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-200"
                                        >
                                            {ORDER_STATUSES.map((status) => (
                                                <option key={status} value={status}>{status}</option>
                                            ))}
                                        </select>
                                    </td>
                                </tr>
                            ))}
                            {orders.length === 0 && (
                                <tr>
                                    <td colSpan="7" className="py-10 text-center text-slate-500">
                                        No orders found for the selected filters.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-slate-600">
                        Showing {orders.length ? (pagination.page - 1) * pagination.limit + 1 : 0} to{' '}
                        {Math.min(pagination.page * pagination.limit, pagination.total || 0)} of {pagination.total || 0} orders
                    </p>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
                            disabled={!pagination.hasPrev}
                            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            Previous
                        </button>
                        <span className="text-sm font-semibold text-slate-700">
                            Page {pagination.page || 1} of {pagination.pages || 1}
                        </span>
                        <button
                            type="button"
                            onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
                            disabled={!pagination.hasNext}
                            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            Next
                        </button>
                    </div>
                </div>
            </AdminSurface>
        </div>
    );
};

export default OrdersList;
