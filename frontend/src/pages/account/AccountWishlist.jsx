import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import authService from '../../services/authService';
import { API_CONFIG } from '../../constants';
import { getPrimaryProductImage, resolveImageUrl } from '../../utils/imageUrl';
import { formatPrice, getProductDisplayPricing } from '../../utils/productUtils';
import notify from '../../utils/notify';

const AccountWishlist = () => {
    const [items, setItems] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isBusy, setIsBusy] = useState(false);

    const load = async () => {
        try {
            setIsLoading(true);
            const res = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.WISHLIST}`, {
                headers: authService.getAuthHeaders(),
                credentials: 'include',
            });
            if (!res.ok) { setItems([]); return; }
            const data = await res.json();
            setItems(data?.data?.items || []);
        } catch {
            setItems([]);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

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
            load();
        } catch (err) {
            notify.error(err.message || 'Failed to remove item');
        } finally {
            setIsBusy(false);
        }
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
            load();
        } catch (err) {
            notify.error(err.message || 'Failed to move to cart');
        } finally {
            setIsBusy(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex min-h-[40vh] items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
            </div>
        );
    }

    return (
        <div className="space-y-5">
            <div>
                <h1 className="text-xl font-bold text-slate-800">My Wishlist</h1>
                <p className="text-sm text-slate-500">{items.length} saved item{items.length !== 1 ? 's' : ''}</p>
            </div>

            {items.length === 0 ? (
                <div className="rounded-2xl bg-white py-16 text-center shadow-sm ring-1 ring-slate-100">
                    <svg className="mx-auto mb-4 h-14 w-14 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                    <p className="text-slate-500">Your wishlist is empty.</p>
                    <Link to="/products" className="mt-3 inline-block rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700">
                        Browse Products
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {items.map((item) => {
                        const product = item.productId;
                        if (!product) return null;
                        const img = getPrimaryProductImage(product);
                        const pricing = getProductDisplayPricing ? getProductDisplayPricing(product) : null;
                        const productUrl = `/products/${product.slug || product._id}`;
                        return (
                            <div key={item._id} className="group flex flex-col rounded-2xl bg-white shadow-sm ring-1 ring-slate-100 transition hover:shadow-md">
                                <Link to={productUrl} className="block overflow-hidden rounded-t-2xl">
                                    <img
                                        src={resolveImageUrl(img)}
                                        alt={product.title}
                                        className="h-52 w-full object-cover transition group-hover:scale-105"
                                        onError={(e) => { e.target.src = '/images/placeholder.webp'; }}
                                    />
                                </Link>
                                <div className="flex flex-1 flex-col p-4">
                                    <Link to={productUrl} className="mb-1 font-semibold text-slate-800 transition hover:text-blue-600 line-clamp-2 leading-snug">
                                        {product.title}
                                    </Link>
                                    <div className="mt-auto pt-3">
                                        {pricing ? (
                                            <p className="text-base font-bold text-slate-800">
                                                {formatPrice ? formatPrice(pricing.salePrice ?? pricing.price) : `$${(pricing.salePrice ?? pricing.price ?? 0).toFixed(2)}`}
                                            </p>
                                        ) : null}
                                        <div className="mt-3 flex gap-2">
                                            <button
                                                onClick={() => moveToCart(item._id)}
                                                disabled={isBusy}
                                                className="flex-1 rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
                                            >
                                                Move to Cart
                                            </button>
                                            <button
                                                onClick={() => removeItem(item._id)}
                                                disabled={isBusy}
                                                className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-600 transition hover:bg-red-50 hover:border-red-200 hover:text-red-600 disabled:opacity-50"
                                                title="Remove"
                                            >
                                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                            </button>
                                        </div>
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

export default AccountWishlist;
