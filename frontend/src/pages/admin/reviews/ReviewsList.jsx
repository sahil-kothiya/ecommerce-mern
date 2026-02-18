import React, { useEffect, useMemo, useState } from 'react';
import notify from '../../../utils/notify';
import reviewService from '../../../services/reviewService';
import { ConfirmDialog } from '../../../components/common';
import { API_CONFIG } from '../../../constants';

const ReviewsList = () => {
    const [reviews, setReviews] = useState([]);
    const [products, setProducts] = useState([]);
    const [filters, setFilters] = useState({ search: '', status: '', productId: '' });
    const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0, hasPrev: false, hasNext: false });
    const [isLoading, setIsLoading] = useState(true);
    const [reviewToDelete, setReviewToDelete] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        loadReviews();
    }, [pagination.page]);

    useEffect(() => {
        loadProductOptions();
    }, []);

    const loadReviews = async (overrides = {}) => {
        try {
            setIsLoading(true);
            const query = {
                page: overrides.page || pagination.page,
                limit: pagination.limit,
                search: overrides.search ?? filters.search,
                status: overrides.status ?? filters.status,
                productId: overrides.productId ?? filters.productId,
            };

            const response = await reviewService.getReviews(query);
            const payload = response?.data || {};
            setReviews(payload.reviews || []);
            setPagination((prev) => ({ ...prev, ...(payload.pagination || {}) }));
        } catch (error) {
            notify.error(error, 'Failed to load reviews');
        } finally {
            setIsLoading(false);
        }
    };

    const loadProductOptions = async () => {
        try {
            const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.PRODUCTS}?page=1&limit=500&status=active`);
            const data = await response.json();
            if (!response.ok || !data?.success) return;
            const items = data?.data?.products || data?.data?.items || data?.data || [];
            setProducts(Array.isArray(items) ? items : []);
        } catch {
            setProducts([]);
        }
    };

    const handleSearch = (event) => {
        event.preventDefault();
        setPagination((prev) => ({ ...prev, page: 1 }));
        loadReviews({ page: 1 });
    };

    const toggleStatus = async (review) => {
        try {
            const nextStatus = review.status === 'active' ? 'inactive' : 'active';
            await reviewService.updateReviewStatus(review._id, nextStatus);
            notify.success('Review status updated');
            loadReviews();
        } catch (error) {
            notify.error(error, 'Failed to update review status');
        }
    };

    const confirmDelete = async () => {
        if (!reviewToDelete?._id) return;
        try {
            setIsDeleting(true);
            await reviewService.deleteReview(reviewToDelete._id);
            notify.success('Review deleted successfully');
            setReviewToDelete(null);
            loadReviews();
        } catch (error) {
            notify.error(error, 'Failed to delete review');
        } finally {
            setIsDeleting(false);
        }
    };

    const activeCount = useMemo(() => reviews.filter((r) => r.status === 'active').length, [reviews]);

    return (
        <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h1 className="text-3xl font-black text-slate-900">Reviews</h1>
                <p className="mt-1 text-slate-600">Manage product reviews and moderation.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <p className="text-xs uppercase tracking-widest text-slate-500">Loaded</p>
                    <p className="mt-2 text-2xl font-black text-slate-900">{reviews.length}</p>
                </div>
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
                    <p className="text-xs uppercase tracking-widest text-emerald-700">Active</p>
                    <p className="mt-2 text-2xl font-black text-emerald-800">{activeCount}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <p className="text-xs uppercase tracking-widest text-slate-500">Total</p>
                    <p className="mt-2 text-2xl font-black text-slate-900">{pagination.total || 0}</p>
                </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <form className="flex gap-3" onSubmit={handleSearch}>
                    <input
                        type="text"
                        value={filters.search}
                        onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
                        className="flex-1 rounded-xl border border-slate-300 px-4 py-2"
                        placeholder="Search by title/comment"
                    />
                    <select
                        value={filters.status}
                        onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
                        className="rounded-xl border border-slate-300 px-4 py-2"
                    >
                        <option value="">All status</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                    </select>
                    <select
                        value={filters.productId}
                        onChange={(e) => setFilters((prev) => ({ ...prev, productId: e.target.value }))}
                        className="rounded-xl border border-slate-300 px-4 py-2"
                    >
                        <option value="">All products</option>
                        {products.map((product) => (
                            <option key={product._id} value={product._id}>
                                {product.title} (ID: {String(product._id).slice(-6)})
                            </option>
                        ))}
                    </select>
                    <button type="submit" className="rounded-xl bg-slate-900 px-5 py-2 font-semibold text-white hover:bg-slate-700">Search</button>
                </form>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm overflow-x-auto">
                {isLoading ? (
                    <div className="py-12 text-center text-slate-500">Loading reviews...</div>
                ) : (
                    <table className="w-full min-w-[1100px] text-sm">
                        <thead>
                            <tr className="border-b border-slate-200 text-left text-slate-600">
                                <th className="py-2 pr-2">Sr. No</th>
                                <th className="py-2 pr-2">Product</th>
                                <th className="py-2 pr-2">User</th>
                                <th className="py-2 pr-2">Rating</th>
                                <th className="py-2 pr-2">Comment</th>
                                <th className="py-2 pr-2">Status</th>
                                <th className="py-2 pr-2">Date</th>
                                <th className="py-2 pr-2">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {reviews.map((review, index) => (
                                <tr key={review._id} className="border-b border-slate-100">
                                    <td className="py-2 pr-2">{(pagination.page - 1) * pagination.limit + index + 1}</td>
                                    <td className="py-2 pr-2 font-semibold text-slate-900">{review.productId?.title || 'N/A'}</td>
                                    <td className="py-2 pr-2">{review.userId?.name || 'N/A'}<div className="text-xs text-slate-500">{review.userId?.email || ''}</div></td>
                                    <td className="py-2 pr-2">{review.rating}/5</td>
                                    <td className="py-2 pr-2 max-w-[420px]"><div className="line-clamp-2">{review.comment}</div></td>
                                    <td className="py-2 pr-2">
                                        <span className={`rounded px-2 py-1 text-xs font-semibold ${review.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                            {review.status}
                                        </span>
                                    </td>
                                    <td className="py-2 pr-2">{new Date(review.createdAt).toLocaleDateString()}</td>
                                    <td className="py-2 pr-2">
                                        <div className="flex gap-2">
                                            <button type="button" onClick={() => toggleStatus(review)} className="rounded bg-slate-900 px-3 py-1 text-xs font-semibold text-white hover:bg-slate-700">
                                                {review.status === 'active' ? 'Deactivate' : 'Activate'}
                                            </button>
                                            <button type="button" onClick={() => setReviewToDelete(review)} className="rounded border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-100">
                                                Delete
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {reviews.length === 0 && (
                                <tr>
                                    <td colSpan="8" className="py-8 text-center text-slate-500">No reviews found.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>

            <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-sm text-slate-600">Page {pagination.page || 1} of {pagination.pages || 1}</p>
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
                isOpen={Boolean(reviewToDelete)}
                title="Delete Review?"
                message="This action permanently removes the review."
                highlightText={reviewToDelete?.title || reviewToDelete?.comment || ''}
                confirmText={isDeleting ? 'Deleting...' : 'Delete'}
                cancelText="Cancel"
                isProcessing={isDeleting}
                onConfirm={confirmDelete}
                onCancel={() => setReviewToDelete(null)}
            />
        </div>
    );
};

export default ReviewsList;
