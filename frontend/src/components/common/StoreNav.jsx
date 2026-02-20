import { Link } from 'react-router-dom';
import authService from '../../services/authService';
import useWishlistCount from '../../hooks/useWishlistCount';

const StoreNav = () => {
    const { count } = useWishlistCount();
    const isAuthenticated = authService.isAuthenticated();

    return (
        <nav className="glass-panel interactive-card inline-flex flex-wrap items-center gap-2 rounded-2xl p-2">
            <Link to="/" className="btn-neo tap-bounce nav-pill hover-glow rounded-xl border border-transparent px-3 py-2 text-sm font-semibold shadow-sm hover:shadow-md">
                Home
            </Link>
            <Link to="/products" className="btn-neo-outline tap-bounce nav-pill px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">
                Products
            </Link>
            <Link to={isAuthenticated ? '/wishlist' : '/login'} className="btn-neo-outline tap-bounce nav-pill relative px-3 py-2 pr-8 text-sm font-medium text-slate-700 hover:bg-slate-100">
                Wishlist
                {count > 0 && (
                    <span className="animate-pulseRing absolute -right-2 -top-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-gradient-to-r from-rose-500 to-fuchsia-500 px-1 text-xs font-semibold text-white shadow-sm">
                        {count}
                    </span>
                )}
            </Link>
            <Link to={isAuthenticated ? '/cart' : '/login'} className="btn-neo-outline tap-bounce nav-pill px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">
                Cart
            </Link>
            <Link to={isAuthenticated ? '/account' : '/login'} className="btn-neo-outline tap-bounce nav-pill px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">
                Account
            </Link>
        </nav>
    );
};

export default StoreNav;
