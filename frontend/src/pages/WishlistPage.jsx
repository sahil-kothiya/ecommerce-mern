import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import authService from '../services/authService';
import { API_CONFIG } from '../constants';
import { formatPrice } from '../utils/productUtils';
import StoreNav from '../components/common/StoreNav';

const WishlistPage = () => {
    const [items, setItems] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const loadWishlist = async () => {
        try {
            setIsLoading(true);
            const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.WISHLIST}`, {
                headers: authService.getAuthHeaders(),
            });

            if (!response.ok) {
                setItems([]);
                return;
            }

            const data = await response.json();
            setItems(data?.data?.items || []);
        } catch {
            setItems([]);
        } finally {
            setIsLoading(false);
        }
    };

    const removeItem = async (id) => {
        await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.WISHLIST}/${id}`, {
            method: 'DELETE',
            headers: authService.getAuthHeaders(),
        });
        window.dispatchEvent(new Event('wishlist:changed'));
        loadWishlist();
    };

    const moveToCart = async (id) => {
        await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.WISHLIST}/${id}/move-to-cart`, {
            method: 'POST',
            headers: authService.getAuthHeaders(),
        });
        window.dispatchEvent(new Event('wishlist:changed'));
        loadWishlist();
    };

    useEffect(() => {
        loadWishlist();
    }, []);

    return (
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
            <h1 className="text-2xl font-bold text-slate-900">Wishlist</h1>
            <StoreNav />

            {isLoading ? (
                <p className="mt-4 text-slate-500">Loading wishlist...</p>
            ) : items.length === 0 ? (
                <p className="mt-4 text-slate-500">Your wishlist is empty.</p>
            ) : (
                <div className="mt-6 space-y-3">
                    {items.map((item) => {
                        const product = item.productId;
                        if (!product) return null;

                        return (
                            <div key={item._id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4">
                                <div>
                                    <Link to={`/products/${product.slug || product._id}`} className="font-semibold text-slate-900 hover:text-cyan-700">
                                        {product.title}
                                    </Link>
                                    <p className="text-sm text-slate-600">{formatPrice(product.basePrice || 0)}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => moveToCart(item._id)}
                                        className="rounded-lg bg-cyan-50 px-3 py-2 text-sm font-medium text-cyan-700 hover:bg-cyan-100"
                                    >
                                        Move to Cart
                                    </button>
                                    <button
                                        onClick={() => removeItem(item._id)}
                                        className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 hover:bg-rose-100"
                                    >
                                        Remove
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default WishlistPage;
