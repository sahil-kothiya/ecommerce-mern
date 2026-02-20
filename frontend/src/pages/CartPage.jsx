import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import authService from '../services/authService';
import { API_CONFIG } from '../constants';
import notify from '../utils/notify';

const CartPage = () => {
    const navigate = useNavigate();
    const [cart, setCart] = useState({ items: [], summary: { totalItems: 0, subTotal: 0, shippingCost: 0, totalAmount: 0 } });
    const [isLoading, setIsLoading] = useState(true);
    const [isBusy, setIsBusy] = useState(false);

    const getImageUrl = (path) => {
        if (!path) return '/images/placeholder.webp';
        if (path.startsWith('http')) return path;
        if (path.startsWith('/')) return `${API_CONFIG.BASE_URL}${path}`;
        if (path.startsWith('products/')) return `${API_CONFIG.BASE_URL}/uploads/${path}`;
        return path;
    };

    const loadCart = async () => {
        try {
            setIsLoading(true);
            const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.CART}`, { headers: authService.getAuthHeaders() });
            const data = await response.json();
            if (!response.ok || !data?.success) throw new Error(data?.message || 'Failed to load cart');
            setCart(data.data || cart);
        } catch (error) { console.error(error); } finally { setIsLoading(false); }
    };

    useEffect(() => { loadCart(); }, []);

    const updateQuantity = async (itemId, quantity) => {
        if (quantity < 1) return;
        try {
            setIsBusy(true);
            const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.CART}/${itemId}`, { method: 'PUT', headers: authService.getAuthHeaders(), body: JSON.stringify({ quantity }) });
            const data = await response.json();
            if (!response.ok || !data?.success) throw new Error(data?.message || 'Failed');
            setCart(data.data || cart);
            window.dispatchEvent(new Event('cart:changed'));
        } catch (error) { notify.error(error, 'Failed to update cart'); } finally { setIsBusy(false); }
    };

    const removeItem = async (itemId) => {
        try {
            setIsBusy(true);
            const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.CART}/${itemId}`, { method: 'DELETE', headers: authService.getAuthHeaders({}, false) });
            const data = await response.json();
            if (!response.ok || !data?.success) throw new Error(data?.message || 'Failed');
            setCart(data.data || cart);
            window.dispatchEvent(new Event('cart:changed'));
        } catch (error) { notify.error(error, 'Failed to remove item'); } finally { setIsBusy(false); }
    };

    const clearCart = async () => {
        try {
            setIsBusy(true);
            const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.CART}`, { method: 'DELETE', headers: authService.getAuthHeaders({}, false) });
            const data = await response.json();
            if (!response.ok || !data?.success) throw new Error(data?.message || 'Failed');
            setCart(data.data || cart);
            window.dispatchEvent(new Event('cart:changed'));
        } catch (error) { notify.error(error, 'Failed to clear cart'); } finally { setIsBusy(false); }
    };

    if (isLoading) return (
        <div className="flex min-h-[400px] items-center justify-center">
            <div className="store-surface p-12 text-center">
                <div className="mx-auto mb-5 h-14 w-14 animate-spin rounded-full border-[3px] border-[#d2dff9] border-t-[#f9730c]" />
                <p className="store-display text-lg text-[#212191]">Loading your cart...</p>
            </div>
        </div>
    );

    const fmt = (n) => `$${Number(n || 0).toFixed(2)}`;

    return (
        <div className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 lg:px-8">
            <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
                <div>
                    <p className="store-eyebrow mb-1">My Account</p>
                    <h1 className="store-display text-2xl text-[#131313] sm:text-3xl">Shopping Cart <span className="text-base font-normal text-[#666]">({cart.items.length} items)</span></h1>
                </div>
                <button onClick={clearCart} disabled={isBusy || !cart.items.length} className="store-btn-secondary tap-bounce rounded-xl px-5 py-2.5 text-sm disabled:opacity-40">Clear Cart</button>
            </div>

            {!cart.items.length ? (
                <div className="store-surface py-16 text-center">
                    <div className="mb-3 text-5xl">🛒</div>
                    <h2 className="store-display mb-2 text-xl text-[#212191]">Your cart is empty</h2>
                    <p className="mb-6 text-sm text-[#666]">You have not added anything yet.</p>
                    <Link to="/" className="store-btn-primary tap-bounce inline-block rounded-2xl px-8 py-3 text-sm font-bold">Continue Shopping</Link>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    <div className="space-y-4 lg:col-span-2">
                        {cart.items.map((item) => (
                            <div key={item._id} className="store-surface p-4">
                                <div className="flex items-start gap-4">
                                    <div className="h-24 w-24 flex-shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-slate-50 to-blue-50">
                                        <img src={getImageUrl(item.product?.images?.[0]?.path)} alt={item.product?.title || 'Product'} className="h-full w-full object-cover" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <Link to={`/products/${item.product?._id}`} className="font-semibold text-[#1f1f1f] hover:text-[#212191] line-clamp-2 transition">{item.product?.title || 'Product'}</Link>
                                        <p className="mt-1 text-sm text-[#666]">Unit: <span className="font-semibold text-[#4250d5]">{fmt(item.price)}</span></p>
                                        <p className="text-sm text-[#444]">Line total: <span className="font-bold text-[#131313]">{fmt(item.amount)}</span></p>
                                        <div className="mt-3 flex items-center gap-2">
                                            <button onClick={() => updateQuantity(item._id, item.quantity - 1)} disabled={isBusy || item.quantity <= 1} className="flex h-8 w-8 items-center justify-center rounded-lg border border-[rgba(165,187,252,0.4)] bg-[rgba(66,80,213,0.04)] font-bold text-[#4250d5] hover:bg-[rgba(66,80,213,0.1)] disabled:opacity-40 transition">-</button>
                                            <span className="min-w-8 text-center font-semibold text-[#131313]">{item.quantity}</span>
                                            <button onClick={() => updateQuantity(item._id, item.quantity + 1)} disabled={isBusy} className="flex h-8 w-8 items-center justify-center rounded-lg border border-[rgba(165,187,252,0.4)] bg-[rgba(66,80,213,0.04)] font-bold text-[#4250d5] hover:bg-[rgba(66,80,213,0.1)] disabled:opacity-40 transition">+</button>
                                            <button onClick={() => removeItem(item._id)} disabled={isBusy} className="ml-auto rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-100 disabled:opacity-40 transition">Remove</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="store-surface h-fit p-6">
                        <h2 className="store-display mb-5 text-lg text-[#131313]">Order Summary</h2>
                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between text-[#555]"><span>Items</span><span className="font-semibold">{cart.summary.totalItems}</span></div>
                            <div className="flex justify-between text-[#555]"><span>Subtotal</span><span className="font-semibold">{fmt(cart.summary.subTotal)}</span></div>
                            <div className="flex justify-between text-[#555]"><span>Shipping</span><span className="font-semibold">{fmt(cart.summary.shippingCost)}</span></div>
                            <div className="flex justify-between border-t border-[rgba(165,187,252,0.25)] pt-3 text-base font-bold text-[#131313]"><span>Total</span><span>{fmt(cart.summary.totalAmount)}</span></div>
                        </div>
                        <button onClick={() => navigate('/checkout')} className="store-btn-primary tap-bounce mt-5 w-full rounded-2xl py-3.5 text-sm font-bold">Proceed to Checkout</button>
                        <Link to="/" className="store-btn-secondary tap-bounce mt-3 block w-full rounded-2xl py-3 text-center text-sm font-semibold">Continue Shopping</Link>
                        <div className="mt-4 flex items-center justify-center gap-2 text-xs text-[#666]"><span>🔒</span><span>Secure SSL encrypted checkout</span></div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CartPage;
