import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { API_CONFIG } from '../../constants';
import { AdminLoadingState, AdminSurface } from '../../components/admin/AdminTheme';
import notify from '../../utils/notify';
import apiClient from '../../services/apiClient';
import { formatPrice, getProductDisplayPricing } from '../../utils/productUtils';
import { useSiteSettings } from '../../context/useSiteSettings';
import { formatCurrency } from '../../utils/currency';

const Dashboard = () => {
    const { settings } = useSiteSettings();
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
                apiClient.get(`${API_CONFIG.ENDPOINTS.PRODUCTS}?limit=5`),
                apiClient.get(`${API_CONFIG.ENDPOINTS.USERS}?page=1&limit=1`),
                apiClient.get(`${API_CONFIG.ENDPOINTS.ORDERS}/admin/summary`),
                apiClient.get(`${API_CONFIG.ENDPOINTS.ORDERS}/admin/all?page=1&limit=5&sort=-createdAt`),
            ]);

            const productsData = productsRes?.data || {};
            const usersData = usersRes?.data || {};
            const orderSummaryData = orderSummaryRes?.data || {};
            const recentOrdersData = recentOrdersRes?.data || {};

            setStats({
                totalProducts: Number(productsData?.pagination?.total || 0),
                totalUsers: Number(usersData?.pagination?.total || 0),
                totalOrders: Number(orderSummaryData?.totalOrders || 0),
                totalRevenue: Number(orderSummaryData?.totalRevenue || 0),
                paidOrders: Number(orderSummaryData?.paidOrders || 0),
                topProducts: Array.isArray(productsData?.products) ? productsData.products.slice(0, 5) : [],
                recentOrders: Array.isArray(recentOrdersData?.orders) ? recentOrdersData.orders : [],
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
                theme: 'from-[#4250d5] via-[#6a88e2] to-[#a5bbfc]',
                ring: 'ring-[#d2dff9]/70',
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
                theme: 'from-[#11115b] via-[#4250d5] to-[#6a88e2]',
                ring: 'ring-[#a7c0f1]/70',
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
                theme: 'from-[#a5460f] via-[#f9730c] to-[#ffa336]',
                ring: 'ring-[#ffb053]/70',
                icon: (
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m1.6 8L5.4 5M7 13l-1.5 7h13" />
                    </svg>
                ),
            },
            {
                title: 'Revenue',
                value: formatCurrency(stats.totalRevenue, settings),
                link: '/admin/orders',
                theme: 'from-[#29211d] via-[#0a2156] to-[#4250d5]',
                ring: 'ring-[#a5bbfc]/70',
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
                theme: 'from-[#556adc] via-[#f9730c] to-[#ffb053]',
                ring: 'ring-[#f0d5ba]/80',
                icon: (
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                ),
            },
        ],
        [settings, stats]
    );

    if (isLoading) {
        return <AdminLoadingState title="Loading dashboard..." subtitle="Collecting workspace metrics" />;
    }

    return (
        <div className="space-y-8">
            <div className="admin-hero rounded-3xl p-6 text-white sm:p-8">
                <div className="absolute -right-16 -top-16 h-52 w-52 rounded-full bg-[#ffa336]/30 blur-3xl" />
                <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-[#a5bbfc]/30 blur-3xl" />
                <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <p className="admin-hero-eyebrow text-xs uppercase">Command Center</p>
                        <h1 className="admin-display mt-2 text-3xl leading-tight sm:text-4xl">Sovereign Commerce Dashboard</h1>
                        <p className="mt-2 max-w-xl text-[#e8effc]">Track live performance, monitor recent activity, and jump into high-impact actions.</p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <Link to="/admin/orders" className="admin-button-secondary rounded-full px-5 py-3 text-sm font-semibold">
                            Open Orders
                        </Link>
                        <button
                            type="button"
                            onClick={loadDashboardData}
                            className="admin-button-primary rounded-full px-5 py-3 text-sm font-black transition"
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
                        <div className={`rounded-2xl border border-white/20 bg-[#0f172a]/85 p-5 text-white ring-1 ${stat.ring}`}>
                            <div className="mb-4 flex items-center justify-between">
                                <span className="text-xs uppercase tracking-[0.16em] text-slate-300">{stat.title}</span>
                                <span className="rounded-lg bg-white/10 p-2 text-[#ffb053]">{stat.icon}</span>
                            </div>
                            <p className="text-3xl font-black">{stat.value}</p>
                            <p className="mt-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-300/90 group-hover:text-[#ffb053]">View details</p>
                        </div>
                    </Link>
                ))}
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
                <AdminSurface>
                    <div className="mb-4 flex items-center justify-between">
                        <h2 className="text-xl font-black text-slate-900">Top Products</h2>
                        <Link to="/admin/products" className="admin-link-quiet text-sm font-semibold">Manage</Link>
                    </div>
                    <div className="space-y-3">
                        {stats.topProducts.length === 0 ? (
                            <p className="text-sm text-slate-500">No products available.</p>
                        ) : (
                            stats.topProducts.map((product, index) => {
                                const pricing = getProductDisplayPricing(product);
                                const priceCurrency = String(settings?.currencyCode || 'USD').toUpperCase();
                                const priceLabel = pricing.isRange
                                    ? `${formatPrice(pricing.minPrice, priceCurrency)} - ${formatPrice(pricing.maxPrice, priceCurrency)}`
                                    : formatPrice(pricing.finalPrice, priceCurrency);

                                return (
                                <div key={product._id || product.title || index} className="rounded-xl border border-slate-200 bg-gradient-to-r from-slate-50 to-cyan-50 px-3 py-2.5">
                                    <div className="flex items-center justify-between gap-3">
                                        <p className="line-clamp-1 text-sm font-semibold text-slate-900">{product.title || 'Untitled Product'}</p>
                                        <span className="rounded-md bg-cyan-100 px-2 py-1 text-xs font-bold text-cyan-800">{index + 1}</span>
                                    </div>
                                    <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
                                        <span>{product.status || 'draft'}</span>
                                        <span>{priceLabel}</span>
                                    </div>
                                </div>
                                );
                            })
                        )}
                    </div>
                </AdminSurface>

                <AdminSurface>
                    <div className="mb-4 flex items-center justify-between">
                        <h2 className="text-xl font-black text-slate-900">Recent Orders</h2>
                        <Link to="/admin/orders" className="admin-link-quiet text-sm font-semibold">View All</Link>
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
                                        <p className="text-sm font-bold text-slate-900">{formatCurrency(order.totalAmount, settings)}</p>
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
                        <Link to="/admin/products/create" className="admin-button-secondary rounded-xl px-4 py-3 font-semibold">Create Product</Link>
                        <Link to="/admin/categories/create" className="admin-button-secondary rounded-xl px-4 py-3 font-semibold">Create Category</Link>
                        <Link to="/admin/users/create" className="admin-button-secondary rounded-xl px-4 py-3 font-semibold">Create User</Link>
                        <Link to="/admin/banners/create" className="admin-button-secondary rounded-xl px-4 py-3 font-semibold">Create Banner</Link>
                        <Link to="/admin/coupons/create" className="admin-button-secondary rounded-xl px-4 py-3 font-semibold">Create Coupon</Link>
                    </div>
                </AdminSurface>
            </div>
        </div>
    );
};

export default Dashboard;
