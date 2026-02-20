import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { API_CONFIG } from '../../constants';
import authService from '../../services/authService';
import useWishlistCount from '../../hooks/useWishlistCount';

const BRAND_NAME = 'Enterprise Commerce';
const TOPBAR_MSG = '🚚 Free shipping on orders over $50  ·  ✨ 30-day easy returns  ·  🔒 Secure checkout';

const useCartCount = () => {
    const [count, setCount] = useState(0);

    const refresh = useCallback(async () => {
        if (!authService.isAuthenticated()) { setCount(0); return; }
        try {
            const res = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.CART}`, {
                headers: authService.getAuthHeaders(),
                credentials: 'include',
            });
            if (!res.ok) { setCount(0); return; }
            const data = await res.json();
            const items = Array.isArray(data?.data?.items) ? data.data.items : [];
            setCount(items.reduce((s, i) => s + (i.quantity || 1), 0));
        } catch { setCount(0); }
    }, []);

    useEffect(() => {
        refresh();
        const onChange = () => refresh();
        window.addEventListener('cart:changed', onChange);
        window.addEventListener('focus', onChange);
        return () => { window.removeEventListener('cart:changed', onChange); window.removeEventListener('focus', onChange); };
    }, [refresh]);

    return { count, refresh };
};

const StoreHeader = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { count: wishlistCount } = useWishlistCount();
    const { count: cartCount } = useCartCount();

    const [categories, setCategories] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const isAuthenticated = authService.isAuthenticated();
    const userMenuRef = useRef(null);

    useEffect(() => {
        if (isAuthenticated) {
            try { setCurrentUser(authService.getUser()); } catch { /* ignore */ }
        }
    }, [isAuthenticated]);

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const res = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.CATEGORIES}?limit=8`);
                if (!res.ok) return;
                const data = await res.json();
                const cats = Array.isArray(data?.data) ? data.data : (data?.data?.categories || []);
                setCategories(cats.slice(0, 7));
            } catch { /* silent */ }
        };
        fetchCategories();
    }, []);

    useEffect(() => {
        const handleOutsideClick = (e) => {
            if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
                setIsUserMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleOutsideClick);
        return () => document.removeEventListener('mousedown', handleOutsideClick);
    }, []);

    // Close mobile menu on route change
    useEffect(() => { setIsMobileMenuOpen(false); setIsUserMenuOpen(false); }, [location.pathname]);

    const handleSearch = (e) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
            setSearchQuery('');
        }
    };

    const handleLogout = async () => {
        try { await authService.logout(); } catch { /* ignore */ }
        setCurrentUser(null);
        navigate('/login', { replace: true });
    };

    const userInitial = currentUser?.name?.charAt(0)?.toUpperCase() || 'U';

    return (
        <header className="store-header fixed left-0 right-0 top-0 z-50">
            {/* Top announcement bar */}
            <div className="hidden sm:flex items-center justify-center bg-gradient-to-r from-[#0a2156] via-[#212191] to-[#0a2156] py-1.5 text-xs font-semibold tracking-wide text-[#d2dff9]">
                {TOPBAR_MSG}
            </div>

            {/* Main header */}
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="flex items-center gap-4 py-3">
                    {/* Brand */}
                    <Link to="/" className="flex items-center gap-3 flex-shrink-0">
                        <span className="store-brand-mark flex h-10 w-10 items-center justify-center rounded-xl text-sm font-black text-white">EC</span>
                        <span className="hidden sm:block">
                            <span className="store-eyebrow block">Creator Store</span>
                            <span className="store-display block text-[15px] text-[#131313]">{BRAND_NAME}</span>
                        </span>
                    </Link>

                    {/* Search */}
                    <form onSubmit={handleSearch} className="flex-1 max-w-xl mx-auto hidden md:block">
                        <div className="relative">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onFocus={() => setIsSearchFocused(true)}
                                onBlur={() => setIsSearchFocused(false)}
                                placeholder="Search products, brands, categories…"
                                className={`store-input w-full py-2.5 pl-10 pr-4 text-sm transition-all ${isSearchFocused ? 'shadow-[0_0_0_3px_rgba(165,187,252,0.3)]' : ''}`}
                            />
                            <button type="submit" className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4250d5]">
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </button>
                        </div>
                    </form>

                    {/* Right actions */}
                    <div className="flex items-center gap-1 sm:gap-2 ml-auto md:ml-0">
                        {/* Wishlist */}
                        <Link
                            to={isAuthenticated ? '/wishlist' : '/login'}
                            className="relative glass-panel hover-glow tap-bounce flex h-9 w-9 items-center justify-center rounded-xl text-[#4250d5] transition"
                            title="Wishlist"
                        >
                            <svg className="h-4.5 w-4.5 h-[18px] w-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                            </svg>
                            {wishlistCount > 0 && <span className="store-badge">{wishlistCount}</span>}
                        </Link>

                        {/* Cart */}
                        <Link
                            to={isAuthenticated ? '/cart' : '/login'}
                            className="relative glass-panel hover-glow tap-bounce flex h-9 w-9 items-center justify-center rounded-xl text-[#4250d5] transition"
                            title="Cart"
                        >
                            <svg className="h-[18px] w-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m1.6 8L5.4 5M7 13l-1.5 7h13M9 20a1 1 0 100-2 1 1 0 000 2zm8 0a1 1 0 100-2 1 1 0 000 2z" />
                            </svg>
                            {cartCount > 0 && <span className="store-badge">{cartCount}</span>}
                        </Link>

                        {/* User menu */}
                        <div className="relative" ref={userMenuRef}>
                            {isAuthenticated ? (
                                <>
                                    <button
                                        onClick={() => setIsUserMenuOpen((p) => !p)}
                                        className="glass-panel hover-glow tap-bounce flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-[#212191] transition"
                                    >
                                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-[#4250d5] via-[#6a88e2] to-[#ffa336] text-xs font-bold text-white">
                                            {userInitial}
                                        </span>
                                        <span className="hidden sm:block text-[#131313]">{currentUser?.name?.split(' ')[0] || 'Account'}</span>
                                        <svg className={`h-3 w-3 transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </button>
                                    {isUserMenuOpen && (
                                        <div className="absolute right-0 top-full mt-2 w-48 store-surface z-50 py-1">
                                            <Link to="/account" className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-[#1f1f1f] hover:bg-[rgba(165,187,252,0.12)] transition-colors rounded-lg mx-1">
                                                <svg className="h-4 w-4 text-[#4250d5]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                                My Account
                                            </Link>
                                            <Link to="/cart" className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-[#1f1f1f] hover:bg-[rgba(165,187,252,0.12)] transition-colors rounded-lg mx-1">
                                                <svg className="h-4 w-4 text-[#4250d5]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m1.6 8L5.4 5M7 13l-1.5 7h13" /></svg>
                                                My Cart
                                            </Link>
                                            <Link to="/wishlist" className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-[#1f1f1f] hover:bg-[rgba(165,187,252,0.12)] transition-colors rounded-lg mx-1">
                                                <svg className="h-4 w-4 text-[#4250d5]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                                                Wishlist
                                            </Link>
                                            <hr className="my-1 border-[rgba(165,187,252,0.3)]" />
                                            <button
                                                onClick={handleLogout}
                                                className="flex w-full items-center gap-2 px-4 py-2.5 text-sm font-medium text-rose-600 hover:bg-rose-50 transition-colors rounded-lg mx-1"
                                            >
                                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                                                Sign Out
                                            </button>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <Link
                                    to="/login"
                                    className="store-btn-primary tap-bounce inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm"
                                >
                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" /></svg>
                                    Sign In
                                </Link>
                            )}
                        </div>

                        {/* Mobile menu toggle */}
                        <button
                            onClick={() => setIsMobileMenuOpen((p) => !p)}
                            className="glass-panel tap-bounce flex h-9 w-9 items-center justify-center rounded-xl text-[#4250d5] transition md:hidden"
                        >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isMobileMenuOpen ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'} />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Category nav */}
                <nav className="hidden md:flex items-center gap-1 pb-3 overflow-x-auto scrollbar-hide">
                    <Link
                        to="/products"
                        className={`store-nav-link whitespace-nowrap text-sm ${location.pathname === '/products' && !location.search.includes('category') ? 'active' : ''}`}
                    >
                        All Products
                    </Link>
                    {categories.map((cat) => (
                        <Link
                            key={cat._id || cat.slug}
                            to={`/products?category=${cat.slug}`}
                            className={`store-nav-link whitespace-nowrap text-sm ${location.search.includes(`category=${cat.slug}`) ? 'active' : ''}`}
                        >
                            {cat.title}
                        </Link>
                    ))}
                    <Link to="/products?sort=popular" className="store-nav-link whitespace-nowrap text-sm text-[#f9730c] border-[rgba(249,115,12,0.25)]">
                        🔥 Featured
                    </Link>
                </nav>
            </div>

            {/* Mobile panel */}
            {isMobileMenuOpen && (
                <div className="store-surface mx-4 mb-2 rounded-2xl px-4 py-4 md:hidden animate-slideInRight">
                    {/* Mobile search */}
                    <form onSubmit={handleSearch} className="mb-4">
                        <div className="relative">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search products…"
                                className="store-input w-full py-2.5 pl-10 pr-4 text-sm"
                            />
                            <button type="submit" className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4250d5]">
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                            </button>
                        </div>
                    </form>
                    {/* Mobile nav links */}
                    <div className="flex flex-wrap gap-2">
                        <Link to="/" className="store-category-chip px-3 py-1.5 text-sm">Home</Link>
                        <Link to="/products" className="store-category-chip px-3 py-1.5 text-sm">All Products</Link>
                        {categories.map((cat) => (
                            <Link key={cat._id || cat.slug} to={`/products?category=${cat.slug}`} className="store-category-chip px-3 py-1.5 text-sm">
                                {cat.title}
                            </Link>
                        ))}
                    </div>
                </div>
            )}
        </header>
    );
};

export default StoreHeader;
