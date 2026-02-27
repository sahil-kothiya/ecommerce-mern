import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import reviewService from '../../services/reviewService';
import { resolveImageUrl } from '../../utils/imageUrl';
import { getRandomProductImage } from '../../services/imageService';
import notify from '../../utils/notify';

const StarRating = ({ rating }) => (
    <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
            <svg key={star} className={`h-4 w-4 ${star <= rating ? 'text-[#ffa336]' : 'text-slate-200'}`} fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.163c.969 0 1.371 1.24.588 1.81l-3.366 2.448a1 1 0 00-.364 1.118l1.286 3.957c.3.921-.756 1.688-1.539 1.118l-3.367-2.448a1 1 0 00-1.176 0l-3.366 2.448c-.784.57-1.838-.197-1.54-1.118l1.286-3.957a1 1 0 00-.364-1.118L2.975 9.384c-.783-.57-.381-1.81.588-1.81h4.163a1 1 0 00.95-.69l1.373-3.957z" />
            </svg>
        ))}
    </div>
);

const STATUS_STYLES = {
    active: 'bg-green-100 text-green-700',
    inactive: 'bg-slate-100 text-slate-500',
};

const AccountReviews = () => {
    const navigate = useNavigate();
    const [reviews, setReviews] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [pagination, setPagination] = useState(null);
    const [page, setPage] = useState(1);

    const loadReviews = useCallback(async (pageNum = 1) => {
        try {
            setIsLoading(true);
            setError('');
            const data = await reviewService.getMyReviews({ page: pageNum, limit: 10 });
            const reviewData = data?.data || {};
            setReviews(Array.isArray(reviewData.reviews) ? reviewData.reviews : []);
            if (reviewData.pagination) setPagination(reviewData.pagination);
        } catch (err) {
            setError(err.message || 'Failed to load reviews');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => { loadReviews(page); }, [page, loadReviews]);

    const handleDelete = async (reviewId) => {
        if (!reviewId) return;
        const confirmed = window.confirm('Delete this review? This cannot be undone.');
        if (!confirmed) return;
        try {
            await reviewService.deleteReview(reviewId);
            notify.success('Review deleted');
            loadReviews(page);
        } catch (err) {
            notify.error(err, 'Failed to delete review');
        }
    };

    const getProductImage = (product) => {
        if (!product) return getRandomProductImage();
        const images = Array.isArray(product.images) ? product.images : [];
        if (images.length === 0) return getRandomProductImage();
        const first = images[0];
        const path = typeof first === 'string' ? first : (first?.path || first?.url);
        return resolveImageUrl(path, { placeholder: getRandomProductImage() });
    };

    if (isLoading && reviews.length === 0) {
        return (
            <div className="flex min-h-[40vh] items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#4250d5] border-t-transparent" />
            </div>
        );
    }

    return (
        <div className="space-y-5">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold text-[#212121]">My Reviews</h1>
                    <p className="text-sm text-[#878787]">{pagination?.total ?? reviews.length} review{(pagination?.total ?? reviews.length) !== 1 ? 's' : ''}</p>
                </div>
            </div>

            {error && (
                <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200">{error}</div>
            )}

            {reviews.length === 0 && !isLoading ? (
                <div className="store-surface rounded-2xl py-16 text-center">
                    <svg className="mx-auto mb-4 h-14 w-14 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.959a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.367 2.447a1 1 0 00-.364 1.118l1.286 3.959c.3.921-.755 1.688-1.539 1.118l-3.367-2.447a1 1 0 00-1.176 0L7.04 18.028c-.783.57-1.838-.197-1.539-1.118l1.286-3.959a1 1 0 00-.364-1.118L3.056 9.386c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69l1.293-3.959z" />
                    </svg>
                    <p className="text-[#878787]">You haven't written any reviews yet.</p>
                    <Link to="/account/orders" className="store-btn-primary tap-bounce mt-3 inline-block rounded-xl px-5 py-2.5 text-sm font-bold">
                        Go to My Orders
                    </Link>
                </div>
            ) : (
                <div className="space-y-4">
                    {reviews.map((review) => {
                        const product = review.product || review.productId;
                        const productId = product?._id || product;
                        const productTitle = product?.title || product?.name || 'Product';
                        const productImage = getProductImage(product);
                        const reviewDate = review.createdAt
                            ? new Date(review.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
                            : '';

                        return (
                            <div key={review._id} className="store-surface rounded-2xl p-5">
                                <div className="flex gap-4">
                                    <Link to={`/products/${productId}`} className="flex-shrink-0">
                                        <img
                                            src={productImage}
                                            alt={productTitle}
                                            className="h-20 w-20 rounded-xl border border-[rgba(165,187,252,0.3)] object-contain"
                                            onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = getRandomProductImage(); }}
                                        />
                                    </Link>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-start justify-between gap-3">
                                            <Link
                                                to={`/products/${productId}`}
                                                className="truncate text-sm font-bold text-[#4250d5] hover:underline"
                                            >
                                                {productTitle}
                                            </Link>
                                            <span className={`flex-shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${STATUS_STYLES[review.status] || STATUS_STYLES.active}`}>
                                                {review.status || 'active'}
                                            </span>
                                        </div>
                                        <div className="mt-1 flex items-center gap-2">
                                            <StarRating rating={review.rating} />
                                            <span className="text-sm font-semibold text-[#212121]">{review.rating}/5</span>
                                        </div>
                                        {review.title && <p className="mt-1 text-sm font-semibold text-[#212121]">{review.title}</p>}
                                        {review.comment && <p className="mt-1 text-sm leading-relaxed text-[#444]">{review.comment}</p>}
                                        <div className="mt-2 flex items-center justify-between gap-3">
                                            <p className="text-xs text-[#878787]">{reviewDate}</p>
                                            <div className="flex items-center gap-2">
                                                <Link
                                                    to={`/products/${productId}?orderId=${review.orderId}`}
                                                    className="rounded-lg border border-[rgba(66,80,213,0.3)] px-3 py-1 text-xs font-semibold text-[#4250d5] hover:bg-[rgba(66,80,213,0.06)]"
                                                >
                                                    Edit
                                                </Link>
                                                <button
                                                    type="button"
                                                    onClick={() => handleDelete(review._id)}
                                                    className="rounded-lg border border-[rgba(239,68,68,0.35)] px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    {pagination && pagination.pages > 1 && (
                        <div className="flex items-center justify-center gap-2 pt-2">
                            <button
                                type="button"
                                disabled={!pagination.hasPrev}
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                className="store-btn-secondary rounded-lg px-3 py-1.5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                Previous
                            </button>
                            <span className="text-sm text-[#878787]">
                                Page {pagination.page} of {pagination.pages}
                            </span>
                            <button
                                type="button"
                                disabled={!pagination.hasNext}
                                onClick={() => setPage((p) => p + 1)}
                                className="store-btn-secondary rounded-lg px-3 py-1.5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                Next
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default AccountReviews;
