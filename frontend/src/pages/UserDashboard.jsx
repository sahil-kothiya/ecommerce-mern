import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import authService from '../services/authService';
import { API_CONFIG } from '../constants';
import StoreNav from '../components/common/StoreNav';

const defaultAddressForm = {
    label: '',
    firstName: '',
    lastName: '',
    phone: '',
    address1: '',
    address2: '',
    city: '',
    state: '',
    postCode: '',
    country: '',
    isDefault: false,
};

const UserDashboard = () => {
    const [activeTab, setActiveTab] = useState('orders');
    const [user, setUser] = useState(null);
    const [orders, setOrders] = useState([]);
    const [returns, setReturns] = useState([]);
    const [addresses, setAddresses] = useState([]);
    const [profileForm, setProfileForm] = useState({ name: '', email: '', phone: '' });
    const [addressForm, setAddressForm] = useState(defaultAddressForm);
    const [editingAddressId, setEditingAddressId] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSavingProfile, setIsSavingProfile] = useState(false);
    const [isSavingAddress, setIsSavingAddress] = useState(false);
    const [actionOrderId, setActionOrderId] = useState(null);
    const [message, setMessage] = useState('');

    const authHeaders = useMemo(() => authService.getAuthHeaders(), []);

    const loadProfile = async () => {
        const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.AUTH}/me`, {
            headers: authHeaders,
        });
        if (!response.ok) {
            throw new Error('Failed to load profile');
        }

        const payload = await response.json();
        const profile = payload?.data?.user || null;
        setUser(profile);
        setProfileForm({
            name: profile?.name || '',
            email: profile?.email || '',
            phone: profile?.phone || '',
        });
        setAddresses(Array.isArray(profile?.addresses) ? profile.addresses : []);
    };

    const loadOrders = async () => {
        const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.ORDERS}`, {
            headers: authHeaders,
        });
        if (!response.ok) {
            throw new Error('Failed to load orders');
        }

        const payload = await response.json();
        setOrders(Array.isArray(payload?.data?.orders) ? payload.data.orders : []);
    };

    const loadReturns = async () => {
        const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.ORDERS}/returns`, {
            headers: authHeaders,
        });
        if (!response.ok) {
            throw new Error('Failed to load returns');
        }

        const payload = await response.json();
        setReturns(Array.isArray(payload?.data?.returnRequests) ? payload.data.returnRequests : []);
    };

    const loadDashboard = async () => {
        try {
            setIsLoading(true);
            await Promise.all([loadProfile(), loadOrders(), loadReturns()]);
        } catch (error) {
            setMessage(error.message || 'Failed to load account dashboard');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadDashboard();
         
    }, []);

    const handleLogout = async () => {
        try {
            await authService.logout();
            window.location.href = '/login';
        } catch {
            window.location.href = '/login';
        }
    };

    const handleProfileSave = async (event) => {
        event.preventDefault();
        try {
            setIsSavingProfile(true);
            setMessage('');

            const trimmedName = profileForm.name.trim();
            const trimmedEmail = profileForm.email.trim();
            const trimmedPhone = profileForm.phone.trim();

            if (!trimmedName) {
                throw new Error('Full name is required');
            }

            const emailPattern = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,})+$/;
            if (!emailPattern.test(trimmedEmail)) {
                throw new Error('Please provide a valid email address');
            }

            if (trimmedPhone && trimmedPhone.length < 7) {
                throw new Error('Mobile number must be at least 7 characters');
            }

            const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.AUTH}/profile`, {
                method: 'PUT',
                headers: authHeaders,
                body: JSON.stringify({
                    name: trimmedName,
                    email: trimmedEmail,
                    phone: trimmedPhone,
                }),
            });

            const payload = await response.json();
            if (!response.ok) {
                throw new Error(payload?.message || 'Failed to update profile');
            }

            const updatedUser = payload?.data?.user || user;
            setUser(updatedUser);
            authService.setUser(updatedUser);
            setProfileForm({
                name: updatedUser?.name || '',
                email: updatedUser?.email || '',
                phone: updatedUser?.phone || '',
            });
            setMessage('Profile updated successfully');
        } catch (error) {
            setMessage(error.message || 'Failed to update profile');
        } finally {
            setIsSavingProfile(false);
        }
    };

    const resetAddressEditor = () => {
        setEditingAddressId(null);
        setAddressForm(defaultAddressForm);
    };

    const handleAddressSubmit = async (event) => {
        event.preventDefault();
        try {
            setIsSavingAddress(true);
            setMessage('');

            const url = editingAddressId
                ? `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.AUTH}/addresses/${editingAddressId}`
                : `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.AUTH}/addresses`;
            const method = editingAddressId ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: authHeaders,
                body: JSON.stringify(addressForm),
            });
            const payload = await response.json();
            if (!response.ok) {
                throw new Error(payload?.message || 'Failed to save address');
            }

            const nextAddresses = payload?.data?.addresses || [];
            setAddresses(nextAddresses);
            setUser((prev) => ({ ...(prev || {}), addresses: nextAddresses }));
            setMessage(editingAddressId ? 'Address updated successfully' : 'Address added successfully');
            resetAddressEditor();
        } catch (error) {
            setMessage(error.message || 'Failed to save address');
        } finally {
            setIsSavingAddress(false);
        }
    };

    const handleAddressEdit = (address) => {
        setEditingAddressId(address._id);
        setAddressForm({
            label: address.label || '',
            firstName: address.firstName || '',
            lastName: address.lastName || '',
            phone: address.phone || '',
            address1: address.address1 || '',
            address2: address.address2 || '',
            city: address.city || '',
            state: address.state || '',
            postCode: address.postCode || '',
            country: address.country || '',
            isDefault: Boolean(address.isDefault),
        });
        setActiveTab('addresses');
    };

    const handleAddressDelete = async (addressId) => {
        try {
            setMessage('');
            const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.AUTH}/addresses/${addressId}`, {
                method: 'DELETE',
                headers: authHeaders,
            });
            const payload = await response.json();
            if (!response.ok) {
                throw new Error(payload?.message || 'Failed to delete address');
            }

            const nextAddresses = payload?.data?.addresses || [];
            setAddresses(nextAddresses);
            setUser((prev) => ({ ...(prev || {}), addresses: nextAddresses }));
            setMessage('Address deleted successfully');
            if (editingAddressId === addressId) {
                resetAddressEditor();
            }
        } catch (error) {
            setMessage(error.message || 'Failed to delete address');
        }
    };

    const handleReorder = async (orderId) => {
        try {
            setActionOrderId(orderId);
            setMessage('');
            const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.ORDERS}/${orderId}/reorder`, {
                method: 'POST',
                headers: authHeaders,
            });
            const payload = await response.json();
            if (!response.ok) {
                throw new Error(payload?.message || 'Failed to reorder');
            }

            const addedCount = payload?.data?.addedItems?.length || 0;
            const skippedCount = payload?.data?.skippedItems?.length || 0;
            setMessage(`Reorder complete: ${addedCount} item(s) added, ${skippedCount} skipped.`);
        } catch (error) {
            setMessage(error.message || 'Failed to reorder');
        } finally {
            setActionOrderId(null);
        }
    };

    const handleReturnRequest = async (orderId) => {
        const reason = window.prompt('Enter return reason (minimum 5 characters):');
        if (!reason) {
            return;
        }

        try {
            setActionOrderId(orderId);
            setMessage('');
            const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.ORDERS}/${orderId}/returns`, {
                method: 'POST',
                headers: authHeaders,
                body: JSON.stringify({ reason }),
            });
            const payload = await response.json();
            if (!response.ok) {
                throw new Error(payload?.message || 'Failed to submit return request');
            }

            await loadReturns();
            setMessage('Return request submitted successfully');
        } catch (error) {
            setMessage(error.message || 'Failed to submit return request');
        } finally {
            setActionOrderId(null);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 p-10">
                <div className="mx-auto max-w-5xl rounded-xl bg-white p-10 text-center shadow-sm">
                    Loading account center...
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
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
                    <div className="mt-3"><StoreNav /></div>
                </div>
            </header>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    <aside className="lg:col-span-1">
                        <div className="bg-white rounded-xl shadow-sm p-6">
                            <div className="text-center mb-6">
                                <div className="w-24 h-24 bg-blue-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                                    <span className="text-3xl font-bold text-blue-600">
                                        {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                                    </span>
                                </div>
                                <h2 className="text-xl font-bold text-gray-900">{user?.name}</h2>
                                <p className="text-gray-600">{user?.email}</p>
                            </div>

                            <nav className="space-y-2">
                                <button onClick={() => setActiveTab('orders')} className="w-full rounded-lg px-4 py-2 text-left text-gray-700 hover:bg-blue-50">
                                    Order History
                                </button>
                                <button onClick={() => setActiveTab('profile')} className="w-full rounded-lg px-4 py-2 text-left text-gray-700 hover:bg-blue-50">
                                    Profile
                                </button>
                                <button onClick={() => setActiveTab('addresses')} className="w-full rounded-lg px-4 py-2 text-left text-gray-700 hover:bg-blue-50">
                                    Address Book
                                </button>
                                <button onClick={() => setActiveTab('returns')} className="w-full rounded-lg px-4 py-2 text-left text-gray-700 hover:bg-blue-50">
                                    Returns
                                </button>
                                <Link to="/wishlist" className="block rounded-lg px-4 py-2 text-gray-700 hover:bg-blue-50">
                                    Wishlist
                                </Link>
                            </nav>
                        </div>
                    </aside>

                    <main className="lg:col-span-3 space-y-6">
                        {message && (
                            <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                                {message}
                            </div>
                        )}

                        {activeTab === 'orders' && (
                            <div className="bg-white rounded-xl shadow-sm p-6">
                                <h3 className="text-2xl font-bold text-gray-900 mb-6">Order History</h3>
                                {orders.length === 0 ? (
                                    <p className="text-gray-600">No orders found.</p>
                                ) : (
                                    <div className="space-y-4">
                                        {orders.map((order) => (
                                            <div key={order._id} className="rounded-lg border border-gray-200 p-4">
                                                <div className="mb-2 flex items-center justify-between">
                                                    <p className="font-semibold text-gray-900">
                                                        Order #{order.orderNumber || order._id.slice(-8)}
                                                    </p>
                                                    <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                                                        {order.status}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-gray-600">
                                                    {new Date(order.createdAt).toLocaleDateString()} - {order.items?.length || 0} items
                                                </p>
                                                <p className="mt-1 text-lg font-bold text-gray-900">
                                                    ${Number(order.totalAmount || 0).toFixed(2)}
                                                </p>
                                                <div className="mt-3 flex flex-wrap gap-2">
                                                    <button
                                                        onClick={() => handleReorder(order._id)}
                                                        disabled={actionOrderId === order._id}
                                                        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
                                                    >
                                                        Reorder
                                                    </button>
                                                    {order.status === 'delivered' && (
                                                        <button
                                                            onClick={() => handleReturnRequest(order._id)}
                                                            disabled={actionOrderId === order._id}
                                                            className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-200 disabled:opacity-60"
                                                        >
                                                            Request Return
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'profile' && (
                            <form onSubmit={handleProfileSave} className="bg-white rounded-xl shadow-sm p-6">
                                <h3 className="text-2xl font-bold text-gray-900 mb-6">Profile</h3>
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <label className="text-sm font-semibold text-gray-700">
                                        Full Name
                                        <input
                                            type="text"
                                            value={profileForm.name}
                                            onChange={(event) => setProfileForm((prev) => ({ ...prev, name: event.target.value.trimStart() }))}
                                            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                                            required
                                        />
                                    </label>
                                    <label className="text-sm font-semibold text-gray-700">
                                        Email
                                        <input
                                            type="email"
                                            value={profileForm.email}
                                            onChange={(event) => setProfileForm((prev) => ({ ...prev, email: event.target.value.trim() }))}
                                            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                                            required
                                        />
                                    </label>
                                    <label className="text-sm font-semibold text-gray-700 sm:col-span-2">
                                        Mobile Number
                                        <input
                                            type="text"
                                            value={profileForm.phone}
                                            onChange={(event) => setProfileForm((prev) => ({ ...prev, phone: event.target.value.trim() }))}
                                            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                                            placeholder="Enter mobile number"
                                        />
                                    </label>
                                </div>
                                <button
                                    type="submit"
                                    disabled={isSavingProfile}
                                    className="mt-4 rounded-lg bg-blue-600 px-5 py-2 text-white hover:bg-blue-700 disabled:opacity-60"
                                >
                                    {isSavingProfile ? 'Saving...' : 'Save Profile'}
                                </button>
                            </form>
                        )}

                        {activeTab === 'addresses' && (
                            <div className="space-y-6">
                                <form onSubmit={handleAddressSubmit} className="bg-white rounded-xl shadow-sm p-6">
                                    <h3 className="text-2xl font-bold text-gray-900 mb-6">
                                        {editingAddressId ? 'Edit Address' : 'Add New Address'}
                                    </h3>
                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                        <input placeholder="Label (Home, Office)" value={addressForm.label} onChange={(event) => setAddressForm((prev) => ({ ...prev, label: event.target.value }))} className="rounded-lg border border-gray-300 px-3 py-2" />
                                        <input placeholder="Phone" value={addressForm.phone} onChange={(event) => setAddressForm((prev) => ({ ...prev, phone: event.target.value }))} className="rounded-lg border border-gray-300 px-3 py-2" required />
                                        <input placeholder="First Name" value={addressForm.firstName} onChange={(event) => setAddressForm((prev) => ({ ...prev, firstName: event.target.value }))} className="rounded-lg border border-gray-300 px-3 py-2" required />
                                        <input placeholder="Last Name" value={addressForm.lastName} onChange={(event) => setAddressForm((prev) => ({ ...prev, lastName: event.target.value }))} className="rounded-lg border border-gray-300 px-3 py-2" required />
                                        <input placeholder="Address Line 1" value={addressForm.address1} onChange={(event) => setAddressForm((prev) => ({ ...prev, address1: event.target.value }))} className="rounded-lg border border-gray-300 px-3 py-2 sm:col-span-2" required />
                                        <input placeholder="Address Line 2" value={addressForm.address2} onChange={(event) => setAddressForm((prev) => ({ ...prev, address2: event.target.value }))} className="rounded-lg border border-gray-300 px-3 py-2 sm:col-span-2" />
                                        <input placeholder="City" value={addressForm.city} onChange={(event) => setAddressForm((prev) => ({ ...prev, city: event.target.value }))} className="rounded-lg border border-gray-300 px-3 py-2" required />
                                        <input placeholder="State" value={addressForm.state} onChange={(event) => setAddressForm((prev) => ({ ...prev, state: event.target.value }))} className="rounded-lg border border-gray-300 px-3 py-2" />
                                        <input placeholder="Post Code" value={addressForm.postCode} onChange={(event) => setAddressForm((prev) => ({ ...prev, postCode: event.target.value }))} className="rounded-lg border border-gray-300 px-3 py-2" required />
                                        <input placeholder="Country" value={addressForm.country} onChange={(event) => setAddressForm((prev) => ({ ...prev, country: event.target.value }))} className="rounded-lg border border-gray-300 px-3 py-2" required />
                                    </div>
                                    <label className="mt-4 flex items-center gap-2 text-sm text-gray-700">
                                        <input type="checkbox" checked={addressForm.isDefault} onChange={(event) => setAddressForm((prev) => ({ ...prev, isDefault: event.target.checked }))} />
                                        Set as default address
                                    </label>
                                    <div className="mt-4 flex gap-2">
                                        <button type="submit" disabled={isSavingAddress} className="rounded-lg bg-blue-600 px-5 py-2 text-white hover:bg-blue-700 disabled:opacity-60">
                                            {isSavingAddress ? 'Saving...' : editingAddressId ? 'Update Address' : 'Add Address'}
                                        </button>
                                        {editingAddressId && (
                                            <button type="button" onClick={resetAddressEditor} className="rounded-lg bg-gray-100 px-5 py-2 text-gray-700 hover:bg-gray-200">
                                                Cancel
                                            </button>
                                        )}
                                    </div>
                                </form>

                                <div className="bg-white rounded-xl shadow-sm p-6">
                                    <h4 className="text-xl font-bold text-gray-900 mb-4">Saved Addresses</h4>
                                    {addresses.length === 0 ? (
                                        <p className="text-gray-600">No saved addresses.</p>
                                    ) : (
                                        <div className="space-y-3">
                                            {addresses.map((address) => (
                                                <div key={address._id} className="rounded-lg border border-gray-200 p-4">
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div>
                                                            <p className="font-semibold text-gray-900">
                                                                {[address.firstName, address.lastName].filter(Boolean).join(' ')}
                                                                {address.isDefault && (
                                                                    <span className="ml-2 rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-700">
                                                                        Default
                                                                    </span>
                                                                )}
                                                            </p>
                                                            <p className="text-sm text-gray-600">{address.phone}</p>
                                                            <p className="text-sm text-gray-700 mt-1">
                                                                {[address.address1, address.address2, address.city, address.state, address.postCode, address.country]
                                                                    .filter(Boolean)
                                                                    .join(', ')}
                                                            </p>
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <button onClick={() => handleAddressEdit(address)} className="rounded bg-gray-100 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-200">
                                                                Edit
                                                            </button>
                                                            <button onClick={() => handleAddressDelete(address._id)} className="rounded bg-red-100 px-3 py-1.5 text-sm text-red-700 hover:bg-red-200">
                                                                Delete
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {activeTab === 'returns' && (
                            <div className="bg-white rounded-xl shadow-sm p-6">
                                <h3 className="text-2xl font-bold text-gray-900 mb-6">Return Requests</h3>
                                {returns.length === 0 ? (
                                    <p className="text-gray-600">No return requests submitted.</p>
                                ) : (
                                    <div className="space-y-3">
                                        {returns.map((request) => (
                                            <div key={request._id} className="rounded-lg border border-gray-200 p-4">
                                                <div className="flex items-start justify-between">
                                                    <div>
                                                        <p className="font-semibold text-gray-900">Order #{request.orderNumber}</p>
                                                        <p className="text-sm text-gray-600">
                                                            Requested on {new Date(request.requestedAt).toLocaleDateString()}
                                                        </p>
                                                        <p className="mt-1 text-sm text-gray-800">{request.reason}</p>
                                                        <p className="text-xs text-gray-500 mt-1">
                                                            Items: {request.items?.length || 0}
                                                        </p>
                                                    </div>
                                                    <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                                                        {request.status}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </main>
                </div>
            </div>
        </div>
    );
};

export default UserDashboard;
