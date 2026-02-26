import { Link } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import authService from '../../services/authService';
import useWishlistCount from '../../hooks/useWishlistCount';

const StoreNav = () => {
    const location = useLocation();
    const { count } = useWishlistCount();
    const isAuthenticated = authService.isAuthenticated();

    const isActiveRoute = (route) => {
        if (route === '/') return location.pathname === '/';
        return location.pathname.startsWith(route);
    };

    const navClass = (active) =>
        `${active ? 'btn-neo border-transparent shadow-sm' : 'btn-neo-outline border-transparent text-slate-700 hover:bg-slate-100'} tap-bounce nav-pill rounded-lg px-2 py-1 text-sm lg:text-xs font-medium`;

    return (
        <nav className="glass-panel interactive-card flex w-full flex-wrap items-center gap-1.5 rounded-xl p-1.5">
            <Link to="/" className={navClass(isActiveRoute('/'))}>
                Home
            </Link>
            <Link to="/products" className={navClass(isActiveRoute('/products'))}>
                Products
            </Link>
            <Link to={isAuthenticated ? '/wishlist' : '/login'} className={`${navClass(isActiveRoute('/wishlist'))} relative pr-8`}>
                Wishlist
                {count > 0 && (
                    <span className="animate-pulseRing absolute -right-2 -top-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-gradient-to-r from-rose-500 to-fuchsia-500 px-1 text-xs font-semibold text-white shadow-sm">
                        {count}
                    </span>
                )}
            </Link>
            <Link to={isAuthenticated ? '/cart' : '/login'} className={navClass(isActiveRoute('/cart'))}>
                Cart
            </Link>
            <Link to={isAuthenticated ? '/account' : '/login'} className={navClass(isActiveRoute('/account'))}>
                Account
            </Link>
        </nav>
    );
};

export default StoreNav;
