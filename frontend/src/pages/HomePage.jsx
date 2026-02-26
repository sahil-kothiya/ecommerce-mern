import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getRandomProductImage } from '../services/imageService';
import { formatPrice, getProductDisplayPricing } from '../utils/productUtils';
import { getImageSource, getPrimaryProductImage, resolveImageUrl } from '../utils/imageUrl';
import { API_CONFIG, CURRENCY_CONFIG } from '../constants';
import authService from '../services/authService';
import notify from '../utils/notify';
import LazyImage from '../components/common/LazyImage';
import { useSiteSettings } from '../context/useSiteSettings';
import ProductCard from '../components/product/ProductCard';
import { getRecentlyViewed } from '../utils/recentlyViewed';
import { resolveBannerAction } from '../utils/bannerLink';

const PRODUCT_FETCH_LIMIT = 48;
const FEATURED_CATEGORY_LIMIT = 12;
const FEATURED_PRODUCTS_TARGET = 24;
const PRODUCTS_PER_CATEGORY_LIMIT = 16;
const IMAGE_ROTATION_INTERVAL = 1400;
const BANNER_URL = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.BANNERS}?limit=5&status=active`;

const parseCategoryList = (payload) => {
    if (Array.isArray(payload?.data?.categories)) return payload.data.categories;
    if (Array.isArray(payload?.data?.items)) return payload.data.items;
    if (Array.isArray(payload?.data)) return payload.data;
    return [];
};

const normalizeCategoryKey = (value) => String(value || '').trim().toLowerCase();

const productInCategory = (product, category) => {
    const productSlug = normalizeCategoryKey(product?.category?.slug);
    const categorySlug = normalizeCategoryKey(category?.slug);
    if (productSlug && categorySlug && productSlug === categorySlug) return true;

    const productCategoryId = String(product?.category?.id || product?.category?._id || '').trim();
    const categoryId = String(category?._id || category?.id || '').trim();
    return Boolean(productCategoryId && categoryId && productCategoryId === categoryId);
};

const buildCategoryMap = (cats, products) => {
    const map = {};
    cats.forEach((c) => {
        map[c.slug] = products
            .filter((p) => productInCategory(p, c))
            .slice(0, PRODUCTS_PER_CATEGORY_LIMIT);
    });
    return map;
};

const aggregateFeatured = (cats, buckets, fallback) => {
    const out = [], seen = new Set();
    cats.forEach((c) => (buckets[c.slug] || []).forEach((p) => {
        if (out.length < FEATURED_PRODUCTS_TARGET && p?._id && !seen.has(p._id)) { out.push(p); seen.add(p._id); }
    }));
    for (const p of fallback) {
        if (out.length >= FEATURED_PRODUCTS_TARGET) break;
        if (!p?._id || seen.has(p._id)) continue;
        out.push(p); seen.add(p._id);
    }
    return out.slice(0, FEATURED_PRODUCTS_TARGET);
};

const catIcon = (t = '') => {
    if (t.includes('Electronic')) return '💻';
    if (t.includes('Fashion') || t.includes('Cloth')) return '👗';
    if (t.includes('Home') || t.includes('Furniture')) return '🏠';
    if (t.includes('Sport')) return '⚽';
    if (t.includes('Book')) return '📚';
    if (t.includes('Beauty') || t.includes('Cosmetic')) return '💄';
    if (t.includes('Toy')) return '🧸';
    return '🛍️';
};

const LoadingSkeleton = () => (
    <div className="animate-fade-in-scale">
        {/* Hero skeleton */}
        <div className="store-hero mb-10 h-64 img-shimmer sm:h-80" />

        {/* Stats skeleton */}
        <div className="mb-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="img-shimmer h-[72px] rounded-2xl" />
            ))}
        </div>

        {/* Categories skeleton */}
        <div className="mb-10">
            <div className="mb-5 space-y-2">
                <div className="img-shimmer h-3 w-20 rounded" />
                <div className="img-shimmer h-7 w-52 rounded" />
            </div>
            <div className="grid grid-cols-4 gap-3 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-9">
                {Array.from({ length: 9 }).map((_, i) => (
                    <div key={i} className="img-shimmer h-16 rounded-2xl" />
                ))}
            </div>
        </div>

        {/* Section heading skeleton */}
        <div className="mb-5 flex items-end justify-between">
            <div className="space-y-2">
                <div className="img-shimmer h-3 w-28 rounded" />
                <div className="img-shimmer h-7 w-56 rounded" />
            </div>
            <div className="img-shimmer h-9 w-32 rounded-xl" />
        </div>

        {/* Filter pills skeleton */}
        <div className="mb-6 flex flex-wrap gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="img-shimmer h-8 w-24 rounded-xl" />
            ))}
        </div>

        {/* Product grid skeleton */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
                    <div className="img-shimmer h-56 w-full" />
                    <div className="space-y-2 p-4">
                        <div className="img-shimmer h-3 w-1/3 rounded" />
                        <div className="img-shimmer h-4 w-3/4 rounded" />
                        <div className="img-shimmer h-4 w-1/2 rounded" />
                        <div className="img-shimmer mt-1 h-8 rounded-xl" />
                    </div>
                </div>
            ))}
        </div>
    </div>
);

const HeroBanner = ({ banners, onShopNow, fallbackTitle, fallbackDescription }) => {
    const [activeIdx, setActiveIdx] = useState(0);
    const timerRef = useRef(null);
    const slides = banners.length
        ? banners
        : [{
            title: fallbackTitle || 'Up to 80% Off',
            description: fallbackDescription || 'Discover amazing deals across top categories.',
            image: null,
        }];

    useEffect(() => {
        if (activeIdx >= slides.length) setActiveIdx(0);
    }, [activeIdx, slides.length]);

    const start = useCallback(() => {
        clearInterval(timerRef.current);
        if (slides.length > 1) timerRef.current = setInterval(() => setActiveIdx((p) => (p + 1) % slides.length), 4500);
    }, [slides.length]);

    useEffect(() => { start(); return () => clearInterval(timerRef.current); }, [start]);
    const goTo = (i) => { setActiveIdx(i); start(); };
    const b = slides[activeIdx];

    return (
        <section className="store-hero relative mb-10 overflow-hidden px-8 py-16 sm:px-12 sm:py-20 lg:py-24">
            <div className="absolute inset-0">
                <div
                    className="flex h-full transition-transform duration-700 ease-out"
                    style={{ width: `${slides.length * 100}%`, transform: `translateX(-${activeIdx * (100 / slides.length)}%)` }}
                >
                    {slides.map((slide, idx) => {
                        const slideImage = resolveImageUrl(slide.image || slide.photo, { placeholder: null });
                        return (
                            <div key={slide._id || slide.slug || idx} className="relative h-full" style={{ width: `${100 / slides.length}%` }}>
                                {slideImage ? (
                                    <LazyImage
                                        src={slideImage}
                                        alt={slide.title || `Promo Banner ${idx + 1}`}
                                        wrapperClassName="h-full w-full"
                                        className="h-full w-full object-cover"
                                        rootMargin="0px"
                                        fallback={<div className="h-full w-full bg-gradient-to-r from-[#0a2156] via-[#212191] to-[#f9730c]" />}
                                    />
                                ) : (
                                    <div className="h-full w-full bg-gradient-to-r from-[#0a2156] via-[#212191] to-[#f9730c]" />
                                )}
                                <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-[#1c2f8f]/50 to-[#f9730c]/40" />
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="absolute -right-10 -top-20 h-56 w-56 rounded-full bg-[#ffa336]/20 blur-3xl pointer-events-none animate-hero-orb" />
            <div className="absolute -bottom-16 -left-8 h-48 w-48 rounded-full bg-[#a5bbfc]/20 blur-3xl pointer-events-none animate-hero-orb-alt" />
            <div className="absolute left-1/2 top-1/3 h-40 w-40 -translate-x-1/2 rounded-full bg-[#f9730c]/10 blur-2xl pointer-events-none animate-hero-orb" style={{ animationDuration: '13s' }} />

            <div className="relative z-10 max-w-2xl">
                <span className="animate-fade-up delay-75 mb-5 inline-flex items-center gap-2 rounded-full border border-[rgba(255,255,255,0.2)] bg-[rgba(255,255,255,0.12)] px-4 py-1.5 text-xs font-semibold text-white backdrop-blur-sm">
                    🎉 Limited Time Offer
                </span>
                <h1 className="animate-fade-up delay-150 store-display mb-4 text-4xl leading-tight text-white sm:text-5xl lg:text-6xl">
                    {b?.title || fallbackTitle || 'Up to 80% Off'}
                </h1>
                <p className="animate-fade-up delay-225 mb-7 text-base text-white/85 leading-relaxed sm:text-lg">
                    {b?.description || fallbackDescription || 'Discover amazing deals across top categories.'}
                </p>
                <div className="animate-fade-up delay-300 flex flex-wrap gap-3">
                    <button onClick={() => onShopNow(b)} className="store-btn-primary tap-bounce rounded-2xl px-7 py-3 text-sm font-bold">Shop Now →</button>
                    <Link to="/products" className="inline-flex items-center gap-2 rounded-2xl border border-[rgba(255,255,255,0.3)] bg-[rgba(255,255,255,0.1)] px-7 py-3 text-sm font-semibold text-white backdrop-blur-sm hover:bg-[rgba(255,255,255,0.2)] transition">Browse All</Link>
                </div>
            </div>
            {slides.length > 1 && (
                <div className="absolute bottom-5 left-8 flex items-center gap-2">
                    {slides.map((_, i) => (
                        <button key={i} onClick={() => goTo(i)} className={`h-1.5 rounded-full transition-all ${i === activeIdx ? 'w-6 bg-[#ffa336]' : 'w-1.5 bg-white/40 hover:bg-white/70'}`} />
                    ))}
                </div>
            )}
        </section>
    );
};

const HomePage = () => {
    const navigate = useNavigate();
    const { settings } = useSiteSettings();
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [featuredProducts, setFeaturedProducts] = useState([]);
    const [banners, setBanners] = useState([]);
    const [wishlistItems, setWishlistItems] = useState([]);
    const [recentlyViewed, setRecentlyViewed] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [hoveredProduct, setHoveredProduct] = useState(null);
    const [currentImageIndex, setCurrentImageIndex] = useState({});
    const [sortOption, setSortOption] = useState('newest');
    const hoverIntervalsRef = useRef({});
    const fallbackImageRef = useRef({});
    const failedImageRef = useRef({});

    const getStableFallbackImage = (productId) => {
        const key = String(productId || 'unknown');
        if (!fallbackImageRef.current[key]) {
            fallbackImageRef.current[key] = getRandomProductImage();
        }
        return fallbackImageRef.current[key];
    };

    const getUsableProductImages = (product) => {
        const productId = String(product?._id || 'unknown');
        const failedSet = failedImageRef.current[productId] || new Set();
        const images = Array.isArray(product?.images) ? product.images : [];

        const urls = images
            .map((img) => resolveImageUrl(getImageSource(img), { placeholder: null }))
            .filter((url) => Boolean(url) && !failedSet.has(url));

        console.debug(`[HomePage] getUsableProductImages pid=${productId} total=${images.length} usable=${urls.length} failed=${failedSet.size}`, urls);
        return urls;
    };

    const markProductImageFailed = (product, failedSrc) => {
        if (!product?._id || !failedSrc) return;
        const productId = String(product._id);
        if (!failedImageRef.current[productId]) {
            failedImageRef.current[productId] = new Set();
        }
        failedImageRef.current[productId].add(failedSrc);
        console.debug(`[HomePage] markProductImageFailed pid=${productId} failedSrc=${failedSrc} totalFailed=${failedImageRef.current[productId].size}`);
        setCurrentImageIndex((prev) => ({ ...prev, [productId]: 0 }));
    };

    const loadWishlist = useCallback(async () => {
        if (!authService.isAuthenticated()) { setWishlistItems([]); return; }
        try {
            await authService.getCurrentUser();

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
    }, []);

    const loadData = useCallback(async () => {
        try {
            setIsLoading(true);
            const [prodsRes, catsRes, bannersRes] = await Promise.all([
                fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.PRODUCTS}?limit=${PRODUCT_FETCH_LIMIT}&sort=popular&status=active&includeCount=false`),
                fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.CATEGORIES}`),
                fetch(BANNER_URL).catch(() => null),
            ]);
            if (!prodsRes.ok) throw new Error(`Products ${prodsRes.status}`);
            if (!catsRes.ok) throw new Error(`Categories ${catsRes.status}`);
            const [prodsData, catsData, bannersData] = await Promise.all([
                prodsRes.json(), catsRes.json(),
                bannersRes ? bannersRes.json().catch(() => null) : Promise.resolve(null),
            ]);
            const apiProducts = (prodsData?.data?.products || []).map((p) => ({ ...p, images: Array.isArray(p.images) ? p.images : [] }));
            const apiCategories = parseCategoryList(catsData);
            if (!apiProducts.length) throw new Error('No products');
            const fallbackCategories = Object.values(
                apiProducts.reduce((acc, product) => {
                    const slug = product?.category?.slug;
                    if (!slug || acc[slug]) return acc;
                    acc[slug] = {
                        _id: product?.category?.id || slug,
                        slug,
                        title: product?.category?.title || slug,
                    };
                    return acc;
                }, {})
            );
            const sourceCategories = (apiCategories.length ? apiCategories : fallbackCategories)
                .filter((c) => Boolean(c?.slug));
            const categoriesWithCounts = sourceCategories
                .map((c) => ({ ...c, productCount: apiProducts.filter((p) => productInCategory(p, c)).length }))
                .sort((a, b) => b.productCount - a.productCount).slice(0, FEATURED_CATEGORY_LIMIT);
            const buckets = buildCategoryMap(categoriesWithCounts, apiProducts);
            setProducts(apiProducts);
            setCategories(categoriesWithCounts);
            setFeaturedProducts(aggregateFeatured(categoriesWithCounts, buckets, apiProducts));
            const indices = {};
            apiProducts.forEach((p) => { indices[p._id] = 0; });
            setCurrentImageIndex(indices);
            if (bannersData?.data) {
                const bArr = Array.isArray(bannersData.data) ? bannersData.data : (bannersData.data?.banners || []);
                setBanners(bArr.slice(0, 5));
            }
        } catch (error) {
            notify.error(error, 'Failed to load homepage data');
            setProducts([]); setCategories([]);
        } finally { setIsLoading(false); }
    }, []);

    useEffect(() => {
        loadData(); loadWishlist();
        const recent = getRecentlyViewed(12);
        setRecentlyViewed(recent);
        return () => Object.values(hoverIntervalsRef.current).forEach(clearInterval);
    }, [loadData, loadWishlist]);

    const addToCart = async (product) => {
        if (!authService.isAuthenticated()) { navigate('/login'); return; }
        
        const activeVariants = Array.isArray(product?.variants)
            ? product.variants.filter(v => !v.status || v.status === 'active')
            : [];
        const hasVariants = product?.hasVariants === true && activeVariants.length > 0;
        
        if (hasVariants) {
            notify.info('Redirecting to select your preferred options...');
            navigate(`/products/${product._id}`);
            return;
        }
        try {
            const res = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.CART}`, {
                method: 'POST', headers: authService.getAuthHeaders(),
                credentials: 'include',
                body: JSON.stringify({ productId: product._id, quantity: 1 }),
            });
            const data = await res.json();
            if (!res.ok || !data?.success) throw new Error(data?.message || 'Failed');
            window.dispatchEvent(new Event('cart:changed'));
            notify.success(`"${product.title.slice(0, 30)}" added to cart`);
        } catch (error) { notify.error(error, 'Failed to add to cart'); }
    };

    const toggleWishlist = async (product) => {
        if (!authService.isAuthenticated()) { navigate('/login'); return; }
        const inList = wishlistItems.some((i) => i._id === product._id);
        if (inList) {
            setWishlistItems((prev) => prev.filter((i) => i._id !== product._id));
            try {
                const res = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.WISHLIST}`, { headers: authService.getAuthHeaders(), credentials: 'include' });
                if (!res.ok) {
                    authService.handleUnauthorizedResponse(res);
                    return;
                }
                const data = await res.json();
                const matched = (Array.isArray(data?.data?.items) ? data.data.items : []).find((i) => i.productId?._id === product._id || i.productId === product._id);
                if (matched?._id) {
                    const deleteRes = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.WISHLIST}/${matched._id}`, { method: 'DELETE', headers: authService.getAuthHeaders(), credentials: 'include' });
                    if (!deleteRes.ok) {
                        authService.handleUnauthorizedResponse(deleteRes);
                        return;
                    }
                    window.dispatchEvent(new Event('wishlist:changed'));
                }
            } catch (_err) { /* ignore */ }
        } else {
            setWishlistItems((prev) => prev.some((i) => i._id === product._id) ? prev : [...prev, product]);
            try {
                const createRes = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.WISHLIST}`, { method: 'POST', headers: authService.getAuthHeaders(), credentials: 'include', body: JSON.stringify({ productId: product._id }) });
                if (!createRes.ok) {
                    authService.handleUnauthorizedResponse(createRes);
                    return;
                }
                window.dispatchEvent(new Event('wishlist:changed'));
            } catch (_err) { /* ignore */ }
        }
    };

    const handleProductHover = (product) => {
        setHoveredProduct(product._id);
        const usableImages = getUsableProductImages(product);
        console.debug(`[HomePage] handleProductHover pid=${product._id} usable=${usableImages.length}`, usableImages);
        if (usableImages.length < 2 || hoverIntervalsRef.current[product._id]) return;
        hoverIntervalsRef.current[product._id] = setInterval(() => {
            // Re-compute usable images inside interval to respect any newly failed URLs
            const freshImages = getUsableProductImages(product);
            if (freshImages.length < 1) return;
            setCurrentImageIndex((prev) => {
                const nextIdx = ((prev[product._id] || 0) + 1) % freshImages.length;
                console.debug(`[HomePage] interval tick pid=${product._id} idx ${prev[product._id] || 0} → ${nextIdx} of ${freshImages.length}`);
                return { ...prev, [product._id]: nextIdx };
            });
        }, IMAGE_ROTATION_INTERVAL);
    };

    const handleProductLeave = (product) => {
        setHoveredProduct(null);
        clearInterval(hoverIntervalsRef.current[product._id]);
        delete hoverIntervalsRef.current[product._id];
        console.debug(`[HomePage] handleProductLeave pid=${product._id} — interval cleared`);
        setCurrentImageIndex((prev) => ({ ...prev, [product._id]: 0 }));
    };

    const getProductImage = (product) => {
        const usableImages = getUsableProductImages(product);
        if (usableImages.length > 0) {
            const index = (currentImageIndex[product._id] || 0) % usableImages.length;
            const url = usableImages[index];
            console.debug(`[HomePage] getProductImage pid=${product._id} idx=${index}/${usableImages.length} url=${url}`);
            return url;
        }

        const fallbackPrimary = resolveImageUrl(getImageSource(getPrimaryProductImage(product)), { placeholder: null });
        const resolved = fallbackPrimary;
        const url = resolved || getStableFallbackImage(product?._id);
        console.debug(`[HomePage] getProductImage pid=${product._id} fallback url=${url}`);
        return url;
    };

    const formatCurrency = (price) => {
        const code = String(settings?.currencyCode || CURRENCY_CONFIG.DEFAULT).toUpperCase();
        return formatPrice(price || 0, code, CURRENCY_CONFIG.LOCALE);
    };

    const sortProducts = (list) => {
        const arr = [...list];
        if (sortOption === 'price-low') return arr.sort((a, b) => getProductDisplayPricing(a).minPrice - getProductDisplayPricing(b).minPrice);
        if (sortOption === 'price-high') return arr.sort((a, b) => getProductDisplayPricing(b).maxPrice - getProductDisplayPricing(a).maxPrice);
        if (sortOption === 'rating') return arr.sort((a, b) => (b.ratings?.average || 0) - (a.ratings?.average || 0));
        return arr;
    };

    const featuredGridProducts = sortProducts(featuredProducts.length ? featuredProducts : products.slice(0, FEATURED_PRODUCTS_TARGET));

    const handleHeroShopNow = (banner) => {
        const action = resolveBannerAction(banner);

        if (action.external || action.target === '_blank') {
            window.open(action.href, action.target || '_blank', 'noopener,noreferrer');
            return;
        }

        navigate(action.href || '/products');
    };

    const cardProps = (product) => ({
        product,
        currentImage: getProductImage(product),
        isHovered: hoveredProduct === product._id,
        inWishlist: wishlistItems.some((i) => i._id === product._id),
        onHover: handleProductHover, onLeave: handleProductLeave,
        onAddToCart: addToCart, onWishlistToggle: toggleWishlist,
        onImageError: (failedSrc) => markProductImageFailed(product, failedSrc),
        formatCurrency,
    });

    return (
        <div className="mx-auto max-w-[90rem] px-4 pb-16 sm:px-6 lg:px-8">
            {/* Hero */}
            <HeroBanner
                banners={banners.length ? banners : [{
                    title: settings?.metaTitle || settings?.siteName || 'Up to 80% Off',
                    description: settings?.metaDescription || settings?.siteTagline || 'Discover amazing deals across top categories.',
                    image: null,
                }]}
                onShopNow={handleHeroShopNow}
                fallbackTitle={settings?.metaTitle || settings?.siteName || 'Up to 80% Off'}
                fallbackDescription={settings?.metaDescription || settings?.siteTagline || 'Discover amazing deals across top categories.'}
            />

            {/* Stats strip */}
            <div className="mb-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                    { icon: '🚚', label: 'Free Shipping', sub: 'On orders over $50' },
                    { icon: '🔄', label: 'Easy Returns', sub: '30-day hassle-free' },
                    { icon: '🔒', label: 'Secure Payment', sub: 'SSL encrypted' },
                    { icon: '🎁', label: 'Exclusive Deals', sub: 'Members get more' },
                ].map(({ icon, label, sub }, i) => (
                    <div key={label} style={{ animationDelay: `${i * 80 + 100}ms` }} className="store-surface animate-fade-up flex items-center gap-3 px-4 py-3">
                        <span className="text-xl">{icon}</span>
                        <div>
                            <p className="text-sm font-bold text-[#1f1f1f]">{label}</p>
                            <p className="text-xs text-[#666]">{sub}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Categories */}
            {categories.length > 0 && (
                <section className="animate-fade-up mb-10" style={{ animationDelay: '150ms' }}>
                    <div className="mb-5 flex items-end justify-between">
                        <div>
                            <p className="store-eyebrow mb-1">Explore</p>
                            <h2 className="store-display text-2xl text-[#131313] sm:text-3xl">Shop by Category</h2>
                        </div>
                        <Link to="/products" className="store-btn-secondary tap-bounce rounded-xl px-4 py-2 text-sm">View All →</Link>
                    </div>
                    <div className="grid grid-cols-4 gap-3 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-9">
                        <button onClick={() => navigate('/products')} className="store-category-chip animate-fade-up delay-75 flex flex-col items-center gap-1.5 px-3 py-3 text-center">
                            <span className="text-xl">🛒</span>
                            <span className="text-xs font-semibold">All</span>
                        </button>
                        {categories.slice(0, 8).map((cat, i) => (
                            <button key={cat._id || cat.slug} style={{ animationDelay: `${(i + 2) * 60}ms` }} onClick={() => navigate(`/products?category=${encodeURIComponent(cat.slug)}`)} className="store-category-chip animate-fade-up flex flex-col items-center gap-1.5 px-3 py-3 text-center">
                                <span className="text-xl">{catIcon(cat.title)}</span>
                                <span className="line-clamp-2 text-xs font-semibold leading-tight">{cat.title}</span>
                            </button>
                        ))}
                    </div>
                </section>
            )}

            {/* Products */}
            <section className="animate-fade-up" style={{ animationDelay: '200ms' }}>
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <p className="store-eyebrow mb-1">Curated for You</p>
                        <h2 className="store-display text-xl text-[#131313] sm:text-2xl">
                            Featured Products
                            <span className="ml-2 text-sm font-normal text-[#666]">
                                ({featuredGridProducts.length})
                            </span>
                        </h2>
                    </div>
                    <div className="flex items-center gap-3">
                        <select value={sortOption} onChange={(e) => setSortOption(e.target.value)} className="store-input cursor-pointer rounded-xl px-4 py-2 text-sm">
                            <option value="newest">Newest</option>
                            <option value="price-low">Price: Low → High</option>
                            <option value="price-high">Price: High → Low</option>
                            <option value="rating">Best Rating</option>
                        </select>
                    </div>
                </div>

                {isLoading ? (<LoadingSkeleton />) : featuredGridProducts.length > 0 ? (
                    <div key="all" className="grid grid-cols-2 gap-4 md:grid-cols-4">
                        {featuredGridProducts.map((p, i) => <ProductCard key={p._id} {...cardProps(p)} animDelay={Math.min(i * 45, 700)} />)}
                    </div>
                ) : (
                    <div className="store-surface animate-fade-in-scale py-14 text-center">
                        <div className="text-4xl mb-3">🛍️</div>
                        <h3 className="store-display text-lg text-[#212191] mb-1">No Products Found</h3>
                        <p className="text-sm text-[#666] mb-5">No featured products available yet.</p>
                        <Link to="/products" className="store-btn-primary tap-bounce inline-block rounded-xl px-6 py-2.5 text-sm font-bold">Browse All</Link>
                    </div>
                )}

                {!isLoading && featuredGridProducts.length > 0 && (
                    <div className="mt-10 text-center">
                        <Link to="/products" className="store-btn-primary tap-bounce inline-flex items-center gap-2 rounded-2xl px-8 py-3.5 text-sm font-bold">
                            View All Products
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                        </Link>
                    </div>
                )}
            </section>
            {/* Recently Viewed Products Section */}
            {!isLoading && recentlyViewed.length > 0 && (
                <section className="mb-14">
                    <div className="mb-6">
                        <p className="store-eyebrow mb-2 text-[#666]">Your History</p>
                        <h2 className="store-display text-2xl text-[#131313] sm:text-3xl">Recently Viewed</h2>
                        <p className="text-sm text-[#666] mt-1">Products you've checked out recently</p>
                    </div>

                    <div className="relative group">
                        <div 
                            id="home-recently-viewed-scroll"
                            className="flex gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-4"
                            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                        >
                            {recentlyViewed.map((prod) => {
                                const recentUsableImages = getUsableProductImages(prod);
                                const recentFallback = getStableFallbackImage(prod?._id);
                                const displayImage = recentUsableImages.length > 0
                                    ? recentUsableImages[(currentImageIndex[prod._id] || 0) % recentUsableImages.length]
                                    : (resolveImageUrl(getImageSource(getPrimaryProductImage(prod)), { placeholder: null }) || recentFallback);

                                return (
                                    <div key={prod._id} className="flex-none w-[200px] sm:w-[220px] snap-start">
                                        <ProductCard
                                            product={prod}
                                            currentImage={displayImage}
                                            inWishlist={wishlistItems.includes(prod._id)}
                                            onWishlistToggle={() => toggleWishlist(prod)}
                                            onAddToCart={() => addToCart(prod)}
                                            isHovered={hoveredProduct === prod._id}
                                            onImageError={(failedSrc) => markProductImageFailed(prod, failedSrc)}
                                            onHover={handleProductHover}
                                            onLeave={handleProductLeave}
                                            currencyCode={String(settings?.currencyCode || 'USD').toUpperCase()}
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
                                        const container = document.getElementById('home-recently-viewed-scroll');
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
                                        const container = document.getElementById('home-recently-viewed-scroll');
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
                </section>
            )}
            {/* Trust badges */}
            <section className="mt-14 store-hero rounded-3xl px-8 py-10 text-center sm:px-12">
                <div className="relative">
                    <p className="store-eyebrow mb-2 text-[#d2dff9]">Why Choose Us</p>
                    <h2 className="store-display mb-2 text-2xl text-white sm:text-3xl">Trusted by Thousands</h2>
                    <p className="mb-8 text-sm text-white/80">Join our growing community of happy shoppers worldwide.</p>
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                        {[{ value: '10M+', label: 'Products' }, { value: '500K+', label: 'Happy Customers' }, { value: '99.8%', label: 'Satisfaction Rate' }, { value: '24/7', label: 'Support' }].map(({ value, label }, i) => (
                            <div key={label} style={{ animationDelay: `${i * 90}ms` }} className="animate-fade-up rounded-2xl border border-[rgba(255,255,255,0.15)] bg-[rgba(255,255,255,0.08)] px-4 py-5 backdrop-blur-sm">
                                <p className="store-display text-2xl font-bold text-[#ffa336]">{value}</p>
                                <p className="mt-1 text-xs text-white/75">{label}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        </div>
    );
};

export default HomePage;
