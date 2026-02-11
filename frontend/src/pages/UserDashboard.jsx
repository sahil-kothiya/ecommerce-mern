import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import authService from '../services/authService';
import { API_CONFIG } from '../constants';

const UserDashboard = () => {
    const [user, setUser] = useState(null);
    const [orders, setOrders] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadUserData();
        loadOrders();
    }, []);

    const loadUserData = () => {
        const userData = authService.getUser();
        setUser(userData);
    };

    const loadOrders = async () => {
        try {
            setIsLoading(true);
            const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.ORDERS}`, {
                headers: authService.getAuthHeaders()
            });
            if (response.ok) {
                const data = await response.json();
                setOrders(Array.isArray(data?.data) ? data.data : []);
            }
        } catch (error) {
            console.error('Error loading orders:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleLogout = async () => {
        try {
            await authService.logout();
            window.location.href = '/login';
        } catch (error) {
            console.error('Logout failed:', error);
            window.location.href = '/login';
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between">
                        <Link to="/" className="text-2xl font-bold text-blue-600">
                            E-Shop Pro
                        </Link>
                        <div className="flex items-center gap-4">
                            <span className="text-gray-700">Welcome, {user?.name}</span>
                            <button
                                onClick={handleLogout}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                            >
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Sidebar */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-xl shadow-sm p-6">
                            <div className="text-center mb-6">
                                <div className="w-24 h-24 bg-blue-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                                    <span className="text-3xl font-bold text-blue-600">
                                        {user?.name?.charAt(0).toUpperCase()}
                                    </span>
                                </div>
                                <h2 className="text-xl font-bold text-gray-900">{user?.name}</h2>
                                <p className="text-gray-600">{user?.email}</p>
                                <span className="inline-block mt-2 px-3 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">
                                    {user?.role}
                                </span>
                            </div>

                            <nav className="space-y-2">
                                <a href="#orders" className="block px-4 py-2 text-gray-700 hover:bg-blue-50 rounded-lg transition-colors">
                                    📦 My Orders
                                </a>
                                <a href="#profile" className="block px-4 py-2 text-gray-700 hover:bg-blue-50 rounded-lg transition-colors">
                                    👤 Profile Details
                                </a>
                                <Link to="/wishlist" className="block px-4 py-2 text-gray-700 hover:bg-blue-50 rounded-lg transition-colors">
                                    ❤️ Wishlist
                                </Link>
                                <Link to="/" className="block px-4 py-2 text-gray-700 hover:bg-blue-50 rounded-lg transition-colors">
                                    🏠 Back to Shop
                                </Link>
                            </nav>
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Orders Section */}
                        <div id="orders" className="bg-white rounded-xl shadow-sm p-6">
                            <h3 className="text-2xl font-bold text-gray-900 mb-6">My Orders</h3>
                            
                            {isLoading ? (
                                <div className="text-center py-8">
                                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                                </div>
                            ) : orders.length === 0 ? (
                                <div className="text-center py-12">
                                    <div className="text-gray-400 text-6xl mb-4">📦</div>
                                    <p className="text-gray-600 mb-4">No orders yet</p>
                                    <Link to="/" className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                                        Start Shopping
                                    </Link>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {orders.map((order) => (
                                        <div key={order._id} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <p className="font-semibold text-gray-900">Order #{order._id.slice(-8)}</p>
                                                    <p className="text-sm text-gray-600">
                                                        {new Date(order.createdAt).toLocaleDateString()}
                                                    </p>
                                                </div>
                                                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                                    order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                                                    order.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                                                    order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                                    'bg-gray-100 text-gray-800'
                                                }`}>
                                                    {order.status}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <p className="text-gray-600">{order.items?.length || 0} items</p>
                                                <p className="text-lg font-bold text-gray-900">${order.total?.toFixed(2)}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Profile Section */}
                        <div id="profile" className="bg-white rounded-xl shadow-sm p-6">
                            <h3 className="text-2xl font-bold text-gray-900 mb-6">Profile Details</h3>
                            
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1">Full Name</label>
                                        <p className="text-gray-900">{user?.name}</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1">Email</label>
                                        <p className="text-gray-900">{user?.email}</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1">Account Type</label>
                                        <p className="text-gray-900 capitalize">{user?.role}</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1">Member Since</label>
                                        <p className="text-gray-900">January 2026</p>
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-gray-200">
                                    <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                                        Edit Profile
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UserDashboard;
