import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../../services/apiClient';
import { API_CONFIG } from '../../constants';

const StatCard = ({ label, value, icon, to, color }) => (
    <Link to={to} className="group flex items-center gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100 transition hover:shadow-md hover:ring-blue-200">
        <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-white ${color}`}>
            {icon}
        </span>
        <div>
            <p className="text-2xl font-bold text-slate-800 group-hover:text-blue-600 transition">{value}</p>
            <p className="text-sm text-slate-500">{label}</p>
        </div>
    </Link>
);

const ORDER_STATUS_COLORS = {
    new: 'bg-blue-100 text-blue-700',
    process: 'bg-yellow-100 text-yellow-700',
    delivered: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
};

const AccountDashboard = () => {
    const [user, setUser] = useState(null);
    const [orders, setOrders] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const load = async () => {
            try {
                setIsLoading(true);
                const [profileData, ordersData] = await Promise.all([
                    apiClient.get(`${API_CONFIG.ENDPOINTS.AUTH}/me`),
                    apiClient.get(API_CONFIG.ENDPOINTS.ORDERS),
                ]);

                if (profileData) setUser(profileData?.data?.user || profileData?.user || null);
                if (ordersData) setOrders(Array.isArray(ordersData?.data?.orders) ? ordersData.data.orders : ordersData?.orders || []);
            } catch (err) {
                setError(err.message || 'Failed to load dashboard');
            } finally {
                setIsLoading(false);
            }
        };
        load();
    }, []);

    const stats = useMemo(() => {
        const total = orders.length;
        const delivered = orders.filter((o) => o.status === 'delivered').length;
        const active = orders.filter((o) => ['new', 'process'].includes(o.status)).length;
        const cancelled = orders.filter((o) => o.status === 'cancelled').length;
        return { total, delivered, active, cancelled };
    }, [orders]);

    const recentOrders = useMemo(() => orders.slice(0, 5), [orders]);

    if (isLoading) {
        return (
            <div className="flex min-h-[40vh] items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Welcome banner */}
            <div className="rounded-2xl bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white shadow">
                <h1 className="text-2xl font-bold">Welcome back, {user?.name?.split(' ')[0] || 'there'}! 👋</h1>
                <p className="mt-1 text-blue-100">Here's what's happening with your account.</p>
            </div>

            {error && (
                <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200">{error}</div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <StatCard
                    label="Total Orders"
                    value={stats.total}
                    to="/account/orders"
                    color="bg-blue-600"
                    icon={<svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>}
                />
                <StatCard
                    label="Active Orders"
                    value={stats.active}
                    to="/account/orders"
                    color="bg-yellow-500"
                    icon={<svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                />
                <StatCard
                    label="Delivered"
                    value={stats.delivered}
                    to="/account/orders"
                    color="bg-green-600"
                    icon={<svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                />
                <StatCard
                    label="Cancelled"
                    value={stats.cancelled}
                    to="/account/orders"
                    color="bg-red-500"
                    icon={<svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                />
            </div>

            {/* Recent orders  */}
            <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
                <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-base font-bold text-slate-800">Recent Orders</h2>
                    <Link to="/account/orders" className="text-sm font-medium text-blue-600 hover:underline">View all →</Link>
                </div>
                {recentOrders.length === 0 ? (
                    <div className="py-10 text-center text-slate-400">
                        <svg className="mx-auto mb-3 h-10 w-10 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                        <p className="text-sm">No orders yet. <Link to="/products" className="text-blue-600 hover:underline">Start shopping!</Link></p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {recentOrders.map((order) => (
                            <div key={order._id} className="flex items-center justify-between py-3">
                                <div>
                                    <p className="text-sm font-semibold text-slate-800">#{order.orderNumber || order._id.slice(-8).toUpperCase()}</p>
                                    <p className="text-xs text-slate-400">{new Date(order.createdAt).toLocaleDateString()} · {order.items?.length || 0} item{order.items?.length !== 1 ? 's' : ''}</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${ORDER_STATUS_COLORS[order.status] || 'bg-slate-100 text-slate-600'}`}>
                                        {order.status}
                                    </span>
                                    <p className="text-sm font-bold text-slate-800">${Number(order.totalAmount || 0).toFixed(2)}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Quick account actions */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Link to="/account/profile" className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100 transition hover:shadow-md hover:ring-blue-200">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 text-purple-600">
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                    </span>
                    <div>
                        <p className="text-sm font-semibold text-slate-800">Edit Profile</p>
                        <p className="text-xs text-slate-400">Update name, email & phone</p>
                    </div>
                </Link>
                <Link to="/account/addresses" className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100 transition hover:shadow-md hover:ring-blue-200">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-100 text-green-600">
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    </span>
                    <div>
                        <p className="text-sm font-semibold text-slate-800">Manage Addresses</p>
                        <p className="text-xs text-slate-400">{user?.addresses?.length || 0} saved address{user?.addresses?.length !== 1 ? 'es' : ''}</p>
                    </div>
                </Link>
                <Link to="/account/wishlist" className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100 transition hover:shadow-md hover:ring-blue-200">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100 text-rose-600">
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                    </span>
                    <div>
                        <p className="text-sm font-semibold text-slate-800">My Wishlist</p>
                        <p className="text-xs text-slate-400">Saved items for later</p>
                    </div>
                </Link>
            </div>
        </div>
    );
};

export default AccountDashboard;
