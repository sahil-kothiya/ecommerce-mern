import { Link } from 'react-router-dom';
import authService from '../../services/authService';
import useWishlistCount from '../../hooks/useWishlistCount';

const StoreNav = () => {
    const { count } = useWishlistCount();
    const isAuthenticated = authService.isAuthenticated();

    return (
        <nav className="flex flex-wrap items-center gap-3">
            <Link to="/" className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200">
                Home
            </Link>
            <Link to="/products" className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200">
                Products
            </Link>
            <Link to={isAuthenticated ? '/wishlist' : '/login'} className="relative rounded-lg bg-slate-100 px-3 py-2 pr-8 text-sm font-medium text-slate-700 hover:bg-slate-200">
                Wishlist
                {count > 0 && (
                    <span className="absolute -right-2 -top-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-600 px-1 text-xs font-semibold text-white">
                        {count}
                    </span>
                )}
            </Link>
            <Link to={isAuthenticated ? '/cart' : '/login'} className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200">
                Cart
            </Link>
            <Link to={isAuthenticated ? '/account' : '/login'} className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200">
                Account
            </Link>
        </nav>
    );
};

export default StoreNav;
