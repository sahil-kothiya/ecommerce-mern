import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import authService from '../services/authService';
import { useSiteSettings } from '../context/useSiteSettings';
import { resolveImageUrl } from '../utils/imageUrl';

const MENU_ITEMS = [
    { key: 'dashboard', path: '/admin', label: 'Dashboard', exact: true },
    { key: 'products', path: '/admin/products', label: 'Products' },
    { key: 'categories', path: '/admin/categories', label: 'Categories' },
    { key: 'users', path: '/admin/users', label: 'Users' },
    { key: 'orders', path: '/admin/orders', label: 'Orders' },
    { key: 'banners', path: '/admin/banners', label: 'Banners' },
    { key: 'brands', path: '/admin/brands', label: 'Brands' },
    { key: 'discounts', path: '/admin/discounts', label: 'Discounts' },
    { key: 'coupons', path: '/admin/coupons', label: 'Coupons' },
    {
        key: 'variants',
        label: 'Variants',
        children: [
            { key: 'variant-types', path: '/admin/variant-type', label: 'Types' },
            { key: 'variant-type-create', path: '/admin/variant-type/create', label: 'Add Type' },
            { key: 'variant-options', path: '/admin/variant-option', label: 'Options' },
            { key: 'variant-option-create', path: '/admin/variant-option/create', label: 'Add Option' },
        ],
    },
    { key: 'reviews', path: '/admin/reviews', label: 'Reviews' },
    { key: 'settings', path: '/admin/settings', label: 'Settings' },
];

const UI_CONFIG = {
    SIDEBAR_OPEN: 'w-72',
    SIDEBAR_CLOSED: 'w-0',
};

const iconClass = 'h-[18px] w-[18px]';

const NavGlyph = ({ name }) => {
    switch (name) {
        case 'dashboard':
            return <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 13h6V4H4v9zm0 7h6v-5H4v5zm10 0h6v-9h-6v9zm0-16v5h6V4h-6z" /></svg>;
        case 'products':
            return <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10" /></svg>;
        case 'categories':
            return <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7h8V3H3v4zm10 0h8V3h-8v4zM3 21h8v-10H3v10zm10 0h8v-10h-8v10z" /></svg>;
        case 'users':
            return <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a4 4 0 00-5-3.87M9 20H4v-2a4 4 0 015-3.87m8-4a4 4 0 11-8 0 4 4 0 018 0zM6 10a3 3 0 100-6 3 3 0 000 6zm12 0a3 3 0 100-6 3 3 0 000 6z" /></svg>;
        case 'orders':
            return <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m1.6 8L5.4 5M7 13l-1.5 7h13M9 20a1 1 0 100-2 1 1 0 000 2zm8 0a1 1 0 100-2 1 1 0 000 2z" /></svg>;
        case 'banners':
            return <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16v12H4z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l5-5 4 4 3-3 4 4" /></svg>;
        case 'brands':
            return <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h10l2 5-7 7-7-7 2-5z" /></svg>;
        case 'discounts':
            return <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 5L5 19M7 7h.01M17 17h.01" /></svg>;
        case 'coupons':
            return <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-6 0h.01M15 14h.01M7 5h10a2 2 0 012 2v3a2 2 0 01-2 2h-1l-2 2 2 2h1a2 2 0 012 2v3a2 2 0 01-2 2H7a2 2 0 01-2-2v-3a2 2 0 012-2h1l2-2-2-2H7a2 2 0 01-2-2V7a2 2 0 012-2z" /></svg>;
        case 'variants':
            return <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317a1 1 0 011.35-.936l1.612.806a1 1 0 001.184-.21l1.24-1.24a1 1 0 011.414 0l1.414 1.414a1 1 0 010 1.414l-1.24 1.24a1 1 0 00-.21 1.184l.806 1.612a1 1 0 01-.936 1.35H17a1 1 0 00-.95.684l-.538 1.614a1 1 0 01-.949.684h-2.126a1 1 0 01-.949-.684l-.538-1.614A1 1 0 0010 10H8.001a1 1 0 01-.936-1.35l.806-1.612a1 1 0 00-.21-1.184l-1.24-1.24a1 1 0 010-1.414l1.414-1.414a1 1 0 011.414 0l1.24 1.24a1 1 0 001.184.21l1.612-.806z" /></svg>;
        case 'reviews':
            return <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.959a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.367 2.447a1 1 0 00-.364 1.118l1.286 3.959c.3.921-.755 1.688-1.539 1.118l-3.367-2.447a1 1 0 00-1.176 0L7.04 18.028c-.783.57-1.838-.197-1.539-1.118l1.286-3.959a1 1 0 00-.364-1.118L3.056 9.386c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69l1.293-3.959z" /></svg>;
        case 'settings':
            return <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 16v-2m8-6h-2M6 12H4m12.95 4.95l-1.414-1.414M8.464 8.464L7.05 7.05m9.9 0l-1.414 1.414M8.464 15.536L7.05 16.95M12 16a4 4 0 100-8 4 4 0 000 8z" /></svg>;
        default:
            return <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" strokeWidth={2} /></svg>;
    }
};

