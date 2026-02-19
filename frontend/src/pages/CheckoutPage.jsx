import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import authService from '../services/authService';
import { API_CONFIG } from '../constants';
import notify from '../utils/notify';

const initialForm = {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address1: '',
    address2: '',
    city: '',
    state: '',
    postCode: '',
    country: 'USA',
    paymentMethod: 'cod',
    notes: '',
};

const CheckoutPage = () => {
    const navigate = useNavigate();
    const [cart, setCart] = useState({ items: [], summary: { totalItems: 0, subTotal: 0, shippingCost: 0, totalAmount: 0 } });
    const [form, setForm] = useState(initialForm);
    const [errors, setErrors] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const [isPlacingOrder, setIsPlacingOrder] = useState(false);

    useEffect(() => {
        const user = authService.getUser();
        setForm((prev) => ({
            ...prev,
            firstName: user?.name?.split(' ')?.[0] || '',
            lastName: user?.name?.split(' ')?.slice(1).join(' ') || '',
            email: user?.email || '',
        }));
    }, []);

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
            notify.error(error, 'Failed to load cart');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadCart();
         
    }, []);

    const onChange = (event) => {
        const { name, value } = event.target;
        setForm((prev) => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors((prev) => ({ ...prev, [name]: null }));
        }
    };

    const getInputClasses = (field) => `w-full rounded-lg border px-3 py-2 ${
        errors[field] ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : 'border-gray-300'
    }`;

    const validateForm = () => {
        const nextErrors = {};
        if (!form.firstName.trim()) nextErrors.firstName = 'First name is required';
        if (!form.lastName.trim()) nextErrors.lastName = 'Last name is required';
        if (!form.email.trim()) nextErrors.email = 'Email is required';
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) nextErrors.email = 'Enter a valid email';
        if (!form.phone.trim()) nextErrors.phone = 'Phone is required';
        else if (!/^[\d\s()+-]{10,}$/.test(form.phone.trim())) nextErrors.phone = 'Enter a valid phone number';
        if (!form.address1.trim()) nextErrors.address1 = 'Address is required';
        if (!form.city.trim()) nextErrors.city = 'City is required';
        if (!form.postCode.trim()) nextErrors.postCode = 'Post code is required';
        if (!form.country.trim()) nextErrors.country = 'Country is required';

        setErrors(nextErrors);
        return Object.keys(nextErrors).length === 0;
    };

    const placeOrder = async (event) => {
        event.preventDefault();
        if (!validateForm()) {
            notify.error('Please fix form errors');
            return;
        }
        try {
            setIsPlacingOrder(true);
            const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.ORDERS}`, {
                method: 'POST',
                headers: authService.getAuthHeaders(),
                body: JSON.stringify(form),
            });
            const data = await response.json();
            if (!response.ok || !data?.success) {
                throw new Error(data?.message || 'Failed to place order');
            }
            notify.success(`Order placed successfully. Order #${data?.data?.orderNumber || ''}`);
            navigate('/dashboard');
        } catch (error) {
            notify.error(error, 'Failed to place order');
        } finally {
            setIsPlacingOrder(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-gray-600">Loading checkout...</div>
            </div>
        );
    }

    if (!cart.items.length) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
                    <p className="text-gray-700 mb-4">Your cart is empty.</p>
                    <button
                        onClick={() => navigate('/cart')}
                        className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                        Go to Cart
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-10">
            <div className="max-w-6xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-3 gap-6">
                <form onSubmit={placeOrder} className="lg:col-span-2 bg-white border border-gray-200 rounded-xl p-6 space-y-4">
                    <h1 className="text-2xl font-bold text-gray-900">Checkout</h1>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <input name="firstName" value={form.firstName} onChange={onChange} required placeholder="First Name" className={getInputClasses('firstName')} />
                            {errors.firstName && <p className="mt-1 text-sm text-red-600">{errors.firstName}</p>}
                        </div>
                        <div>
                            <input name="lastName" value={form.lastName} onChange={onChange} required placeholder="Last Name" className={getInputClasses('lastName')} />
                            {errors.lastName && <p className="mt-1 text-sm text-red-600">{errors.lastName}</p>}
                        </div>
                        <div>
                            <input name="email" type="email" value={form.email} onChange={onChange} required placeholder="Email" className={getInputClasses('email')} />
                            {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
                        </div>
                        <div>
                            <input name="phone" value={form.phone} onChange={onChange} required placeholder="Phone" className={getInputClasses('phone')} />
                            {errors.phone && <p className="mt-1 text-sm text-red-600">{errors.phone}</p>}
                        </div>
                    </div>

                    <div>
                        <input name="address1" value={form.address1} onChange={onChange} required placeholder="Address Line 1" className={getInputClasses('address1')} />
                        {errors.address1 && <p className="mt-1 text-sm text-red-600">{errors.address1}</p>}
                    </div>
                    <input name="address2" value={form.address2} onChange={onChange} placeholder="Address Line 2 (Optional)" className={getInputClasses('address2')} />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <input name="city" value={form.city} onChange={onChange} required placeholder="City" className={getInputClasses('city')} />
                            {errors.city && <p className="mt-1 text-sm text-red-600">{errors.city}</p>}
                        </div>
                        <input name="state" value={form.state} onChange={onChange} placeholder="State" className={getInputClasses('state')} />
                        <div>
                            <input name="postCode" value={form.postCode} onChange={onChange} required placeholder="Post Code" className={getInputClasses('postCode')} />
                            {errors.postCode && <p className="mt-1 text-sm text-red-600">{errors.postCode}</p>}
                        </div>
                        <div>
                            <input name="country" value={form.country} onChange={onChange} required placeholder="Country" className={getInputClasses('country')} />
                            {errors.country && <p className="mt-1 text-sm text-red-600">{errors.country}</p>}
                        </div>
                    </div>

                    <select
                        name="paymentMethod"
                        value={form.paymentMethod}
                        onChange={onChange}
                        className={getInputClasses('paymentMethod')}
                    >
                        <option value="cod">Cash on Delivery</option>
                        <option value="stripe">Stripe</option>
                        <option value="paypal">PayPal</option>
                    </select>

                    <textarea
                        name="notes"
                        value={form.notes}
                        onChange={onChange}
                        rows={3}
                        placeholder="Order notes (optional)"
                        className={getInputClasses('notes')}
                    />

                    <button
                        type="submit"
                        disabled={isPlacingOrder}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-semibold disabled:opacity-60"
                    >
                        {isPlacingOrder ? 'Placing Order...' : 'Place Order'}
                    </button>
                </form>

                <div className="bg-white border border-gray-200 rounded-xl p-5 h-fit">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Order Summary</h2>
                    <div className="space-y-2 text-sm text-gray-700">
                        {cart.items.map((item) => (
                            <div key={item._id} className="flex justify-between gap-2">
                                <span className="truncate">{item.product?.title} x {item.quantity}</span>
                                <span>${Number(item.amount || 0).toFixed(2)}</span>
                            </div>
                        ))}
                        <div className="border-t border-gray-200 pt-2 flex justify-between">
                            <span>Subtotal</span>
                            <span>${Number(cart.summary.subTotal || 0).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Shipping</span>
                            <span>${Number(cart.summary.shippingCost || 0).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between font-bold text-gray-900">
                            <span>Total</span>
                            <span>${Number(cart.summary.totalAmount || 0).toFixed(2)}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CheckoutPage;
