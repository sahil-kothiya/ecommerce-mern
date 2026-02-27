import React, { useState, useEffect, useMemo } from 'react';
import { Link, useParams, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { getRandomProductImage } from '../services/imageService';
import { resolveImageUrl } from '../utils/imageUrl';
import { formatPrice, getProductDisplayPricing } from '../utils/productUtils';
import { API_CONFIG, PRODUCT_CONDITIONS } from '../constants';
import authService from '../services/authService';
import reviewService from '../services/reviewService';
import notify from '../utils/notify';
import { useSiteSettings } from '../context/useSiteSettings';
import ProductCard from '../components/product/ProductCard';
import { addRecentlyViewed, getRecentlyViewed } from '../utils/recentlyViewed';

const reviewSchema = yup.object().shape({
    rating: yup
        .number()
        .typeError('Rating is required')
        .required('Rating is required')
        .min(1, 'Minimum rating is 1')
        .max(5, 'Maximum rating is 5'),
    title: yup
        .string()
        .trim()
        .max(100, 'Title cannot exceed 100 characters')
        .optional(),
    comment: yup
        .string()
        .trim()
        .required('Comment is required')
        .min(10, 'Comment must be at least 10 characters')
        .max(1000, 'Comment cannot exceed 1000 characters'),
});

const buildVariantTypes = (variants = []) => {
    const typeMap = new Map();
    variants.forEach((v) => {
        (v.options || []).forEach((opt) => {
            if (!typeMap.has(opt.typeId)) {
                typeMap.set(opt.typeId, {
                    typeId: opt.typeId,
                    typeName: opt.typeName,
                    typeDisplayName: opt.typeDisplayName,
                    options: new Map(),
                });
            }
            const t = typeMap.get(opt.typeId);
            if (!t.options.has(opt.optionId)) {
                t.options.set(opt.optionId, {
                    optionId: opt.optionId,
                    value: opt.value,
                    displayValue: opt.displayValue,
                    hexColor: opt.hexColor || null,
                });
            }
        });
    });
    return Array.from(typeMap.values()).map((t) => ({ ...t, options: Array.from(t.options.values()) }));
};

const findMatchingVariant = (variants = [], selectedOpts = {}) => {
    const selEntries = Object.entries(selectedOpts);
    if (!selEntries.length) return null;
    return variants.find((v) =>
        selEntries.every(([typeId, optionId]) =>
            (v.options || []).some((o) => o.typeId === typeId && o.optionId === optionId)
        )
    ) || null;
};

const isOptionAvailable = (variants = [], selectedOpts = {}, typeId, optionId) => {
    const testSel = { ...selectedOpts, [typeId]: optionId };
    return variants.some((v) =>
        Object.entries(testSel).every(([tid, oid]) =>
            (v.options || []).some((o) => o.typeId === tid && o.optionId === oid)
        )
    );
};

const maskReviewerName = (name) => {
    if (!name || typeof name !== 'string' || !name.trim()) return 'Customer';
    const parts = name.trim().split(/\s+/);
    return parts.map((p) => (p.length <= 1 ? p : p[0] + '*'.repeat(Math.min(p.length - 1, 3)))).join(' ');
};

const REVIEW_SORT_OPTIONS = [
    { value: 'recent', label: 'Most Recent' },
    { value: 'helpful', label: 'Most Helpful' },
    { value: 'highest', label: 'Highest Rated' },
    { value: 'lowest', label: 'Lowest Rated' },
];

const RatingBar = ({ star, count, total }) => {
    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
    return (
        <div className="flex items-center gap-2 text-sm">
            <span className="w-6 text-right font-medium text-[#444]">{star}</span>
            <svg className="h-3.5 w-3.5 flex-shrink-0 text-[#ffa336]" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            <div className="flex-1 h-2 overflow-hidden rounded-full bg-[#f0f0f0]">
                <div className="h-full rounded-full bg-[#ffa336] transition-all duration-300" style={{ width: `${pct}%` }} />
            </div>
            <span className="w-10 text-right text-xs text-[#878787]">{count}</span>
        </div>
    );
};

const ColorSwatch = ({ option, selected, available, onClick }) => (
    <button
        type="button"
        title={option.displayValue}
        onClick={() => available && onClick(option.optionId)}
        className={`relative h-9 w-9 rounded-full border-2 transition-all focus:outline-none
            ${selected ? 'border-[#2874f0] scale-110 shadow-[0_0_0_3px_rgba(40,116,240,0.25)]' : 'border-transparent'}
            ${!available ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer hover:scale-105'}
        `}
    >
        <span
            className="block h-full w-full rounded-full"
            style={{ backgroundColor: option.hexColor || '#ccc', border: '1px solid rgba(0,0,0,0.1)' }}
        />
        {!available && (
            <span className="absolute inset-0 flex items-center justify-center">
                <span className="block h-px w-6 rotate-45 bg-red-400" />
            </span>
        )}
    </button>
);

const PillOption = ({ option, selected, available, onClick }) => (
    <button
        type="button"
        onClick={() => available && onClick(option.optionId)}
        disabled={!available}
        className={`rounded-sm border px-4 py-2 text-sm font-medium transition-all focus:outline-none
            ${selected
                ? 'border-[#2874f0] bg-[#eff5ff] text-[#2874f0] shadow-[0_0_0_1px_#2874f0]'
                : available
                    ? 'border-[#c2c2c2] bg-white text-[#212121] hover:border-[#2874f0] hover:text-[#2874f0]'
                    : 'border-[#e0e0e0] bg-[#f5f5f5] text-[#bdbdbd] cursor-not-allowed line-through'
            }
        `}
    >
        {option.displayValue}
    </button>
);

const ProductDetailPage = () => {
    const { id } = useParams();
    const { settings } = useSiteSettings();
    const currencyCode = String(settings?.currencyCode || 'USD').toUpperCase();
    const fmt = (price) => formatPrice(price || 0, currencyCode);
    const navigate = useNavigate();
    const location = useLocation();

    const [product, setProduct] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedImage, setSelectedImage] = useState(0);
    const [quantity, setQuantity] = useState(1);
    const [selectedOpts, setSelectedOpts] = useState({});
    const [reviews, setReviews] = useState([]);
    const [reviewsLoading, setReviewsLoading] = useState(false);
    const [editingReviewId, setEditingReviewId] = useState(null);
    const [reviewSort, setReviewSort] = useState('recent');
    const [reviewPage, setReviewPage] = useState(1);
    const [reviewPagination, setReviewPagination] = useState(null);
    const [similarProducts, setSimilarProducts] = useState([]);
    const [similarProductsLoading, setSimilarProductsLoading] = useState(false);
    const [recentlyViewed, setRecentlyViewed] = useState([]);
    const [wishlistItems, setWishlistItems] = useState([]);
    const [hoveredProduct, setHoveredProduct] = useState(null);

    const {
        register,
        handleSubmit,
        reset,
        setValue,
        watch,
        formState: { errors, isSubmitting },
    } = useForm({
        resolver: yupResolver(reviewSchema),
        mode: 'onBlur',
        defaultValues: {
            rating: 5,
            title: '',
            comment: '',
        },
    });

    const selectedReviewRating = watch('rating');
    const reviewOrderId = useMemo(() => new URLSearchParams(location.search).get('orderId') || '', [location.search]);
    const currentUser = authService.getUser();
    const currentUserId = currentUser?._id;
    const isAdmin = currentUser?.role === 'admin';
    const myReview = useMemo(() => {
        if (!currentUserId) return null;
        return reviews.find((review) => {
            const reviewUserId = typeof review?.userId === 'object' ? review.userId?._id : review?.userId;
            return reviewUserId && String(reviewUserId) === String(currentUserId);
        }) || null;
    }, [reviews, currentUserId]);
    const isEditingReview = Boolean(editingReviewId);

    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'instant' });
        loadProductDetail();
    }, [id]);

    const loadProductDetail = async () => {
        try {
            setIsLoading(true);
            const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.PRODUCTS}/${id}`);
            if (!response.ok) throw new Error('Product not found');
            const data = await response.json();
            const p = data?.data || data;
            if (p) {
                p.images = Array.isArray(p.images) ? p.images : [];
                const variants = Array.isArray(p.variants) ? p.variants.filter(v => !v.status || v.status === 'active') : [];
                const defaults = {};
                if (p.hasVariants && variants[0]) {
                    (variants[0].options || []).forEach((o) => { defaults[o.typeId] = o.optionId; });
                }
                setSelectedOpts(defaults);
                setSelectedImage(0);
                setProduct(p);
            }
        } catch {
            setProduct(null);
        } finally { setIsLoading(false); }
    };

    const loadReviews = async (productId, sort = reviewSort, page = 1, append = false) => {
        if (!productId) return;
        try {
            setReviewsLoading(true);
            const response = await reviewService.getProductReviews(productId, { sort, page, limit: 10 });
            const list = Array.isArray(response?.data) ? response.data : [];
            setReviews((prev) => (append ? [...prev, ...list] : list));
            if (response?.pagination) setReviewPagination(response.pagination);
        } catch {
            if (!append) setReviews([]);
        } finally {
            setReviewsLoading(false);
        }
    };

    const loadSimilarProducts = async (productId, categoryId) => {
        if (!productId) return;
        try {
            setSimilarProductsLoading(true);
            let url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.PRODUCTS}?limit=16&status=active`;
            if (categoryId) url += `&categoryId=${categoryId}`;

            const response = await fetch(url);
            if (!response.ok) throw new Error('Failed to fetch similar products');
            const data = await response.json();

            const products = Array.isArray(data?.data?.products)
                ? data.data.products
                : (Array.isArray(data?.data) ? data.data : []);

            setSimilarProducts(products.filter(p => p._id !== productId).slice(0, 12));
        } catch {
            setSimilarProducts([]);
        } finally {
            setSimilarProductsLoading(false);
        }
    };

    const loadWishlist = async () => {
        if (!authService.isAuthenticated()) { setWishlistItems([]); return; }
        try {

            const res = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.WISHLIST}`, { 
                headers: authService.getAuthHeaders(),
                credentials: 'include'
            });
            if (!res.ok) {
                authService.handleUnauthorizedResponse(res);
                setWishlistItems([]);
                return;
            }
            const data = await res.json();
            setWishlistItems((Array.isArray(data?.data?.items) ? data.data.items : []).map((i) => i.productId).filter(Boolean));
        } catch { setWishlistItems([]); }
    };

    useEffect(() => {
        if (product?._id) {
            addRecentlyViewed(product);
            loadReviews(product._id);
            const categoryId = product?.category?._id || product?.category?.id;
            loadSimilarProducts(product._id, categoryId);
            loadWishlist();

            const recent = getRecentlyViewed(13).filter(p => p._id !== product._id).slice(0, 12);
            setRecentlyViewed(recent);
        }
    }, [product?._id]);

    const handleReviewSubmit = async (formValues) => {
        if (!authService.isAuthenticated()) {
            navigate('/login');
            return;
        }

        if (!product?._id) {
            notify.error('Product not loaded yet');
            return;
        }

        if (!reviewOrderId) {
            notify.error('Please submit review from your delivered order page');
            return;
        }

        try {
            const payload = {
                rating: formValues.rating,
                title: formValues.title?.trim() || '',
                comment: formValues.comment?.trim() || '',
                orderId: reviewOrderId,
            };

            if (editingReviewId) {
                await reviewService.updateReview(editingReviewId, payload);
            } else {
                await reviewService.createReview({ productId: product._id, ...payload });
            }

            notify.success(editingReviewId ? 'Review updated successfully' : 'Review submitted successfully');
            setEditingReviewId(null);
            reset({ rating: 5, title: '', comment: '' });
            setReviewSort('recent');
            setReviewPage(1);
            await Promise.all([loadReviews(product._id, 'recent', 1), loadProductDetail()]);
        } catch (error) {
            notify.error(error, editingReviewId ? 'Failed to update review' : 'Failed to submit review');
        }
    };

    const startEditingReview = (review) => {
        if (!review?._id) return;
        setEditingReviewId(review._id);
        setValue('rating', Number(review.rating) || 5, { shouldValidate: true, shouldDirty: true });
        setValue('title', review.title || '', { shouldValidate: true, shouldDirty: true });
        setValue('comment', review.comment || '', { shouldValidate: true, shouldDirty: true });
    };

    const cancelEditingReview = () => {
        setEditingReviewId(null);
        reset({ rating: 5, title: '', comment: '' });
    };

    const handleDeleteReview = async (reviewId) => {
        if (!authService.isAuthenticated()) {
            navigate('/login');
            return;
        }

        if (!reviewId || !product?._id) return;
        const confirmed = window.confirm('Delete your review?');
        if (!confirmed) return;

        try {
            await reviewService.deleteReview(reviewId);
            notify.success('Review deleted successfully');
            if (editingReviewId === reviewId) {
                cancelEditingReview();
            }
            setReviewSort('recent');
            setReviewPage(1);
            await Promise.all([loadReviews(product._id, 'recent', 1), loadProductDetail()]);
        } catch (error) {
            notify.error(error, 'Failed to delete review');
        }
    };

    const handleReviewSortChange = (sort) => {
        setReviewSort(sort);
        setReviewPage(1);
        if (product?._id) loadReviews(product._id, sort, 1);
    };

    const handleLoadMoreReviews = () => {
        const nextPage = reviewPage + 1;
        setReviewPage(nextPage);
        if (product?._id) loadReviews(product._id, reviewSort, nextPage, true);
    };

    const handleHelpfulVote = async (reviewId) => {
        if (!authService.isAuthenticated()) {
            navigate('/login');
            return;
        }
        try {
            const response = await reviewService.markHelpful(reviewId);
            if (response?.success) {
                setReviews((prev) =>
                    prev.map((r) => {
                        if (r._id !== reviewId) return r;
                        const voted = response.data?.voted;
                        const helpfulCount = response.data?.helpful ?? r.helpful;
                        const voters = Array.isArray(r.helpfulVoters) ? [...r.helpfulVoters] : [];
                        if (voted && !voters.includes(currentUserId)) voters.push(currentUserId);
                        if (!voted) {
                            const idx = voters.indexOf(currentUserId);
                            if (idx !== -1) voters.splice(idx, 1);
                        }
                        return { ...r, helpful: helpfulCount, helpfulVoters: voters };
                    }),
                );
            }
        } catch (error) {
            notify.error(error, 'Failed to update helpful vote');
        }
    };

    const activeVariants = useMemo(() =>
        product?.hasVariants ? (product.variants || []).filter(v => !v.status || v.status === 'active') : [],
        [product]
    );
    const variantTypes = useMemo(() => buildVariantTypes(activeVariants), [activeVariants]);
    const selectedVariant = useMemo(() =>
        product?.hasVariants ? findMatchingVariant(activeVariants, selectedOpts) : null,
        [activeVariants, selectedOpts, product]
    );

    const handleOptionSelect = (typeId, optionId) => {
        setSelectedOpts((prev) => ({ ...prev, [typeId]: optionId }));
        setSelectedImage(0);
    };

    const images = useMemo(() => {
        const varImgs = Array.isArray(selectedVariant?.images) ? selectedVariant.images : [];
        if (varImgs.length) return varImgs;
        if (product?.images?.length) return product.images;
        return [{ path: '__placeholder__', isPrimary: true }];
    }, [selectedVariant, product]);

    const getImgSrc = (imgObj) => {
        const path = typeof imgObj === 'string' ? imgObj : (imgObj?.path || imgObj?.url);
        if (!path || path === '__placeholder__') return getRandomProductImage();
        return resolveImageUrl(path, { placeholder: getRandomProductImage() });
    };

    const pricing = product ? getProductDisplayPricing(product, { selectedVariantId: selectedVariant?._id }) : null;
    const hasDiscount = pricing?.hasDiscount;
    const finalPriceLabel = pricing
        ? pricing.isRange
            ? `${fmt(pricing.minPrice)} – ${fmt(pricing.maxPrice)}`
            : fmt(pricing.finalPrice)
        : '';
    const variantStock = selectedVariant?.stock ?? (product?.baseStock ?? null);
    const isInStock = variantStock === null || variantStock > 0;

    const handleAddToCart = async () => {
        if (!authService.isAuthenticated()) { navigate('/login'); return false; }
        if (product?.hasVariants && !selectedVariant) { notify.error('Please select all options'); return false; }
        try {
            const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.CART}`, {
                method: 'POST',
                headers: authService.getAuthHeaders(),
                credentials: 'include',
                body: JSON.stringify({ productId: product._id, variantId: selectedVariant?._id || null, quantity }),
            });
            const data = await response.json();
            if (!response.ok || !data?.success) throw new Error(data?.message || 'Failed to add to cart');
            window.dispatchEvent(new Event('cart:changed'));
            notify.success(`Added ${quantity} item(s) to cart`);
            return true;
        } catch (error) { notify.error(error.message || 'Failed to add to cart'); return false; }
    };

    const handleBuyNow = async () => { const ok = await handleAddToCart(); if (ok) navigate('/cart'); };

    const handleSimilarProductAddToCart = async (similarProduct) => {
        if (!authService.isAuthenticated()) { navigate('/login'); return; }
        if (similarProduct?.hasVariants) { navigate(`/products/${similarProduct._id}`); return; }
        try {
            const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.CART}`, {
                method: 'POST',
                headers: authService.getAuthHeaders(),
                credentials: 'include',
                body: JSON.stringify({ productId: similarProduct._id, variantId: null, quantity: 1 }),
            });
            const data = await response.json();
            if (!response.ok || !data?.success) throw new Error(data?.message || 'Failed to add to cart');
            window.dispatchEvent(new Event('cart:changed'));
            notify.success('Added to cart');
        } catch (error) { notify.error(error.message || 'Failed to add to cart'); }
    };

    const handleWishlistToggle = async (productId) => {
        if (!authService.isAuthenticated()) { navigate('/login'); return; }
        const inWishlist = wishlistItems.includes(productId);
        try {
            if (inWishlist) {
                await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.WISHLIST}/${productId}`, { 
                    method: 'DELETE', 
                    headers: authService.getAuthHeaders(),
                    credentials: 'include'
                });
                setWishlistItems(prev => prev.filter(id => id !== productId));
                notify.success('Removed from wishlist');
            } else {
                await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.WISHLIST}`, { 
                    method: 'POST', 
                    headers: authService.getAuthHeaders(),
                    credentials: 'include',
                    body: JSON.stringify({ productId })
                });
                setWishlistItems(prev => [...prev, productId]);
                notify.success('Added to wishlist');
            }
        } catch { notify.error(inWishlist ? 'Failed to remove from wishlist' : 'Failed to add to wishlist'); }
    };

    const getSimilarProductImage = (product) => {
        const images = Array.isArray(product?.images) ? product.images : [];
        if (images.length === 0) return getRandomProductImage();
        const primaryImage = images.find(img => img?.isPrimary);
        const firstImage = primaryImage || images[0];
        const path = typeof firstImage === 'string' ? firstImage : (firstImage?.path || firstImage?.url);
        return resolveImageUrl(path, { placeholder: getRandomProductImage() });
    };

    if (isLoading) return (
        <div className="flex min-h-[400px] items-center justify-center">
            <div className="store-surface p-12 text-center">
                <div className="mx-auto mb-5 h-14 w-14 animate-spin rounded-full border-[3px] border-[#d2dff9] border-t-[#f9730c]" />
                <p className="store-display text-lg text-[#212191]">Loading product…</p>
            </div>
        </div>
    );

    if (!product) return (
        <div className="flex min-h-[400px] items-center justify-center px-4">
            <div className="store-surface p-12 text-center">
                <div className="mb-3 text-5xl">😕</div>
                <h2 className="store-display mb-2 text-xl">Product Not Found</h2>
                <p className="mb-6 text-sm text-[#666]">The product you're looking for doesn't exist.</p>
                <button onClick={() => navigate('/')} className="store-btn-primary tap-bounce inline-block rounded-2xl px-7 py-3 text-sm font-bold">Back to Home</button>
            </div>
        </div>
    );

    return (
        <div className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
            {/* Breadcrumb */}
            <nav className="mb-6 flex flex-wrap items-center gap-1.5 text-sm">
                <Link to="/" className="text-[#4250d5] hover:underline font-medium">Home</Link>
                <span className="text-[#999]">/</span>
                <Link to="/products" className="text-[#4250d5] hover:underline font-medium">{product.category?.title || 'Products'}</Link>
                <span className="text-[#999]">/</span>
                <span className="truncate text-[#666]">{product.title}</span>
            </nav>

            <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 mb-10">

                {/* ── Image gallery ──────────────────────────────────────── */}
                <div className="space-y-3">
                    <div className="store-surface overflow-hidden p-3">
                        <div className="relative aspect-square overflow-hidden rounded-xl bg-gradient-to-br from-slate-50 to-blue-50">
                            <img
                                src={getImgSrc(images[selectedImage])}
                                alt={`${product.title} ${selectedImage + 1}`}
                                className="h-full w-full object-contain"
                                onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = getRandomProductImage(); }}
                            />
                            {product.condition && (
                                <span className="absolute left-4 top-4 rounded-full bg-gradient-to-r from-[#4250d5] to-[#f9730c] px-4 py-1.5 text-xs font-bold text-white shadow">
                                    {product.condition === PRODUCT_CONDITIONS.HOT && '🔥 Hot'}
                                    {product.condition === PRODUCT_CONDITIONS.NEW && '✨ New'}
                                    {product.condition === PRODUCT_CONDITIONS.DEFAULT && '⭐ Trending'}
                                </span>
                            )}
                            {hasDiscount && (
                                <span className="absolute right-4 top-4 rounded-full bg-[rgba(249,115,12,0.9)] px-3 py-1.5 text-xs font-bold text-white shadow">
                                    -{Math.round(pricing.discount)}% OFF
                                </span>
                            )}
                        </div>
                    </div>
                    {images.length > 1 && (
                        <div className="flex gap-2 overflow-x-auto pb-1">
                            {images.map((img, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => setSelectedImage(idx)}
                                    className={`flex-shrink-0 store-surface h-20 w-20 overflow-hidden transition-all ${selectedImage === idx ? 'ring-2 ring-[#2874f0] ring-offset-1' : 'opacity-60 hover:opacity-100'}`}
                                >
                                    <img
                                        src={getImgSrc(img)}
                                        alt={`${product.title} ${idx + 1}`}
                                        className="h-full w-full object-contain"
                                        onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = getRandomProductImage(); }}
                                    />
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* ── Product info ───────────────────────────────────────── */}
                <div className="space-y-5">
                    {/* Brand + SKU */}
                    <div className="flex items-center gap-2">
                        <span className="rounded-xl border border-[rgba(165,187,252,0.35)] bg-[rgba(66,80,213,0.06)] px-3 py-1 text-sm font-semibold text-[#4250d5]">
                            {product.brand?.title || 'Brand'}
                        </span>
                        <span className="text-xs text-[#999]">SKU: {(selectedVariant?.sku || product.baseSku || product._id?.substring(0, 8))?.toUpperCase()}</span>
                    </div>

                    <h1 className="store-display text-2xl font-bold leading-snug text-[#212121] sm:text-3xl">{product.title}</h1>

                    {/* Rating */}
                    <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1 rounded bg-[#388e3c] px-2 py-0.5 text-sm font-bold text-white">
                            {(product.ratings?.average || 4).toFixed(1)}
                            <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                        </span>
                        <span className="text-sm text-[#878787]">{product.ratings?.count || 0} ratings</span>
                    </div>

                    {/* Price */}
                    <div className="border-t border-b border-[rgba(165,187,252,0.2)] py-4">
                        <div className="flex items-baseline gap-3 flex-wrap">
                            <span className="text-3xl font-bold text-[#212121]">{finalPriceLabel}</span>
                            {hasDiscount && !pricing.isRange && (
                                <>
                                    <span className="text-lg text-[#878787] line-through">{fmt(pricing.basePrice)}</span>
                                    <span className="text-base font-semibold text-[#388e3c]">{Math.round(pricing.discount)}% off</span>
                                </>
                            )}
                        </div>
                        {hasDiscount && <p className="mt-1 text-sm text-[#388e3c]">You save {fmt(pricing.savings)}</p>}
                        <div className="mt-2 flex items-center gap-3 text-sm">
                            {isInStock
                                ? <span className="font-medium text-[#388e3c]">✓ In Stock{variantStock !== null && variantStock <= 10 && ` (${variantStock} left)`}</span>
                                : <span className="font-medium text-red-500">✕ Out of Stock</span>
                            }
                            <span className="text-[#bbb]">|</span>
                            <span className="text-[#666]">🚚 Free Delivery</span>
                        </div>
                    </div>

                    {/* ── Flipkart-style Variant Selectors ───────────────── */}
                    {product.hasVariants && variantTypes.length > 0 && (
                        <div className="space-y-4">
                            {variantTypes.map((vt) => {
                                const isColor = vt.typeName?.toLowerCase() === 'color';
                                const selectedOptId = selectedOpts[vt.typeId];
                                const selectedLabel = vt.options.find(o => o.optionId === selectedOptId)?.displayValue;
                                return (
                                    <div key={vt.typeId}>
                                        <p className="mb-2 text-sm font-semibold text-[#212121]">
                                            {vt.typeDisplayName}
                                            {selectedLabel && <span className="ml-2 font-normal text-[#878787]">{selectedLabel}</span>}
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                            {vt.options.map((opt) => {
                                                const sel = selectedOpts[vt.typeId] === opt.optionId;
                                                const avail = isOptionAvailable(activeVariants, selectedOpts, vt.typeId, opt.optionId);
                                                return isColor
                                                    ? <ColorSwatch key={opt.optionId} option={opt} selected={sel} available={avail} onClick={(oid) => handleOptionSelect(vt.typeId, oid)} />
                                                    : <PillOption key={opt.optionId} option={opt} selected={sel} available={avail} onClick={(oid) => handleOptionSelect(vt.typeId, oid)} />;
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Unavailable combination warning */}
                    {product.hasVariants && !selectedVariant && Object.keys(selectedOpts).length > 0 && (
                        <p className="text-sm text-amber-600 bg-amber-50 rounded-lg px-3 py-2 border border-amber-200">
                            This combination is not available. Try a different selection.
                        </p>
                    )}

                    {/* Quantity */}
                    <div>
                        <p className="mb-2 text-sm font-semibold text-[#212121]">Quantity</p>
                        <div className="flex items-center gap-3">
                            <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="flex h-10 w-10 items-center justify-center rounded-xl border border-[rgba(165,187,252,0.4)] bg-[rgba(66,80,213,0.04)] font-bold text-[#4250d5] hover:bg-[rgba(66,80,213,0.1)] transition">−</button>
                            <input type="number" value={quantity} min="1" onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))} className="store-input h-10 w-20 rounded-xl text-center font-semibold" />
                            <button onClick={() => setQuantity(quantity + 1)} className="flex h-10 w-10 items-center justify-center rounded-xl border border-[rgba(165,187,252,0.4)] bg-[rgba(66,80,213,0.04)] font-bold text-[#4250d5] hover:bg-[rgba(66,80,213,0.1)] transition">+</button>
                        </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-3">
                        <button onClick={handleBuyNow} disabled={!isInStock} className="store-btn-primary tap-bounce flex-1 rounded-xl py-4 text-base font-bold disabled:opacity-50 disabled:cursor-not-allowed">
                            Buy Now
                        </button>
                        <button onClick={handleAddToCart} disabled={!isInStock} className="store-btn-secondary tap-bounce flex-1 rounded-xl py-4 text-base font-bold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5-5M7 13l-2.5 5M17 13v6a2 2 0 01-2 2H9a2 2 0 01-2-2v-6" /></svg>
                            Add to Cart
                        </button>
                        <button
                            onClick={() => handleWishlistToggle(product._id)}
                            className={`flex h-[56px] w-[56px] flex-shrink-0 items-center justify-center rounded-xl border-2 transition-all tap-bounce ${
                                wishlistItems.includes(product._id)
                                    ? 'border-red-200 bg-red-50 text-red-500 hover:bg-red-100'
                                    : 'border-[rgba(165,187,252,0.4)] bg-white text-[#999] hover:text-red-500 hover:border-red-200'
                            }`}
                            aria-label={wishlistItems.includes(product._id) ? 'Remove from wishlist' : 'Add to wishlist'}
                        >
                            <svg className="h-6 w-6" fill={wishlistItems.includes(product._id) ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                            </svg>
                        </button>
                    </div>

                    {/* Trust badges */}
                    <div className="grid grid-cols-2 gap-3 pt-4 border-t border-[rgba(165,187,252,0.25)]">
                        {[['🛡️', 'Secure Payment'], ['↩️', '30-Day Returns'], ['✔', 'Genuine Product'], ['📦', 'Fast Delivery']].map(([icon, label]) => (
                            <div key={label} className="flex items-center gap-2 text-sm text-[#666]"><span>{icon}</span><span>{label}</span></div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Description */}
            <div className="store-surface mb-6 p-7">
                <h2 className="store-display mb-4 text-xl text-[#131313]">Product Description</h2>
                <p className="text-[#444] leading-relaxed whitespace-pre-line">
                    {product.description || `Experience the premium quality of ${product.title}. This exceptional product from ${product.brand?.title || 'our trusted brand'} combines innovative design with superior functionality.`}
                </p>
            </div>

            <div className="store-surface mb-6 p-7">
                {/* Rating Summary + Sort Header */}
                <div className="mb-6 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <h2 className="store-display text-xl text-[#131313]">Customer Reviews</h2>
                        <p className="mt-1 text-sm text-[#666]">{reviewPagination?.total ?? reviews.length} review{(reviewPagination?.total ?? reviews.length) === 1 ? '' : 's'}</p>
                    </div>
                    {reviews.length > 0 && (
                        <select
                            value={reviewSort}
                            onChange={(e) => handleReviewSortChange(e.target.value)}
                            className="store-input rounded-xl px-3 py-2 text-sm sm:w-48"
                        >
                            {REVIEW_SORT_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    )}
                </div>

                {/* Rating Breakdown */}
                {product?.ratings?.count > 0 && (
                    <div className="mb-7 flex flex-col gap-5 rounded-xl border border-[rgba(165,187,252,0.25)] p-5 sm:flex-row sm:items-center sm:gap-8">
                        <div className="flex flex-col items-center">
                            <span className="text-4xl font-bold text-[#212121]">{(product.ratings.average || 0).toFixed(1)}</span>
                            <div className="mt-1 flex items-center gap-0.5">
                                {[1, 2, 3, 4, 5].map((s) => (
                                    <svg key={s} className={`h-4 w-4 ${s <= Math.round(product.ratings.average) ? 'text-[#ffa336]' : 'text-[#d1d5db]'}`} fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                    </svg>
                                ))}
                            </div>
                            <span className="mt-1 text-xs text-[#878787]">{product.ratings.count} total</span>
                        </div>
                        <div className="flex-1 space-y-1.5">
                            {[5, 4, 3, 2, 1].map((star) => (
                                <RatingBar
                                    key={star}
                                    star={star}
                                    count={product.ratings.distribution?.[star] || 0}
                                    total={product.ratings.count}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {/* Review Form Area */}
                {isAdmin ? (
                    <div className="mb-7 rounded-xl border border-[rgba(165,187,252,0.3)] bg-[rgba(66,80,213,0.03)] p-4 sm:p-5">
                        <p className="text-sm text-[#666]">Admins cannot submit product reviews.</p>
                    </div>
                ) : !reviewOrderId ? (
                    <div className="mb-7 rounded-xl border border-[rgba(165,187,252,0.3)] bg-[rgba(66,80,213,0.03)] p-4 sm:p-5">
                        <p className="text-sm text-[#444]">To add a review, open this product from <span className="font-semibold">My Orders</span> and use <span className="font-semibold">Rate & Review</span>.</p>
                        <Link
                            to="/account/orders"
                            className="store-btn-secondary tap-bounce mt-3 inline-flex rounded-xl px-5 py-2.5 text-sm font-bold"
                        >
                            Go to My Orders
                        </Link>
                    </div>
                ) : myReview && !isEditingReview ? (
                    <div className="mb-7 rounded-xl border border-[rgba(165,187,252,0.3)] bg-[rgba(66,80,213,0.03)] p-4 sm:p-5">
                        <p className="text-sm text-[#444]">You already reviewed this product. You can edit or delete your review below.</p>
                        <button
                            type="button"
                            onClick={() => startEditingReview(myReview)}
                            className="store-btn-secondary tap-bounce mt-3 rounded-xl px-5 py-2.5 text-sm font-bold"
                        >
                            Edit My Review
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit(handleReviewSubmit)} className="mb-7 rounded-xl border border-[rgba(165,187,252,0.3)] bg-[rgba(66,80,213,0.03)] p-4 sm:p-5">
                        <input type="hidden" {...register('rating')} />
                        <p className="mb-2 text-sm font-semibold text-[#212121]">Your Rating</p>
                        <div className="mb-2 flex items-center gap-1.5">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                    key={star}
                                    type="button"
                                    onClick={() => setValue('rating', star, { shouldDirty: true, shouldValidate: true })}
                                    className={`text-2xl leading-none transition ${star <= Number(selectedReviewRating || 0) ? 'text-[#ffa336]' : 'text-[#d1d5db] hover:text-[#fbbf24]'}`}
                                    aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
                                >
                                    ★
                                </button>
                            ))}
                            <span className="ml-2 text-xs text-[#878787]">
                                {['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][Number(selectedReviewRating) || 0] || ''}
                            </span>
                        </div>
                        {errors.rating && <p className="mb-3 text-xs text-red-600">{errors.rating.message}</p>}

                        <div className="mb-3">
                            <input
                                type="text"
                                placeholder="Review title (optional)"
                                className="store-input w-full rounded-xl px-3 py-2.5 text-sm"
                                maxLength={100}
                                {...register('title')}
                            />
                            {errors.title && <p className="mt-1 text-xs text-red-600">{errors.title.message}</p>}
                        </div>

                        <div className="mb-4">
                            <textarea
                                rows={4}
                                placeholder="Write your review (min 10 characters)"
                                className="store-input w-full rounded-xl px-3 py-2.5 text-sm"
                                maxLength={1000}
                                {...register('comment')}
                            />
                            {errors.comment && <p className="mt-1 text-xs text-red-600">{errors.comment.message}</p>}
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="store-btn-primary tap-bounce rounded-xl px-5 py-2.5 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {isSubmitting ? (isEditingReview ? 'Updating...' : 'Submitting...') : (isEditingReview ? 'Update Review' : 'Submit Review')}
                            </button>
                            {isEditingReview && (
                                <button
                                    type="button"
                                    onClick={cancelEditingReview}
                                    className="store-btn-secondary tap-bounce rounded-xl px-5 py-2.5 text-sm font-bold"
                                >
                                    Cancel
                                </button>
                            )}
                        </div>
                    </form>
                )}

                {/* Review List */}
                {reviewsLoading && reviews.length === 0 ? (
                    <div className="space-y-4">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="animate-pulse rounded-xl border border-[rgba(165,187,252,0.25)] p-4">
                                <div className="mb-2 flex items-center gap-2">
                                    <div className="h-8 w-8 rounded-full bg-slate-200" />
                                    <div className="h-4 w-24 rounded bg-slate-200" />
                                </div>
                                <div className="mb-2 h-3 w-32 rounded bg-slate-200" />
                                <div className="h-4 w-full rounded bg-slate-200" />
                                <div className="mt-1 h-4 w-2/3 rounded bg-slate-200" />
                            </div>
                        ))}
                    </div>
                ) : reviews.length === 0 ? (
                    <p className="text-sm text-[#666]">No reviews yet. Be the first to review this product.</p>
                ) : (
                    <div className="space-y-4">
                        {reviews.map((review) => {
                            const rawName = review?.userId?.name || 'Customer';
                            const maskedName = maskReviewerName(rawName);
                            const createdLabel = review?.createdAt ? new Date(review.createdAt).toLocaleDateString() : 'Recently';
                            const rating = Math.max(1, Math.min(5, Number(review?.rating || 0)));
                            const reviewUserId = typeof review?.userId === 'object' ? review.userId?._id : review?.userId;
                            const isOwnReview = currentUserId && reviewUserId && String(currentUserId) === String(reviewUserId);
                            const canManageOwnReview = Boolean(reviewOrderId) && isOwnReview;
                            const helpfulCount = review?.helpful || 0;
                            const userVoted = Array.isArray(review?.helpfulVoters) && currentUserId
                                ? review.helpfulVoters.some((v) => String(v) === String(currentUserId))
                                : false;
                            const isVerified = review?.verifiedPurchase || review?.isVerifiedPurchase;
                            const reviewImages = Array.isArray(review?.images) ? review.images.filter(Boolean) : [];

                            return (
                                <article key={review._id} className="rounded-xl border border-[rgba(165,187,252,0.25)] p-4">
                                    <div className="mb-2 flex items-start justify-between gap-3">
                                        <div className="flex items-center gap-2.5">
                                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[rgba(66,80,213,0.1)] text-xs font-bold text-[#4250d5]">
                                                {rawName.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold text-[#1f1f1f]">
                                                    {isOwnReview ? 'You' : maskedName}
                                                </p>
                                                <p className="text-xs text-[#878787]">{createdLabel}</p>
                                            </div>
                                        </div>
                                        <span className="flex items-center gap-1 rounded bg-[#388e3c] px-2 py-0.5 text-xs font-bold text-white">
                                            {rating}
                                            <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                                        </span>
                                    </div>

                                    {isVerified && (
                                        <span className="mb-2 inline-flex items-center gap-1 rounded-full border border-[rgba(56,142,60,0.35)] bg-[rgba(56,142,60,0.1)] px-2.5 py-0.5 text-[11px] font-semibold text-[#2f7d32]">
                                            ✓ Verified Purchase
                                        </span>
                                    )}

                                    {review?.title && <p className="mb-1 text-sm font-semibold text-[#212121]">{review.title}</p>}
                                    <p className="text-sm leading-relaxed text-[#444]">{review.comment}</p>

                                    {reviewImages.length > 0 && (
                                        <div className="mt-2 flex gap-2 overflow-x-auto">
                                            {reviewImages.map((img, idx) => (
                                                <img
                                                    key={idx}
                                                    src={resolveImageUrl(img)}
                                                    alt={`Review image ${idx + 1}`}
                                                    className="h-16 w-16 flex-shrink-0 rounded-lg border border-[rgba(165,187,252,0.3)] object-cover"
                                                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                                />
                                            ))}
                                        </div>
                                    )}

                                    <div className="mt-3 flex items-center gap-3">
                                        {!isOwnReview && currentUserId && (
                                            <button
                                                type="button"
                                                onClick={() => handleHelpfulVote(review._id)}
                                                className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                                                    userVoted
                                                        ? 'border-[#2874f0] bg-[#eff5ff] text-[#2874f0]'
                                                        : 'border-[rgba(165,187,252,0.4)] text-[#666] hover:border-[#2874f0] hover:text-[#2874f0]'
                                                }`}
                                            >
                                                <svg className="h-3.5 w-3.5" fill={userVoted ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                                                </svg>
                                                Helpful{helpfulCount > 0 ? ` (${helpfulCount})` : ''}
                                            </button>
                                        )}
                                        {isOwnReview && helpfulCount > 0 && (
                                            <span className="text-xs text-[#878787]">{helpfulCount} found helpful</span>
                                        )}

                                        {canManageOwnReview && (
                                            <>
                                                <button
                                                    type="button"
                                                    onClick={() => startEditingReview(review)}
                                                    className="rounded-lg border border-[rgba(66,80,213,0.3)] px-3 py-1.5 text-xs font-semibold text-[#4250d5] hover:bg-[rgba(66,80,213,0.06)]"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteReview(review._id)}
                                                    className="rounded-lg border border-[rgba(239,68,68,0.35)] px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
                                                >
                                                    Delete
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </article>
                            );
                        })}

                        {/* Load More */}
                        {reviewPagination?.hasNext && (
                            <div className="pt-2 text-center">
                                <button
                                    type="button"
                                    onClick={handleLoadMoreReviews}
                                    disabled={reviewsLoading}
                                    className="store-btn-secondary tap-bounce rounded-xl px-6 py-2.5 text-sm font-bold disabled:opacity-60"
                                >
                                    {reviewsLoading ? 'Loading...' : 'Load More Reviews'}
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Specifications */}
            <div className="store-surface p-7 mb-8">
                <h2 className="store-display mb-5 text-xl text-[#131313]">Specifications</h2>
                <div className="grid grid-cols-1 gap-0 md:grid-cols-2">
                    {[
                        ['Brand', product.brand?.title || 'N/A'],
                        ['Category', product.category?.title || 'N/A'],
                        ['Condition', product.condition || 'New'],
                        ['Availability', isInStock ? 'In Stock' : 'Out of Stock'],
                        ...(selectedVariant ? [['SKU', selectedVariant.sku || 'N/A'], ['Variant', selectedVariant.displayName || 'N/A']] : []),
                    ].map(([k, v]) => (
                        <div key={k} className="flex justify-between border-b border-[rgba(165,187,252,0.2)] py-3">
                            <span className="font-medium text-[#666]">{k}</span>
                            <span className={`font-semibold ${k === 'Availability' ? (isInStock ? 'text-[#27ae60]' : 'text-red-500') : 'text-[#1f1f1f]'}`}>{v}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Similar Products Section */}
            <div className="store-surface p-7">
                <div className="mb-5 flex items-center justify-between">
                    <h2 className="store-display text-xl text-[#131313]">Similar Products</h2>
                    {!similarProductsLoading && similarProducts.length > 0 && (
                        <Link 
                            to={`/products?categoryId=${product.category?._id || product.category?.id}`}
                            className="text-sm font-semibold text-[#2874f0] hover:text-[#1557bf] flex items-center gap-1"
                        >
                            View All <span>→</span>
                        </Link>
                    )}
                </div>
                
                {/* Loading State */}
                {similarProductsLoading && (
                    <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="flex-shrink-0 w-[200px] space-y-3 animate-pulse">
                                <div className="aspect-square bg-slate-200 rounded-xl" />
                                <div className="h-4 bg-slate-200 rounded w-full" />
                                <div className="h-4 w-2/3 bg-slate-200 rounded" />
                                <div className="h-8 bg-slate-200 rounded w-full" />
                            </div>
                        ))}
                    </div>
                )}

                {/* Products Grid */}
                {!similarProductsLoading && similarProducts.length > 0 && (
                    <div className="relative group">
                        <div 
                            id="similar-products-scroll"
                            className="flex gap-4 overflow-x-auto pb-4 scroll-smooth snap-x snap-mandatory"
                            style={{
                                scrollbarWidth: 'thin',
                                scrollbarColor: '#d1d5db transparent',
                                WebkitOverflowScrolling: 'touch'
                            }}
                        >
                            {similarProducts.map((item, index) => (
                                <div key={item._id} className="flex-shrink-0 w-[200px] snap-start">
                                    <ProductCard 
                                        product={item}
                                        currentImage={getSimilarProductImage(item)}
                                        isHovered={hoveredProduct === item._id}
                                        inWishlist={wishlistItems.includes(item._id)}
                                        onHover={() => setHoveredProduct(item._id)}
                                        onLeave={() => setHoveredProduct(null)}
                                        onAddToCart={() => handleSimilarProductAddToCart(item)}
                                        onWishlistToggle={() => handleWishlistToggle(item._id)}
                                        currencyCode={currencyCode}
                                        animDelay={index * 50}
                                    />
                                </div>
                            ))}
                        </div>
                        
                        {/* Scroll buttons */}
                        {similarProducts.length > 4 && (
                            <>
                                <button
                                    onClick={() => {
                                        const container = document.getElementById('similar-products-scroll');
                                        if (container) container.scrollBy({ left: -400, behavior: 'smooth' });
                                    }}
                                    className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 bg-white shadow-lg rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity z-10 hover:bg-slate-50"
                                    aria-label="Scroll left"
                                >
                                    <svg className="w-5 h-5 text-[#212121]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                    </svg>
                                </button>
                                <button
                                    onClick={() => {
                                        const container = document.getElementById('similar-products-scroll');
                                        if (container) container.scrollBy({ left: 400, behavior: 'smooth' });
                                    }}
                                    className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 bg-white shadow-lg rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity z-10 hover:bg-slate-50"
                                    aria-label="Scroll right"
                                >
                                    <svg className="w-5 h-5 text-[#212121]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </button>
                            </>
                        )}
                    </div>
                )}

                {/* No Products Message */}
                {!similarProductsLoading && similarProducts.length === 0 && (
                    <div className="py-12 text-center border-2 border-dashed border-slate-200 rounded-xl">
                        <svg className="w-16 h-16 mx-auto mb-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                        </svg>
                        <p className="text-[#666] text-sm font-medium">No similar products available</p>
                        <Link 
                            to="/products" 
                            className="mt-3 inline-block text-sm text-[#2874f0] hover:text-[#1557bf] font-semibold"
                        >
                            Browse all products →
                        </Link>
                    </div>
                )}
            </div>
            {/* Recently Viewed Products Section */}
            <div className="store-surface p-7 mt-8 mb-8">
                <div className="mb-5 flex items-center justify-between">
                    <div>
                        <h2 className="store-display text-xl text-[#131313]">Recently Viewed</h2>
                        <p className="text-sm text-[#666] mt-1">Products you've viewed recently</p>
                    </div>
                    {recentlyViewed.length > 0 && (
                        <Link 
                            to="/products"
                            className="text-sm font-semibold text-[#2874f0] hover:text-[#1557bf] flex items-center gap-1"
                        >
                            View All <span>→</span>
                        </Link>
                    )}
                </div>

                {/* Products Grid */}
                {recentlyViewed.length > 0 && (
                    <div className="relative group">
                        <div 
                            id="recently-viewed-scroll-container"
                            className="flex gap-4 overflow-x-auto pb-4 scroll-smooth snap-x snap-mandatory"
                            style={{
                                scrollbarWidth: 'thin',
                                scrollbarColor: '#d1d5db transparent',
                                WebkitOverflowScrolling: 'touch'
                            }}
                        >
                            {recentlyViewed.map((prod) => {
                                const recentProductImage = prod.images?.[0] 
                                    ? resolveImageUrl(prod.images[0])
                                    : getRandomProductImage();

                                return (
                                    <div key={prod._id} className="flex-shrink-0 w-[200px] snap-start">
                                        <ProductCard
                                            product={prod}
                                            currentImage={recentProductImage}
                                            inWishlist={wishlistItems.includes(prod._id)}
                                            onWishlistToggle={() => handleWishlistToggle(prod._id)}
                                            onAddToCart={() => handleSimilarProductAddToCart(prod)}
                                            isHovered={hoveredProduct === prod._id}
                                            onHover={() => setHoveredProduct(prod._id)}
                                            onLeave={() => setHoveredProduct(null)}
                                            currencyCode={currencyCode}
                                        />
                                    </div>
                                );
                            })}
                        </div>

                        {/* Scroll Navigation Arrows */}
                        {recentlyViewed.length > 4 && (
                            <>
                                <button
                                    onClick={() => {
                                        const container = document.getElementById('recently-viewed-scroll-container');
                                        if (container) container.scrollBy({ left: -400, behavior: 'smooth' });
                                    }}
                                    className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 bg-white shadow-lg rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity z-10 hover:bg-slate-50"
                                    aria-label="Scroll left"
                                >
                                    <svg className="w-5 h-5 text-[#212121]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                    </svg>
                                </button>
                                <button
                                    onClick={() => {
                                        const container = document.getElementById('recently-viewed-scroll-container');
                                        if (container) container.scrollBy({ left: 400, behavior: 'smooth' });
                                    }}
                                    className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 bg-white shadow-lg rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity z-10 hover:bg-slate-50"
                                    aria-label="Scroll right"
                                >
                                    <svg className="w-5 h-5 text-[#212121]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </button>
                            </>
                        )}
                    </div>
                )}

                {/* No Products Message */}
                {recentlyViewed.length === 0 && (
                    <div className="py-12 text-center border-2 border-dashed border-slate-200 rounded-xl">
                        <svg className="w-16 h-16 mx-auto mb-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-[#666] text-sm font-medium">No recently viewed products</p>
                        <Link 
                            to="/products" 
                            className="mt-3 inline-block text-sm text-[#2874f0] hover:text-[#1557bf] font-semibold"
                        >
                            Browse products →
                        </Link>
                    </div>
                )}
            </div>        </div>
    );
};

export default ProductDetailPage;