const AdminLayout = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { settings } = useSiteSettings();

    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const [expandedMenus, setExpandedMenus] = useState({ variants: false });

    useEffect(() => {
        try {
            const user = authService.getUser();
            if (user) setCurrentUser(user);
            else navigate('/login', { replace: true });
        } catch (error) {
            navigate('/login', { replace: true });
        }
    }, [navigate]);

    const siteName = useMemo(() => String(settings?.siteName || 'Enterprise E-Commerce').trim(), [settings?.siteName]);
    const siteTagline = useMemo(() => String(settings?.siteTagline || '').trim(), [settings?.siteTagline]);
    const logoUrl = useMemo(() => resolveImageUrl(settings?.logo, { placeholder: null }), [settings?.logo]);
    const brandMark = useMemo(() => {
        const chars = siteName
            .split(' ')
            .filter(Boolean)
            .slice(0, 2)
            .map((part) => part[0]?.toUpperCase() || '');
        return chars.join('') || 'EC';
    }, [siteName]);
    const userInitial = useMemo(() => currentUser?.name?.charAt(0)?.toUpperCase() || 'A', [currentUser]);
    const userName = useMemo(() => currentUser?.name || 'Admin User', [currentUser]);
    const userEmail = useMemo(() => currentUser?.email || settings?.supportEmail || 'admin@admin.com', [currentUser, settings?.supportEmail]);

    const isActive = useCallback((path, exact = false) => {
        if (exact) return location.pathname === path;
        return location.pathname.startsWith(path);
    }, [location.pathname]);

    const toggleSidebar = useCallback(() => {
        setIsSidebarOpen((prev) => !prev);
    }, []);

    const toggleMenu = useCallback((menuKey) => {
        setExpandedMenus((prev) => ({ ...prev, [menuKey]: !prev[menuKey] }));
    }, []);

    const handleLogout = useCallback(async () => {
        if (isLoggingOut) return;
        setIsLoggingOut(true);
        try {
            await authService.logout();
            setCurrentUser(null);
            navigate('/login', { replace: true });
        } catch (error) {
            setCurrentUser(null);
            navigate('/login', { replace: true });
        } finally {
            setIsLoggingOut(false);
        }
    }, [isLoggingOut, navigate]);

    return (
        <div className="admin-theme min-h-screen text-slate-800">
            <header className="admin-topbar fixed left-0 right-0 top-0 z-40">
                <div className="flex items-center justify-between px-4 py-3 sm:px-6">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={toggleSidebar}
                            className="admin-button-secondary tap-bounce rounded-2xl px-3 py-2 text-slate-700 transition"
                            aria-label="Toggle sidebar"
                            aria-expanded={isSidebarOpen}
                        >
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                        </button>
                        <Link to="/admin" className="flex items-center gap-3">
                            <span className="admin-brand-mark animate-floatBob flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl text-sm font-black text-white">
                                {logoUrl ? (
                                    <img src={logoUrl} alt={siteName} className="h-full w-full object-cover" />
                                ) : (
                                    brandMark
                                )}
                            </span>
                            <span className="hidden sm:block">
                                <span className="block text-[11px] font-bold uppercase tracking-[0.24em] text-[#4250d5]">{siteTagline || 'Creator Console'}</span>
                                <span className="admin-display block text-base text-[#131313]">{siteName}</span>
                            </span>
                        </Link>
                    </div>

                    <div className="flex items-center gap-3">
                        <Link to="/" className="admin-button-secondary hidden rounded-full px-4 py-2 text-sm font-semibold sm:block">View Site</Link>
                        <div className="admin-surface interactive-card hover-glow flex items-center gap-2 rounded-2xl px-3 py-2">
                            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#4250d5] via-[#6a88e2] to-[#ffa336] text-sm font-bold text-white">{userInitial}</span>
                            <div className="hidden text-left md:block">
                                <p className="text-sm font-semibold text-[#131313]">{userName}</p>
                                <p className="text-xs text-[#666666]">{userEmail}</p>
                            </div>
                            <button
                                onClick={handleLogout}
                                disabled={isLoggingOut}
                                className="rounded-xl p-2 text-[#666666] transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40"
                                title="Logout"
                                aria-label="Logout"
                            >
                                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <div className="flex pt-16">
                <aside
                    className={`admin-sidebar fixed left-0 top-16 z-30 h-[calc(100vh-4rem)] overflow-hidden text-slate-200 shadow-2xl transition-all duration-300 ${
                        isSidebarOpen ? UI_CONFIG.SIDEBAR_OPEN : UI_CONFIG.SIDEBAR_CLOSED
                    }`}
                    aria-label="Main navigation"
                    aria-hidden={!isSidebarOpen}
                >
                    <div className="h-full overflow-y-auto px-4 py-5">
                        <div className="admin-nav-panel interactive-card hover-glow mb-4 rounded-2xl p-4">
                            <p className="text-[11px] uppercase tracking-[0.22em] text-[#d5e2ff]">Navigation</p>
                            <p className="mt-1 text-sm font-semibold text-[#fafcff]">Run ops faster, ship updates smarter</p>
                        </div>

                        <nav className="space-y-2" role="navigation">
                            {MENU_ITEMS.map((item) => {
                                if (Array.isArray(item.children)) {
                                    const isMenuActive = item.children.some((child) => isActive(child.path, true));
                                    const isExpanded = expandedMenus[item.key] || isMenuActive;

                                    return (
                                        <div key={item.key} className="space-y-2">
                                            <button
                                                type="button"
                                                onClick={() => toggleMenu(item.key)}
                                                className={`admin-nav-item tap-bounce flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm transition ${
                                                    isMenuActive ? 'admin-nav-item-active' : ''
                                                }`}
                                            >
                                                <span className="flex items-center gap-2.5">
                                                    <span className="admin-nav-glyph flex h-7 w-7 items-center justify-center rounded-lg">
                                                        <NavGlyph name={item.key} />
                                                    </span>
                                                    <span className="font-semibold">{item.label}</span>
                                                </span>
                                                <span className={`text-xs font-bold ${isExpanded ? 'text-[#ffa336]' : 'text-slate-300'}`}>{isExpanded ? 'v' : '>'}</span>
                                            </button>

                                            {isExpanded && (
                                                <div className="admin-nav-submenu space-y-1 rounded-xl p-2">
                                                    {item.children.map((child) => {
                                                        const isChildActive = isActive(child.path, true);
                                                        return (
                                                            <Link
                                                                key={child.path}
                                                                to={child.path}
                                                                className={`tap-bounce block rounded-lg px-3 py-2 text-sm transition ${
                                                                    isChildActive
                                                                        ? 'bg-white/15 text-white'
                                                                        : 'text-slate-300 hover:bg-white/10 hover:text-white'
                                                                }`}
                                                            >
                                                                {child.label}
                                                            </Link>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    );
                                }

                                const isCurrent = isActive(item.path, item.exact);
                                return (
                                    <Link
                                        key={item.path}
                                        to={item.path}
                                        className={`admin-nav-item tap-bounce flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm transition ${
                                            isCurrent ? 'admin-nav-item-active' : ''
                                        }`}
                                        aria-current={isCurrent ? 'page' : undefined}
                                    >
                                        <span className="admin-nav-glyph flex h-7 w-7 items-center justify-center rounded-lg">
                                            <NavGlyph name={item.key} />
                                        </span>
                                        <span className="font-semibold">{item.label}</span>
                                    </Link>
                                );
                            })}
                        </nav>
                    </div>
                </aside>

                <main className={`min-w-0 flex-1 transition-all duration-300 ${isSidebarOpen ? 'ml-72' : 'ml-0'}`} role="main">
                    <div className="p-4 sm:p-6 lg:p-7">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
};

AdminLayout.displayName = 'AdminLayout';

export default AdminLayout;
