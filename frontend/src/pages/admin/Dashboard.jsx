import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { API_CONFIG } from '../../constants';
import { AdminLoadingState, AdminSurface } from '../../components/admin/AdminTheme';
import notify from '../../utils/notify';
import authService from '../../services/authService';

const Dashboard = () => {
    const [stats, setStats] = useState({
        totalProducts: 0,
        totalUsers: 0,
        totalOrders: 0,
        totalRevenue: 0,
        paidOrders: 0,
        topProducts: [],
        recentOrders: [],
    });
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadDashboardData();
    }, []);

    const loadDashboardData = async () => {
        try {
            setIsLoading(true);
            const [productsRes, usersRes, orderSummaryRes, recentOrdersRes] = await Promise.all([
                fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.PRODUCTS}?limit=5`),
                fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.USERS}?page=1&limit=1`, {
                    headers: authService.getAuthHeaders({}, false),
                }),
                fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.ORDERS}/admin/summary`, {
                    headers: authService.getAuthHeaders({}, false),
                }),
                fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.ORDERS}/admin/all?page=1&limit=5&sort=-createdAt`, {
                    headers: authService.getAuthHeaders({}, false),
                }),
            ]);

            if (
                authService.handleUnauthorizedResponse(usersRes) ||
                authService.handleUnauthorizedResponse(orderSummaryRes) ||
                authService.handleUnauthorizedResponse(recentOrdersRes)
            ) {
                return;
            }

            const [productsData, usersData, orderSummaryData, recentOrdersData] = await Promise.all([
                productsRes.json(),
                usersRes.json(),
                orderSummaryRes.json(),
                recentOrdersRes.json(),
            ]);

            setStats({
                totalProducts: productsData?.data?.pagination?.total || 0,
                totalUsers: usersData?.data?.pagination?.total || 0,
                totalOrders: orderSummaryData?.data?.totalOrders || 0,
                totalRevenue: orderSummaryData?.data?.totalRevenue || 0,
                paidOrders: orderSummaryData?.data?.paidOrders || 0,
                topProducts: productsData?.data?.products?.slice(0, 5) || [],
                recentOrders: recentOrdersData?.data?.orders || [],
            });
        } catch (error) {
            notify.error(error, 'Failed to load dashboard data');
        } finally {
            setIsLoading(false);
        }
    };

    const statCards = useMemo(
        () => [
            {
                title: 'Total Products',
                value: stats.totalProducts,
                link: '/admin/products',
                theme: 'from-cyan-500 via-blue-500 to-indigo-600',
                ring: 'ring-cyan-300/50',
                icon: (
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10" />
                    </svg>
                ),
            },
            {
                title: 'Total Users',
                value: stats.totalUsers,
                link: '/admin/users',
                theme: 'from-emerald-500 via-teal-500 to-cyan-600',
                ring: 'ring-emerald-300/50',
                icon: (
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a4 4 0 00-5-3.87M9 20H4v-2a4 4 0 015-3.87m8-4a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                ),
            },
            {
                title: 'Total Orders',
                value: stats.totalOrders,
                link: '/admin/orders',
                theme: 'from-amber-500 via-orange-500 to-rose-500',
                ring: 'ring-amber-300/50',
                icon: (
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m1.6 8L5.4 5M7 13l-1.5 7h13" />
                    </svg>
                ),
            },
            {
                title: 'Revenue',
                value: `$${Number(stats.totalRevenue || 0).toLocaleString()}`,
                link: '/admin/orders',
                theme: 'from-blue-500 via-indigo-500 to-violet-600',
                ring: 'ring-blue-300/50',
                icon: (
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .672-3 1.5S10.343 11 12 11s3 .672 3 1.5S13.657 14 12 14m0-8v2m0 6v2" />
                    </svg>
                ),
            },
            {
                title: 'Paid Orders',
                value: stats.paidOrders,
                link: '/admin/orders',
                theme: 'from-violet-500 via-fuchsia-500 to-pink-500',
                ring: 'ring-violet-300/50',
                icon: (
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                ),
            },
        ],
        [stats]
    );

    if (isLoading) {
        return <AdminLoadingState title="Loading dashboard..." subtitle="Collecting workspace metrics" />;
    }

    return (
        <div className="space-y-8">
            <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-900 via-slate-800 to-cyan-900 p-6 text-white shadow-[0_20px_60px_rgba(15,23,42,0.35)] sm:p-8">
                <div className="absolute -right-16 -top-16 h-52 w-52 rounded-full bg-cyan-400/20 blur-3xl" />
                <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-violet-400/20 blur-3xl" />
                <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <p className="text-xs uppercase tracking-[0.22em] text-cyan-200">Command Center</p>
                        <h1 className="mt-2 text-3xl font-black leading-tight sm:text-4xl">Creative Admin Dashboard</h1>
                        <p className="mt-2 max-w-xl text-slate-200/90">Track live performance, monitor recent activity, and jump into high-impact actions.</p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <Link to="/admin/orders" className="rounded-xl border border-white/25 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/20">
                            Open Orders
                        </Link>
                        <button
                            type="button"
                            onClick={loadDashboardData}
                            className="rounded-xl bg-cyan-400 px-5 py-3 text-sm font-black text-slate-900 transition hover:bg-cyan-300"
                        >
                            Refresh Data
                        </button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
                {statCards.map((stat) => (
                    <Link
                        key={stat.title}
                        to={stat.link}
                        className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br ${stat.theme} p-[1px] shadow-lg transition duration-300 hover:-translate-y-1 hover:shadow-xl`}
                    >
                        <div className={`rounded-2xl bg-slate-950/85 p-5 text-white ring-1 ${stat.ring}`}>
                            <div className="mb-4 flex items-center justify-between">
                                <span className="text-xs uppercase tracking-[0.16em] text-slate-300">{stat.title}</span>
                                <span className="rounded-lg bg-white/10 p-2 text-cyan-200">{stat.icon}</span>
                            </div>
                            <p className="text-3xl font-black">{stat.value}</p>
                            <p className="mt-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-300/90 group-hover:text-cyan-200">View details</p>
                        </div>
                    </Link>
                ))}
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
                <AdminSurface>
                    <div className="mb-4 flex items-center justify-between">
                        <h2 className="text-xl font-black text-slate-900">Top Products</h2>
                        <Link to="/admin/products" className="text-sm font-semibold text-cyan-700 hover:text-cyan-600">Manage</Link>
                    </div>
                    <div className="space-y-3">
                        {stats.topProducts.length === 0 ? (
                            <p className="text-sm text-slate-500">No products available.</p>
                        ) : (
                            stats.topProducts.map((product, index) => (
                                <div key={product._id || product.title || index} className="rounded-xl border border-slate-200 bg-gradient-to-r from-slate-50 to-cyan-50 px-3 py-2.5">
                                    <div className="flex items-center justify-between gap-3">
                                        <p className="line-clamp-1 text-sm font-semibold text-slate-900">{product.title || 'Untitled Product'}</p>
                                        <span className="rounded-md bg-cyan-100 px-2 py-1 text-xs font-bold text-cyan-800">{index + 1}</span>
                                    </div>
                                    <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
                                        <span>{product.status || 'draft'}</span>
                                        <span>${Number(product.basePrice || 0).toFixed(2)}</span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </AdminSurface>

                <AdminSurface>
                    <div className="mb-4 flex items-center justify-between">
                        <h2 className="text-xl font-black text-slate-900">Recent Orders</h2>
                        <Link to="/admin/orders" className="text-sm font-semibold text-cyan-700 hover:text-cyan-600">View All</Link>
                    </div>
                    <div className="space-y-3">
                        {stats.recentOrders.length === 0 ? (
                            <p className="text-sm text-slate-500">No orders available.</p>
                        ) : (
                            stats.recentOrders.map((order) => (
                                <div key={order._id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-semibold text-slate-900">{order.orderNumber}</p>
                                        <p className="text-xs text-slate-500">{order.firstName} {order.lastName}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-bold text-slate-900">${Number(order.totalAmount || 0).toFixed(2)}</p>
                                        <p className="text-xs uppercase text-slate-500">{order.status}</p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </AdminSurface>

                <AdminSurface className="xl:col-span-1">
                    <h2 className="mb-4 text-xl font-black text-slate-900">Quick Actions</h2>
                    <div className="grid grid-cols-1 gap-3">
                        <Link to="/admin/products/create" className="rounded-xl border border-cyan-200 bg-gradient-to-r from-cyan-50 to-sky-50 px-4 py-3 font-semibold text-cyan-900 transition hover:from-cyan-100 hover:to-sky-100">Create Product</Link>
                        <Link to="/admin/categories/create" className="rounded-xl border border-indigo-200 bg-gradient-to-r from-indigo-50 to-blue-50 px-4 py-3 font-semibold text-indigo-900 transition hover:from-indigo-100 hover:to-blue-100">Create Category</Link>
                        <Link to="/admin/users/create" className="rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 px-4 py-3 font-semibold text-emerald-900 transition hover:from-emerald-100 hover:to-teal-100">Create User</Link>
                        <Link to="/admin/banners/create" className="rounded-xl border border-violet-200 bg-gradient-to-r from-violet-50 to-fuchsia-50 px-4 py-3 font-semibold text-violet-900 transition hover:from-violet-100 hover:to-fuchsia-100">Create Banner</Link>
                        <Link to="/admin/coupons/create" className="rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 px-4 py-3 font-semibold text-amber-900 transition hover:from-amber-100 hover:to-orange-100">Create Coupon</Link>
                    </div>
                </AdminSurface>
            </div>
        </div>
    );
};

export default Dashboard;
