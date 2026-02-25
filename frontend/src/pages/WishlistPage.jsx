import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import authService from '../services/authService';
import { API_CONFIG } from '../constants';
import { formatPrice, getProductDisplayPricing } from '../utils/productUtils';
import { getPrimaryProductImage, resolveImageUrl } from '../utils/imageUrl';
import notify from '../utils/notify';

const WishlistPage = () => {
    const [items, setItems] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isBusy, setIsBusy] = useState(false);

    const loadWishlist = async () => {
        try {
            setIsLoading(true);
            const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.WISHLIST}`, { headers: authService.getAuthHeaders(), credentials: 'include' });
            if (!response.ok) { setItems([]); return; }
            const data = await response.json();
            setItems(data?.data?.items || []);
        } catch { setItems([]); } finally { setIsLoading(false); }
    };

    const removeItem = async (id) => {
        try {
            setIsBusy(true);
            const res = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.WISHLIST}/${id}`, {
                method: 'DELETE',
                headers: authService.getAuthHeaders(),
                credentials: 'include',
            });
            if (!res.ok) {
                const payload = await res.json().catch(() => ({}));
                throw new Error(payload?.message || 'Failed to remove item');
            }
            notify.success('Removed from wishlist');
            window.dispatchEvent(new Event('wishlist:changed'));
            loadWishlist();
        } catch (err) {
            notify.error(err.message || 'Failed to remove item');
        } finally { setIsBusy(false); }
    };

    const moveToCart = async (id) => {
        try {
            setIsBusy(true);
            const res = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.WISHLIST}/${id}/move-to-cart`, {
                method: 'POST',
                headers: authService.getAuthHeaders(),
                credentials: 'include',
            });
            const payload = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(payload?.message || 'Failed to move to cart');
            notify.success('Item moved to cart!');
            window.dispatchEvent(new Event('wishlist:changed'));
            window.dispatchEvent(new Event('cart:changed'));
            loadWishlist();
        } catch (err) {
            notify.error(err.message || 'Failed to move to cart');
        } finally { setIsBusy(false); }
    };

    useEffect(() => { loadWishlist(); }, []);

    return (
        <div className="mx-auto max-w-5xl px-4 pb-16 sm:px-6 lg:px-8">
            <div className="mb-8">
                <p className="store-eyebrow mb-1">My Account</p>
                <h1 className="store-display text-2xl text-[#131313] sm:text-3xl">
                    My Wishlist <span className="text-base font-normal text-[#666]">({items.length} items)</span>
                </h1>
            </div>

            {isLoading ? (
                <div className="flex min-h-[300px] items-center justify-center">
                    <div className="store-surface p-10 text-center">
                        <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-[3px] border-[#d2dff9] border-t-[#f9730c]" />
                        <p className="store-display text-base text-[#212191]">Loading wishlist...</p>
                    </div>
                </div>
            ) : items.length === 0 ? (
                <div className="store-surface py-16 text-center">
                    <div className="mb-3 text-5xl">💝</div>
                    <h2 className="store-display mb-2 text-xl text-[#212191]">Your wishlist is empty</h2>
                    <p className="mb-6 text-sm text-[#666]">Save items you love and shop them later.</p>
                    <Link to="/" className="store-btn-primary tap-bounce inline-block rounded-2xl px-8 py-3 text-sm font-bold">Browse Products</Link>
                </div>
            ) : (
                <div className="space-y-3">
                    {items.map((item) => {
                        const product = item.productId;
                        if (!product) return null;
                        const pricing = getProductDisplayPricing(product);
                        const imgUrl = resolveImageUrl(getPrimaryProductImage(product));
                        const priceLabel = pricing.isRange
                            ? `${formatPrice(pricing.minPrice)} - ${formatPrice(pricing.maxPrice)}`
                            : formatPrice(pricing.finalPrice);
                        return (
                            <div key={item._id} className="store-surface p-4">
                                <div className="flex items-center gap-4">
                                    <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-slate-50 to-blue-50">
                                        <img src={imgUrl} alt={product.title} className="h-full w-full object-cover" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <Link to={`/products/${product.slug || product._id}`} className="font-semibold text-[#1f1f1f] hover:text-[#212191] line-clamp-1 transition">{product.title}</Link>
                                        <p className="mt-1 text-sm font-bold text-[#4250d5]">{priceLabel}</p>
                                        {product.brand?.title && <p className="text-xs text-[#999]">{product.brand.title}</p>}
                                    </div>
                                    <div className="flex flex-shrink-0 items-center gap-2">
                                        <button onClick={() => moveToCart(item._id)} disabled={isBusy}
                                            className="store-btn-primary tap-bounce rounded-xl px-4 py-2 text-xs font-bold disabled:opacity-40 whitespace-nowrap">
                                            Move to Cart
                                        </button>
                                        <button onClick={() => removeItem(item._id)} disabled={isBusy}
                                            className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-100 disabled:opacity-40 transition">
                                            Remove
                                        </button>
                                    </div>
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
