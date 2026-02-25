import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import authService from '../../services/authService';
import { API_CONFIG } from '../../constants';

const StarRating = ({ rating }) => (
    <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
            <svg key={star} className={`h-4 w-4 ${star <= rating ? 'text-yellow-400' : 'text-slate-200'}`} fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.163c.969 0 1.371 1.24.588 1.81l-3.366 2.448a1 1 0 00-.364 1.118l1.286 3.957c.3.921-.756 1.688-1.539 1.118l-3.367-2.448a1 1 0 00-1.176 0l-3.366 2.448c-.784.57-1.838-.197-1.54-1.118l1.286-3.957a1 1 0 00-.364-1.118L2.975 9.384c-.783-.57-.381-1.81.588-1.81h4.163a1 1 0 00.95-.69l1.373-3.957z" />
            </svg>
        ))}
    </div>
);

const STATUS_STYLES = {
    approved: 'bg-green-100 text-green-700',
    pending: 'bg-yellow-100 text-yellow-700',
    rejected: 'bg-red-100 text-red-700',
};

const AccountReviews = () => {
    const [reviews, setReviews] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    const authHeaders = useMemo(() => authService.getAuthHeaders(), []);

    useEffect(() => {
        const load = async () => {
            try {
                const res = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.REVIEWS}?mine=true`, { headers: authHeaders });
                const payload = await res.json();
                if (!res.ok) throw new Error(payload?.message || 'Failed to load reviews');
                const list = payload?.data?.reviews || payload?.data || [];
                setReviews(Array.isArray(list) ? list : []);
            } catch (err) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };
        load();
    }, [authHeaders]);

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
                <h1 className="text-xl font-bold text-slate-800">My Reviews</h1>
                <p className="text-sm text-slate-500">{reviews.length} review{reviews.length !== 1 ? 's' : ''} submitted</p>
            </div>

            {error && (
                <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200">{error}</div>
            )}

            {reviews.length === 0 ? (
                <div className="rounded-2xl bg-white py-16 text-center shadow-sm ring-1 ring-slate-100">
                    <svg className="mx-auto mb-4 h-14 w-14 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.959a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.367 2.447a1 1 0 00-.364 1.118l1.286 3.959c.3.921-.755 1.688-1.539 1.118l-3.367-2.447a1 1 0 00-1.176 0L7.04 18.028c-.783.57-1.838-.197-1.539-1.118l1.286-3.959a1 1 0 00-.364-1.118L3.056 9.386c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69l1.293-3.959z" />
                    </svg>
                    <p className="text-slate-500">You haven't written any reviews yet.</p>
                    <Link to="/products" className="mt-3 inline-block rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700">
                        Shop & Review
                    </Link>
                </div>
            ) : (
                <div className="space-y-4">
                    {reviews.map((review) => (
                        <div key={review._id} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                                <div className="min-w-0 flex-1">
                                    {review.product && (
                                        <Link
                                            to={`/products/${review.product._id || review.product}`}
                                            className="mb-1 block truncate text-sm font-bold text-blue-600 hover:underline"
                                        >
                                            {review.product.name || 'View Product →'}
                                        </Link>
                                    )}
                                    <div className="mb-2 flex items-center gap-3">
                                        <StarRating rating={review.rating} />
                                        <span className="text-sm font-semibold text-slate-700">{review.rating}/5</span>
                                    </div>
                                    {review.title && <p className="font-semibold text-slate-800">{review.title}</p>}
                                    {review.comment && <p className="mt-1 text-sm text-slate-600">{review.comment}</p>}
                                    <p className="mt-2 text-xs text-slate-400">
                                        {new Date(review.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                                    </p>
                                </div>
                                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${STATUS_STYLES[review.status] || 'bg-slate-100 text-slate-600'}`}>
                                    {review.status || 'pending'}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default AccountReviews;
