import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import authService from '../services/authService';

const USER_MENU = [
    { key: 'dashboard', path: '/account', label: 'My Account', exact: true },
    { key: 'orders', path: '/account/orders', label: 'My Orders' },
    { key: 'returns', path: '/account/returns', label: 'Returns & Refunds' },
    { key: 'profile', path: '/account/profile', label: 'Profile & Security' },
    { key: 'addresses', path: '/account/addresses', label: 'Manage Addresses' },
    { key: 'wishlist', path: '/account/wishlist', label: 'Wishlist' },
    { key: 'reviews', path: '/account/reviews', label: 'My Reviews' },
];

const iconClass = 'h-[18px] w-[18px] shrink-0';

const NavGlyph = ({ name }) => {
    switch (name) {
        case 'dashboard':
            return <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>;
        case 'orders':
            return <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>;
        case 'returns':
            return <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>;
        case 'profile':
            return <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>;
        case 'addresses':
            return <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
        case 'wishlist':
            return <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>;
        case 'reviews':
            return <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.959a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.367 2.447a1 1 0 00-.364 1.118l1.286 3.959c.3.921-.755 1.688-1.539 1.118l-3.367-2.447a1 1 0 00-1.176 0l-3.367 2.447c-.783.57-1.838-.197-1.539-1.118l1.286-3.959a1 1 0 00-.364-1.118L3.056 9.4c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69l1.293-3.973z" /></svg>;
        default:
            return <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" strokeWidth={2} /></svg>;
    }
};

const UserLayout = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [currentUser, setCurrentUser] = useState(null);
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    useEffect(() => {
        try {
            const user = authService.getUser();
            if (user) setCurrentUser(user);
            else navigate('/login', { replace: true });
        } catch {
            navigate('/login', { replace: true });
        }
    }, [navigate]);

    const userInitial = useMemo(() => currentUser?.name?.charAt(0)?.toUpperCase() || 'U', [currentUser]);
    const userName = useMemo(() => currentUser?.name || 'My Account', [currentUser]);
    const userEmail = useMemo(() => currentUser?.email || '', [currentUser]);

    const isActive = useCallback((path, exact = false) => {
        if (exact) return location.pathname === path;
        return location.pathname.startsWith(path);
    }, [location.pathname]);

    const handleLogout = useCallback(async () => {
        if (isLoggingOut) return;
        setIsLoggingOut(true);
        try {
            await authService.logout();
            navigate('/login', { replace: true });
        } catch {
            navigate('/login', { replace: true });
        } finally {
            setIsLoggingOut(false);
        }
    }, [isLoggingOut, navigate]);

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Top bar */}
            <header className="fixed left-0 right-0 top-0 z-40 border-b border-slate-200 bg-white shadow-sm">
                <div className="flex items-center justify-between px-4 py-3 sm:px-6">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setIsSidebarOpen((p) => !p)}
                            className="rounded-xl border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-100"
                            aria-label="Toggle sidebar"
                        >
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                        </button>
                        <Link to="/account" className="flex items-center gap-2.5">
                            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-sm font-black text-white">
                                {userInitial}
                            </span>
                            <div className="hidden sm:block">
                                <span className="block text-[11px] font-bold uppercase tracking-widest text-blue-600">My Account</span>
                                <span className="block text-sm font-semibold text-slate-800">{userName}</span>
                            </div>
                        </Link>
                    </div>

                    <div className="flex items-center gap-2">
                        <Link to="/" className="hidden rounded-full border border-slate-200 px-4 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 sm:block">
                            ← Back to Store
                        </Link>
                        <div className="flex items-center gap-2 rounded-2xl border border-slate-200 px-3 py-2">
                            <div className="hidden text-right md:block">
                                <p className="text-xs font-semibold text-slate-700">{userName}</p>
                                <p className="text-[11px] text-slate-400">{userEmail}</p>
                            </div>
                            <button
                                onClick={handleLogout}
                                disabled={isLoggingOut}
                                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-500 disabled:opacity-40"
                                title="Logout"
                            >
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <div className="flex pt-16">
                {/* Sidebar */}
                <aside
                    className={`fixed left-0 top-16 z-30 h-[calc(100vh-4rem)] overflow-hidden bg-white shadow-lg border-r border-slate-100 transition-all duration-300 ${
                        isSidebarOpen ? 'w-64' : 'w-0'
                    }`}
                >
                    <div className="h-full overflow-y-auto px-3 py-5">
                        {/* User card */}
                        <div className="mb-5 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 p-4 text-white">
                            <div className="flex items-center gap-3">
                                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20 text-lg font-bold">
                                    {userInitial}
                                </span>
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-bold">{userName}</p>
                                    <p className="truncate text-[11px] text-blue-200">{userEmail}</p>
                                    <span className="mt-1 inline-block rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                                        Customer
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Navigation */}
                        <nav className="space-y-1">
                            <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">Account</p>
                            {USER_MENU.map((item) => {
                                const active = isActive(item.path, item.exact);
                                return (
                                    <Link
                                        key={item.path}
                                        to={item.path}
                                        className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                                            active
                                                ? 'bg-blue-600 text-white shadow-sm'
                                                : 'text-slate-600 hover:bg-blue-50 hover:text-blue-700'
                                        }`}
                                        aria-current={active ? 'page' : undefined}
                                    >
                                        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${active ? 'bg-white/20' : 'bg-slate-100'}`}>
                                            <NavGlyph name={item.key} />
                                        </span>
                                        {item.label}
                                    </Link>
                                );
                            })}
                        </nav>

                        {/* Quick links */}
                        <div className="mt-6 border-t border-slate-100 pt-4">
                            <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">Quick Links</p>
                            <Link to="/products" className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-slate-500 transition hover:bg-slate-100 hover:text-slate-700">
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
                                Shop Now
                            </Link>
                            <Link to="/cart" className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-slate-500 transition hover:bg-slate-100 hover:text-slate-700">
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13l-1.5 7h13M9 20a1 1 0 100-2 1 1 0 000 2zm8 0a1 1 0 100-2 1 1 0 000 2z" /></svg>
                                Cart
                            </Link>
                        </div>
                    </div>
                </aside>

                {/* Main */}
                <main className={`min-w-0 flex-1 transition-all duration-300 ${isSidebarOpen ? 'ml-64' : 'ml-0'}`}>
                    <div className="p-4 sm:p-6 lg:p-8">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
};

UserLayout.displayName = 'UserLayout';
export default UserLayout;
