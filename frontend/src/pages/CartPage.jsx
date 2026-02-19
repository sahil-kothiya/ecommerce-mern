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
            const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.CART}`, {
                headers: authService.getAuthHeaders(),
            });
            const data = await response.json();
            if (!response.ok || !data?.success) {
                throw new Error(data?.message || 'Failed to load cart');
            }
            setCart(data.data || cart);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadCart();
         
    }, []);

    const updateQuantity = async (itemId, quantity) => {
        if (quantity < 1) return;

        try {
            setIsBusy(true);
            const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.CART}/${itemId}`, {
                method: 'PUT',
                headers: authService.getAuthHeaders(),
                body: JSON.stringify({ quantity }),
            });
            const data = await response.json();
            if (!response.ok || !data?.success) {
                throw new Error(data?.message || 'Failed to update cart');
            }
            setCart(data.data || cart);
        } catch (error) {
            notify.error(error, 'Failed to update cart');
        } finally {
            setIsBusy(false);
        }
    };

    const removeItem = async (itemId) => {
        try {
            setIsBusy(true);
            const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.CART}/${itemId}`, {
                method: 'DELETE',
                headers: authService.getAuthHeaders({}, false),
            });
            const data = await response.json();
            if (!response.ok || !data?.success) {
                throw new Error(data?.message || 'Failed to remove item');
            }
            setCart(data.data || cart);
        } catch (error) {
            notify.error(error, 'Failed to remove item');
        } finally {
            setIsBusy(false);
        }
    };

    const clearCart = async () => {
        try {
            setIsBusy(true);
            const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.CART}`, {
                method: 'DELETE',
                headers: authService.getAuthHeaders({}, false),
            });
            const data = await response.json();
            if (!response.ok || !data?.success) {
                throw new Error(data?.message || 'Failed to clear cart');
            }
            setCart(data.data || cart);
        } catch (error) {
            notify.error(error, 'Failed to clear cart');
        } finally {
            setIsBusy(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-gray-600">Loading cart...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-10">
            <div className="max-w-6xl mx-auto px-4">
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-3xl font-bold text-gray-900">Shopping Cart</h1>
                    <button
                        onClick={clearCart}
                        disabled={isBusy || !cart.items.length}
                        className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                    >
                        Clear Cart
                    </button>
                </div>

                {!cart.items.length ? (
                    <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
                        <p className="text-gray-600 mb-4">Your cart is empty.</p>
                        <Link to="/" className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                            Continue Shopping
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 space-y-4">
                            {cart.items.map((item) => (
                                <div key={item._id} className="bg-white rounded-xl border border-gray-200 p-4">
                                    <div className="flex items-start gap-4">
                                        <img
                                            src={getImageUrl(item.product?.images?.[0]?.path)}
                                            alt={item.product?.title || 'Product'}
                                            className="w-24 h-24 rounded-lg object-cover bg-gray-100"
                                        />
                                        <div className="flex-1">
                                            <p className="font-semibold text-gray-900">{item.product?.title || 'Product'}</p>
                                            <p className="text-sm text-gray-500 mt-1">Unit: ${Number(item.price || 0).toFixed(2)}</p>
                                            <p className="text-sm text-gray-500">Line total: ${Number(item.amount || 0).toFixed(2)}</p>
                                            <div className="mt-3 flex items-center gap-3">
                                                <button
                                                    onClick={() => updateQuantity(item._id, item.quantity - 1)}
                                                    disabled={isBusy || item.quantity <= 1}
                                                    className="w-8 h-8 rounded border border-gray-300 disabled:opacity-40"
                                                >
                                                    -
                                                </button>
                                                <span className="min-w-8 text-center font-semibold">{item.quantity}</span>
                                                <button
                                                    onClick={() => updateQuantity(item._id, item.quantity + 1)}
                                                    disabled={isBusy}
                                                    className="w-8 h-8 rounded border border-gray-300 disabled:opacity-40"
                                                >
                                                    +
                                                </button>
                                                <button
                                                    onClick={() => removeItem(item._id)}
                                                    disabled={isBusy}
                                                    className="ml-auto text-sm text-red-600 hover:text-red-700 disabled:opacity-40"
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="bg-white rounded-xl border border-gray-200 p-5 h-fit">
                            <h2 className="text-xl font-bold mb-4 text-gray-900">Order Summary</h2>
                            <div className="space-y-2 text-sm text-gray-700">
                                <div className="flex justify-between">
                                    <span>Items</span>
                                    <span>{cart.summary.totalItems}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Subtotal</span>
                                    <span>${Number(cart.summary.subTotal || 0).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Shipping</span>
                                    <span>${Number(cart.summary.shippingCost || 0).toFixed(2)}</span>
                                </div>
                                <div className="border-t border-gray-200 pt-2 flex justify-between font-bold text-gray-900">
                                    <span>Total</span>
                                    <span>${Number(cart.summary.totalAmount || 0).toFixed(2)}</span>
                                </div>
                            </div>
                            <button
                                onClick={() => navigate('/checkout')}
                                className="mt-5 w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-semibold"
                            >
                                Proceed to Checkout
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CartPage;
