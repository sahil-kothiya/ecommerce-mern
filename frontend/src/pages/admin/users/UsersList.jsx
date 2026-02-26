import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import ConfirmDialog from '../../../components/common/ConfirmDialog';
import notify from '../../../utils/notify';
import { API_CONFIG } from '../../../constants';
import authService from '../../../services/authService';

const UsersList = () => {
    const [users, setUsers] = useState([]);
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [isFetching, setIsFetching] = useState(false);
    const [userToDelete, setUserToDelete] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('active');
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 10,
        total: 0,
        pages: 1,
        hasPrev: false,
        hasNext: false,
    });
    const requestCounterRef = useRef(0);

    const getPhotoUrl = (path) => {
        if (!path) return '';
        if (/^https?:\/\//i.test(path)) return path;
        if (path.startsWith('/images/')) return `${API_CONFIG.BASE_URL}${path}`;
        if (path.startsWith('/uploads/')) return `${API_CONFIG.BASE_URL}${path}`;
        return `${API_CONFIG.BASE_URL}/uploads/${path.replace(/^\/+/, '')}`;
    };

    useEffect(() => {
        loadUsers();
    }, [pagination.page]);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (pagination.page !== 1) {
                setPagination((prev) => ({ ...prev, page: 1 }));
                return;
            }
            loadUsers({ page: 1 }, { background: true });
        }, 350);

        return () => clearTimeout(timer);
    }, [searchTerm, roleFilter, statusFilter]);

    const loadUsers = async (overrides = {}, options = {}) => {
        const requestId = ++requestCounterRef.current;
        const isBackground = Boolean(options.background) || !isInitialLoading;
        try {
            if (isBackground) {
                setIsFetching(true);
            } else {
                setIsInitialLoading(true);
            }
            const page = overrides.page || pagination.page;
            const query = new URLSearchParams({
                page: String(page),
                limit: String(pagination.limit),
            });
            const search = (overrides.search ?? searchTerm).trim();
            const role = overrides.role ?? roleFilter;
            const status = overrides.status ?? statusFilter;
            if (search) query.append('search', search);
            if (role) query.append('role', role);
            if (status) query.append('status', status);

            const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.USERS}?${query.toString()}`, {
                headers: authService.getAuthHeaders({}, false),
                credentials: 'include',
            });
            if (authService.handleUnauthorizedResponse(response)) return;
            const data = await response.json();
            if (requestId !== requestCounterRef.current) return;
            if (!response.ok || !data?.success) {
                notify.error(data, 'Failed to load users');
                setUsers([]);
                return;
            }
            const items = data?.data?.users || [];
            setUsers(Array.isArray(items) ? items : []);
            const apiPagination = data?.data?.pagination || {};
            setPagination((prev) => ({
                ...prev,
                page: apiPagination.page ?? page,
                limit: apiPagination.limit ?? prev.limit,
                total: apiPagination.total ?? 0,
                pages: apiPagination.pages ?? 1,
                hasPrev: apiPagination.hasPrev ?? false,
                hasNext: apiPagination.hasNext ?? false,
            }));
        } catch (error) {
            if (requestId !== requestCounterRef.current) return;
            notify.error(error, 'Failed to load users');
            setUsers([]);
        } finally {
            if (requestId === requestCounterRef.current) {
                setIsInitialLoading(false);
                setIsFetching(false);
            }
        }
    };

    const stats = useMemo(() => {
        const total = pagination.total;
        const active = users.filter((u) => u.status === 'active').length;
        const admins = users.filter((u) => u.role === 'admin').length;
        const normalUsers = users.filter((u) => u.role === 'user').length;
        return { total, active, admins, normalUsers };
    }, [users]);

    const orderedUsers = useMemo(() => {
        const rolePriority = { admin: 0, user: 1 };
        return [...users].sort((a, b) => {
            const roleA = rolePriority[a.role] ?? 2;
            const roleB = rolePriority[b.role] ?? 2;
            if (roleA !== roleB) return roleA - roleB;
            return String(a.name || '').localeCompare(String(b.name || ''));
        });
    }, [users]);

    const dynamicDescription = useMemo(() => {
        return `Showing ${users.length} of ${stats.total} users | Active (page): ${stats.active} | Admins (page): ${stats.admins}`;
    }, [users.length, stats.total, stats.active, stats.admins]);

    const handleDelete = async () => {
        if (!userToDelete?._id) return;
        try {
            const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.USERS}/${userToDelete._id}`, {
                method: 'DELETE',
                headers: authService.getAuthHeaders({}, false),
                credentials: 'include',
            });
            if (authService.handleUnauthorizedResponse(response)) return;
            const data = await response.json();
            if (!response.ok || !data?.success) {
                notify.error(data, 'Failed to delete user');
                return;
            }

            setUserToDelete(null);
            notify.success('User deleted successfully');
            const nextPage = users.length === 1 && pagination.page > 1 ? pagination.page - 1 : pagination.page;
            setPagination((prev) => ({ ...prev, page: nextPage }));
            loadUsers({ page: nextPage }, { background: true });
        } catch (error) {
            notify.error(error, 'Failed to delete user');
        }
    };

    if (isInitialLoading) {
        return (
            <div className="flex h-[420px] items-center justify-center">
                <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
                    <div className="mx-auto mb-4 h-16 w-16 animate-spin rounded-full border-b-4 border-slate-700" />
                    <p className="text-lg font-semibold text-slate-800">Loading users dashboard...</p>
                    <p className="mt-1 text-sm text-slate-500">Preparing user accounts and roles</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-900 via-slate-800 to-cyan-900 p-6 text-white shadow-lg sm:p-8">
                <div className="absolute -right-10 -top-20 h-48 w-48 rounded-full bg-cyan-400/20 blur-3xl" />
                <div className="absolute -bottom-20 -left-10 h-44 w-44 rounded-full bg-blue-300/20 blur-3xl" />
                <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-200/80">Admin Console</p>
                        <h1 className="mt-2 text-3xl font-black leading-tight sm:text-4xl">Users Management</h1>
                        <p className="mt-2 max-w-xl text-slate-200/90">{dynamicDescription}</p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <button
                            onClick={() => loadUsers({ page: pagination.page }, { background: true })}
                            className="rounded-xl border border-white/30 bg-white/10 px-5 py-3 font-semibold backdrop-blur-sm transition-all hover:bg-white/20"
                        >
                            Refresh
                        </button>
                        <Link
                            to="/admin/users/create"
                            className="rounded-xl bg-cyan-400 px-5 py-3 font-bold text-slate-900 transition-colors hover:bg-cyan-300"
                        >
                            + Add User
                        </Link>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <p className="text-xs uppercase tracking-widest text-slate-500">Total Users</p>
                    <p className="mt-2 text-3xl font-black text-slate-900">{stats.total}</p>
                </div>
                <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-5 shadow-sm">
                    <p className="text-xs uppercase tracking-widest text-emerald-700">Active</p>
                    <p className="mt-2 text-3xl font-black text-emerald-800">{stats.active}</p>
                </div>
                <div className="rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 to-white p-5 shadow-sm">
                    <p className="text-xs uppercase tracking-widest text-violet-700">Admins</p>
                    <p className="mt-2 text-3xl font-black text-violet-800">{stats.admins}</p>
                </div>
                <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-white p-5 shadow-sm">
                    <p className="text-xs uppercase tracking-widest text-blue-700">Users</p>
                    <p className="mt-2 text-3xl font-black text-blue-800">{stats.normalUsers}</p>
                </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_auto_auto_auto]">
                    <div className="relative">
                        <svg className="absolute left-3 top-3.5 h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                            type="text"
                            placeholder="Search name or email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full rounded-xl border border-slate-300 px-4 py-3 pl-10 pr-10 text-slate-800 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-200"
                        />
                        {searchTerm && (
                            <button
                                type="button"
                                onClick={() => setSearchTerm('')}
                                className="absolute right-3 top-3 text-slate-400 hover:text-slate-700"
                                aria-label="Clear search"
                            >
                                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        )}
                    </div>
                    <select
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                        className="rounded-xl border border-slate-300 px-4 py-3 text-slate-800 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-200"
                    >
                        <option value="">All Roles</option>
                        <option value="admin">Admin</option>
                        <option value="user">User</option>
                    </select>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="rounded-xl border border-slate-300 px-4 py-3 text-slate-800 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-200"
                    >
                        <option value="">All Status</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                    </select>
                    <button
                        type="button"
                        onClick={() => {
                            setSearchTerm('');
                            setRoleFilter('');
                            setStatusFilter('active');
                            setPagination((prev) => ({ ...prev, page: 1 }));
                            loadUsers({ page: 1, search: '', role: '', status: 'active' }, { background: true });
                        }}
                        className="rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white transition-colors hover:bg-slate-700"
                    >
                        Reset
                    </button>
                </div>
                {isFetching && (
                    <p className="mt-2 text-xs font-medium text-cyan-700">Searching...</p>
                )}
                <p className="mt-3 text-sm text-slate-500">
                    Showing <span className="font-semibold text-slate-800">{users.length}</span> result{users.length !== 1 ? 's' : ''} on this page.
                </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm overflow-x-auto">
                <table className="w-full min-w-[900px] text-sm">
                    <thead>
                        <tr className="border-b border-slate-200 text-left text-slate-600">
                            <th className="py-3 pr-3">Sr. No</th>
                            <th className="py-3 pr-3">User</th>
                            <th className="py-3 pr-3">Email</th>
                            <th className="py-3 pr-3">Role</th>
                            <th className="py-3 pr-3">Status</th>
                            <th className="py-3 pr-3">Joined</th>
                            <th className="py-3 pr-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {orderedUsers.map((user, index) => (
                            <tr key={user._id} className="border-b border-slate-100">
                                <td className="py-3 pr-3">{(pagination.page - 1) * pagination.limit + index + 1}</td>
                                <td className="py-3 pr-3">
                                    <div className="flex items-center gap-3">
                                        {user.photo ? (
                                            <img
                                                src={getPhotoUrl(user.photo)}
                                                alt={user.name || 'User photo'}
                                                className="h-10 w-10 rounded-full object-cover"
                                                onError={(e) => {
                                                    e.currentTarget.style.display = 'none';
                                                    const next = e.currentTarget.nextElementSibling;
                                                    if (next) next.classList.remove('hidden');
                                                }}
                                            />
                                        ) : null}
                                        <div className={`flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-cyan-600 to-blue-600 font-semibold text-white ${user.photo ? 'hidden' : ''}`}>
                                            {user.name?.charAt(0)?.toUpperCase() || 'U'}
                                        </div>
                                        <span className="font-semibold text-slate-900">{user.name}</span>
                                    </div>
                                </td>
                                <td className="py-3 pr-3 text-slate-700">{user.email}</td>
                                <td className="py-3 pr-3">
                                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${user.role === 'admin' ? 'bg-violet-100 text-violet-800' : 'bg-blue-100 text-blue-800'}`}>
                                        {user.role}
                                    </span>
                                </td>
                                <td className="py-3 pr-3">
                                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${user.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                                        {user.status}
                                    </span>
                                </td>
                                <td className="py-3 pr-3 text-slate-500">{new Date(user.createdAt).toLocaleDateString()}</td>
                                <td className="py-3 pr-3">
                                    <div className="flex justify-end gap-2">
                                        <Link to={`/admin/users/${user._id}/edit`} className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700">
                                            Edit
                                        </Link>
                                        <button onClick={() => setUserToDelete(user)} className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100">
                                            Delete
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {users.length === 0 && (
                            <tr>
                                <td colSpan="7" className="py-8 text-center text-slate-500">No users found.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-sm text-slate-600">Page {pagination.page} of {pagination.pages}</p>
                <div className="flex gap-2">
                    <button
                        type="button"
                        disabled={!pagination.hasPrev}
                        onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
                        className="rounded-lg border border-slate-300 px-4 py-2 text-sm disabled:opacity-40"
                    >
                        Previous
                    </button>
                    <button
                        type="button"
                        disabled={!pagination.hasNext}
                        onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
                        className="rounded-lg border border-slate-300 px-4 py-2 text-sm disabled:opacity-40"
                    >
                        Next
                    </button>
                </div>
            </div>

            <ConfirmDialog
                isOpen={Boolean(userToDelete)}
                title="Delete User?"
                message="This action permanently removes this user account."
                highlightText={userToDelete?.name || ''}
                confirmText="Delete User"
                cancelText="Keep User"
                onConfirm={handleDelete}
                onCancel={() => setUserToDelete(null)}
            />
        </div>
    );
};

export default UsersList;
