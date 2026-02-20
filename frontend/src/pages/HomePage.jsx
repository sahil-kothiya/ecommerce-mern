import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getRandomProductImage } from '../services/imageService';
import { formatPrice, calculateDiscountPrice } from '../utils/productUtils';
import { API_CONFIG, PRODUCT_CONDITIONS, CURRENCY_CONFIG } from '../constants';
import authService from '../services/authService';
import notify from '../utils/notify';

const PRODUCT_FETCH_LIMIT = 120;
const FEATURED_CATEGORY_LIMIT = 12;
const FEATURED_PRODUCTS_TARGET = 60;
const PRODUCTS_PER_CATEGORY_LIMIT = 40;
const IMAGE_ROTATION_INTERVAL = 1400;
const BANNER_URL = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.BANNERS}?limit=5&status=active`;

const bucketBySlug = (products) =>
    products.reduce((acc, p) => {
        const slug = p.category?.slug;
        if (!slug) return acc;
        if (!acc[slug]) acc[slug] = [];
        if (acc[slug].length < PRODUCTS_PER_CATEGORY_LIMIT) acc[slug].push(p);
        return acc;
    }, {});

const buildCategoryMap = (cats, buckets) => {
    const map = {};
    cats.forEach((c) => { map[c.slug] = buckets[c.slug] || []; });
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

const LoadingScreen = () => (
    <div className="flex min-h-[400px] items-center justify-center">
        <div className="store-surface p-12 text-center">
            <div className="mx-auto mb-5 h-14 w-14 animate-spin rounded-full border-[3px] border-[#d2dff9] border-t-[#f9730c] shadow-[0_0_0_4px_rgba(165,187,252,0.18)]" />
            <p className="store-display text-lg text-[#212191]">Loading amazing products…</p>
            <p className="mt-1 text-sm text-[#666]">Preparing your shopping experience</p>
        </div>
    </div>
);

const HeroBanner = ({ banners, onShopNow }) => {
    const [activeIdx, setActiveIdx] = useState(0);
    const timerRef = useRef(null);
    const start = useCallback(() => {
        clearInterval(timerRef.current);
        if (banners.length > 1) timerRef.current = setInterval(() => setActiveIdx((p) => (p + 1) % banners.length), 4500);
    }, [banners.length]);
    useEffect(() => { start(); return () => clearInterval(timerRef.current); }, [start]);
    const goTo = (i) => { setActiveIdx(i); start(); };
    const b = banners[activeIdx];
    return (
        <section className="store-hero mb-10 px-8 py-16 sm:px-12 sm:py-20 lg:py-24">
            <div className="absolute -right-10 -top-20 h-56 w-56 rounded-full bg-[#ffa336]/25 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-16 -left-8 h-48 w-48 rounded-full bg-[#a5bbfc]/25 blur-3xl pointer-events-none" />
            <div className="relative max-w-2xl">
                <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-[rgba(255,255,255,0.2)] bg-[rgba(255,255,255,0.12)] px-4 py-1.5 text-xs font-semibold text-white backdrop-blur-sm">
                    🎉 Limited Time Offer
                </span>
                <h1 className="store-display mb-4 text-4xl leading-tight text-white sm:text-5xl lg:text-6xl">
                    {b?.title || 'Up to 80% Off'}
                </h1>
                <p className="mb-7 text-base text-white/85 leading-relaxed sm:text-lg">
                    {b?.description || 'Discover amazing deals on fashion, electronics, and more! Free shipping on orders over $50.'}
                </p>
                <div className="flex flex-wrap gap-3">
                    <button onClick={onShopNow} className="store-btn-primary tap-bounce rounded-2xl px-7 py-3 text-sm font-bold">Shop Now →</button>
                    <Link to="/products" className="inline-flex items-center gap-2 rounded-2xl border border-[rgba(255,255,255,0.3)] bg-[rgba(255,255,255,0.1)] px-7 py-3 text-sm font-semibold text-white backdrop-blur-sm hover:bg-[rgba(255,255,255,0.2)] transition">Browse All</Link>
                </div>
            </div>
            {banners.length > 1 && (
                <div className="absolute bottom-5 left-8 flex items-center gap-2">
                    {banners.map((_, i) => (
                        <button key={i} onClick={() => goTo(i)} className={`h-1.5 rounded-full transition-all ${i === activeIdx ? 'w-6 bg-[#ffa336]' : 'w-1.5 bg-white/40 hover:bg-white/70'}`} />
                    ))}
                </div>
            )}
        </section>
    );
};

const ProductCard = ({ product, currentImage, isHovered, inWishlist, onHover, onLeave, onAddToCart, onWishlistToggle, formatCurrency }) => {
    if (!product) return null;
    const hasDiscount = Number(product.baseDiscount) > 0;
    const finalPrice = calculateDiscountPrice(product.basePrice || 0, product.baseDiscount || 0);
    return (
        <Link to={`/products/${product._id}`} className="store-product-card group flex flex-col overflow-hidden"
            onMouseEnter={() => onHover(product)} onMouseLeave={() => onLeave(product)}>
            <div className="relative overflow-hidden bg-gradient-to-br from-slate-50 to-blue-50">
                <img src={currentImage} alt={product.title} className="h-44 w-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
                {product.condition && (
                    <span className="absolute left-3 top-3 rounded-full bg-gradient-to-r from-[#4250d5] to-[#f9730c] px-2.5 py-1 text-[10px] font-bold text-white shadow">
                        {product.condition === PRODUCT_CONDITIONS.HOT && '🔥 Hot'}
                        {product.condition === PRODUCT_CONDITIONS.NEW && '✨ New'}
                        {product.condition === PRODUCT_CONDITIONS.DEFAULT && '⭐ Trending'}
                    </span>
                )}
                {hasDiscount && (
                    <span className="absolute right-10 top-3 rounded-full border border-[rgba(255,163,51,0.5)] bg-[rgba(249,115,12,0.9)] px-2 py-0.5 text-[10px] font-bold text-white">
                        -{Math.round(product.baseDiscount)}%
                    </span>
                )}
                <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onWishlistToggle(product); }}
                    className={`absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full border transition-all ${inWishlist ? 'border-rose-300 bg-rose-100 text-rose-600 shadow' : 'border-[rgba(165,187,252,0.4)] bg-white/80 text-[#4250d5] hover:border-rose-300 hover:bg-rose-50 hover:text-rose-500'} ${isHovered ? 'scale-110' : ''}`}>
                    {inWishlist
                        ? <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5A5.5 5.5 0 017.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3A5.5 5.5 0 0122 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" /></svg>
                        : <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>}
                </button>
            </div>
            <div className="flex flex-1 flex-col gap-2 p-3.5">
                <div className="flex items-center justify-between">
                    <span className="rounded-lg border border-[rgba(165,187,252,0.35)] bg-[rgba(66,80,213,0.06)] px-2 py-0.5 text-[11px] font-semibold text-[#4250d5]">
                        {product.brand?.title || 'Brand'}
                    </span>
                    <div className="flex items-center gap-0.5">
                        <span className="text-[11px] text-[#ffa336]">{'★'.repeat(Math.min(5, Math.floor(product.ratings?.average || 4)))}</span>
                        <span className="text-[10px] text-[#999]">({product.ratings?.count || 0})</span>
                    </div>
                </div>
                <h3 className="line-clamp-2 min-h-[2.5rem] text-sm font-semibold leading-tight text-[#1f1f1f] transition group-hover:text-[#212191]">
                    {product.title}
                </h3>
                <div className="mt-auto space-y-2 pt-1">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                            <span className="text-base font-bold text-[#131313]">{formatCurrency(finalPrice)}</span>
                            {hasDiscount && <span className="text-xs text-[#999] line-through">{formatCurrency(product.basePrice)}</span>}
                        </div>
                        {hasDiscount && <span className="rounded-full border border-green-200 bg-green-50 px-2 py-0.5 text-[10px] font-semibold text-green-700">Save {Math.round(product.baseDiscount)}%</span>}
                    </div>
                    <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onAddToCart(product); }}
                        className="store-btn-primary tap-bounce w-full rounded-xl py-2 text-xs font-bold flex items-center justify-center gap-1.5">
                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m1.6 8L5.4 5M7 13l-1.5 7h13M9 20a1 1 0 100-2 1 1 0 000 2zm8 0a1 1 0 100-2 1 1 0 000 2z" /></svg>
                        Add to Cart
                    </button>
                </div>
            </div>
        </Link>
    );
};

const HomePage = () => {
    const navigate = useNavigate();
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [productsByCategory, setProductsByCategory] = useState({});
    const [featuredProducts, setFeaturedProducts] = useState([]);
    const [banners, setBanners] = useState([]);
    const [wishlistItems, setWishlistItems] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [isLoading, setIsLoading] = useState(true);
    const [hoveredProduct, setHoveredProduct] = useState(null);
    const [currentImageIndex, setCurrentImageIndex] = useState({});
    const [sortOption, setSortOption] = useState('newest');
    const hoverIntervalsRef = useRef({});

    const loadWishlist = useCallback(async () => {
        if (!authService.isAuthenticated()) { setWishlistItems([]); return; }
        try {
            const res = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.WISHLIST}`, { headers: authService.getAuthHeaders() });
            if (res.status === 401) { authService.reset(); setWishlistItems([]); return; }
            if (!res.ok) { setWishlistItems([]); return; }
            const data = await res.json();
            setWishlistItems((Array.isArray(data?.data?.items) ? data.data.items : []).map((i) => i.productId).filter(Boolean));
        } catch { setWishlistItems([]); }
    }, []);

    const loadData = useCallback(async () => {
        try {
            setIsLoading(true);
            const [prodsRes, catsRes, bannersRes] = await Promise.all([
                fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.PRODUCTS}?limit=${PRODUCT_FETCH_LIMIT}&sort=-popularity`),
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
            const apiCategories = Array.isArray(catsData?.data) ? catsData.data : (catsData?.data?.categories || []);
            if (!apiProducts.length) throw new Error('No products');
            const categoriesWithCounts = apiCategories
                .map((c) => ({ ...c, productCount: apiProducts.filter((p) => p.category?.slug === c.slug).length }))
                .sort((a, b) => b.productCount - a.productCount).slice(0, FEATURED_CATEGORY_LIMIT);
            const buckets = bucketBySlug(apiProducts);
            setProducts(apiProducts);
            setCategories(categoriesWithCounts);
            setProductsByCategory(buildCategoryMap(categoriesWithCounts, buckets));
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
        return () => Object.values(hoverIntervalsRef.current).forEach(clearInterval);
    }, [loadData, loadWishlist]);

    const addToCart = async (product) => {
        if (!authService.isAuthenticated()) { navigate('/login'); return; }
        try {
            const res = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.CART}`, {
                method: 'POST', headers: authService.getAuthHeaders(),
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
                const res = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.WISHLIST}`, { headers: authService.getAuthHeaders() });
                if (!res.ok) return;
                const data = await res.json();
                const matched = (Array.isArray(data?.data?.items) ? data.data.items : []).find((i) => i.productId?._id === product._id || i.productId === product._id);
                if (matched?._id) { await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.WISHLIST}/${matched._id}`, { method: 'DELETE', headers: authService.getAuthHeaders() }); window.dispatchEvent(new Event('wishlist:changed')); }
            } catch (_err) { /* ignore */ }
        } else {
            setWishlistItems((prev) => prev.some((i) => i._id === product._id) ? prev : [...prev, product]);
            try {
                await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.WISHLIST}`, { method: 'POST', headers: authService.getAuthHeaders(), body: JSON.stringify({ productId: product._id }) });
                window.dispatchEvent(new Event('wishlist:changed'));
            } catch (_err) { /* ignore */ }
        }
    };

    const handleProductHover = (product) => {
        setHoveredProduct(product._id);
        if ((product.images?.length || 0) < 2 || hoverIntervalsRef.current[product._id]) return;
        hoverIntervalsRef.current[product._id] = setInterval(() => {
            setCurrentImageIndex((prev) => ({ ...prev, [product._id]: ((prev[product._id] || 0) + 1) % product.images.length }));
        }, IMAGE_ROTATION_INTERVAL);
    };

    const handleProductLeave = (product) => {
        setHoveredProduct(null);
        clearInterval(hoverIntervalsRef.current[product._id]);
        delete hoverIntervalsRef.current[product._id];
        setCurrentImageIndex((prev) => ({ ...prev, [product._id]: 0 }));
    };

    const getProductImage = (product) => {
        const imgs = product.images || [];
        if (!imgs.length) return getRandomProductImage();
        const raw = imgs[currentImageIndex[product._id] || 0] || imgs[0];
        const path = raw?.path || raw?.url || (typeof raw === 'string' ? raw : null);
        if (!path) return getRandomProductImage();
        return path.startsWith('http') ? path : `${API_CONFIG.BASE_URL}/${path.replace(/^\//, '')}`;
    };

    const formatCurrency = (price) => formatPrice(price || 0, CURRENCY_CONFIG.DEFAULT, CURRENCY_CONFIG.LOCALE);

    const sortProducts = (list) => {
        const arr = [...list];
        if (sortOption === 'price-low') return arr.sort((a, b) => calculateDiscountPrice(a.basePrice || 0, a.baseDiscount || 0) - calculateDiscountPrice(b.basePrice || 0, b.baseDiscount || 0));
        if (sortOption === 'price-high') return arr.sort((a, b) => calculateDiscountPrice(b.basePrice || 0, b.baseDiscount || 0) - calculateDiscountPrice(a.basePrice || 0, a.baseDiscount || 0));
        if (sortOption === 'rating') return arr.sort((a, b) => (b.ratings?.average || 0) - (a.ratings?.average || 0));
        return arr;
    };

    const featuredGridProducts = sortProducts(featuredProducts.length ? featuredProducts : products.slice(0, FEATURED_PRODUCTS_TARGET));
    const visibleCategoryProducts = sortProducts(selectedCategory === 'all' ? [] : (productsByCategory[selectedCategory] || []));

    const cardProps = (product) => ({
        product,
        currentImage: getProductImage(product),
        isHovered: hoveredProduct === product._id,
        inWishlist: wishlistItems.some((i) => i._id === product._id),
        onHover: handleProductHover, onLeave: handleProductLeave,
        onAddToCart: addToCart, onWishlistToggle: toggleWishlist,
        formatCurrency,
    });

    return (
        <div className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
            {/* Hero */}
            <HeroBanner banners={banners} onShopNow={() => navigate('/products')} />

            {/* Stats strip */}
            <div className="mb-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                    { icon: '🚚', label: 'Free Shipping', sub: 'On orders over $50' },
                    { icon: '🔄', label: 'Easy Returns', sub: '30-day hassle-free' },
                    { icon: '🔒', label: 'Secure Payment', sub: 'SSL encrypted' },
                    { icon: '🎁', label: 'Exclusive Deals', sub: 'Members get more' },
                ].map(({ icon, label, sub }) => (
                    <div key={label} className="store-surface flex items-center gap-3 px-4 py-3">
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
                <section className="mb-10">
                    <div className="mb-5 flex items-end justify-between">
                        <div>
                            <p className="store-eyebrow mb-1">Explore</p>
                            <h2 className="store-display text-2xl text-[#131313] sm:text-3xl">Shop by Category</h2>
                        </div>
                        <Link to="/products" className="store-btn-secondary tap-bounce rounded-xl px-4 py-2 text-sm">View All →</Link>
                    </div>
                    <div className="grid grid-cols-4 gap-3 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-9">
                        <button onClick={() => setSelectedCategory('all')} className={`store-category-chip flex flex-col items-center gap-1.5 px-3 py-3 text-center ${selectedCategory === 'all' ? 'active' : ''}`}>
                            <span className="text-xl">🛒</span>
                            <span className="text-xs font-semibold">All</span>
                        </button>
                        {categories.slice(0, 8).map((cat) => (
                            <button key={cat._id || cat.slug} onClick={() => setSelectedCategory(cat.slug)} className={`store-category-chip flex flex-col items-center gap-1.5 px-3 py-3 text-center ${selectedCategory === cat.slug ? 'active' : ''}`}>
                                <span className="text-xl">{catIcon(cat.title)}</span>
                                <span className="line-clamp-2 text-xs font-semibold leading-tight">{cat.title}</span>
                            </button>
                        ))}
                    </div>
                </section>
            )}

            {/* Products */}
            <section>
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <p className="store-eyebrow mb-1">{selectedCategory === 'all' ? 'Curated for You' : 'Category'}</p>
                        <h2 className="store-display text-xl text-[#131313] sm:text-2xl">
                            {selectedCategory === 'all' ? 'Featured Products' : (categories.find((c) => c.slug === selectedCategory)?.title || 'Products')}
                            <span className="ml-2 text-sm font-normal text-[#666]">
                                ({selectedCategory === 'all' ? featuredGridProducts.length : visibleCategoryProducts.length})
                            </span>
                        </h2>
                    </div>
                    <div className="flex items-center gap-3">
                        {selectedCategory !== 'all' && (
                            <button onClick={() => setSelectedCategory('all')} className="store-btn-secondary tap-bounce rounded-xl px-4 py-2 text-sm">← All</button>
                        )}
                        <select value={sortOption} onChange={(e) => setSortOption(e.target.value)} className="store-input cursor-pointer rounded-xl px-4 py-2 text-sm">
                            <option value="newest">Newest</option>
                            <option value="price-low">Price: Low → High</option>
                            <option value="price-high">Price: High → Low</option>
                            <option value="rating">Best Rating</option>
                        </select>
                    </div>
                </div>

                {/* Category filter pills */}
                <div className="mb-6 flex flex-wrap gap-2 overflow-x-auto pb-1">
                    <button onClick={() => setSelectedCategory('all')} className={`store-category-chip px-4 py-1.5 text-sm ${selectedCategory === 'all' ? 'active' : ''}`}>All Products</button>
                    {categories.slice(0, 6).map((cat) => (
                        <button key={cat._id || cat.slug} onClick={() => setSelectedCategory(cat.slug)} className={`store-category-chip px-4 py-1.5 text-sm ${selectedCategory === cat.slug ? 'active' : ''}`}>
                            {cat.title} {cat.productCount > 0 && <span className="opacity-70">({cat.productCount})</span>}
                        </button>
                    ))}
                </div>

                {isLoading ? (<LoadingScreen />) : selectedCategory === 'all' ? (
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                        {featuredGridProducts.map((p) => <ProductCard key={p._id} {...cardProps(p)} />)}
                    </div>
                ) : !visibleCategoryProducts.length ? (
                    <div className="store-surface py-14 text-center">
                        <div className="text-4xl mb-3">🛍️</div>
                        <h3 className="store-display text-lg text-[#212191] mb-1">No Products Found</h3>
                        <p className="text-sm text-[#666] mb-5">No products in this category yet.</p>
                        <button onClick={() => setSelectedCategory('all')} className="store-btn-primary tap-bounce inline-block rounded-xl px-6 py-2.5 text-sm font-bold">Browse All</button>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                        {visibleCategoryProducts.map((p) => <ProductCard key={p._id} {...cardProps(p)} />)}
                    </div>
                )}

                {!isLoading && selectedCategory === 'all' && featuredGridProducts.length > 0 && (
                    <div className="mt-10 text-center">
                        <Link to="/products" className="store-btn-primary tap-bounce inline-flex items-center gap-2 rounded-2xl px-8 py-3.5 text-sm font-bold">
                            View All Products
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                        </Link>
                    </div>
                )}
            </section>

            {/* Trust badges */}
            <section className="mt-14 store-hero rounded-3xl px-8 py-10 text-center sm:px-12">
                <div className="relative">
                    <p className="store-eyebrow mb-2 text-[#d2dff9]">Why Choose Us</p>
                    <h2 className="store-display mb-2 text-2xl text-white sm:text-3xl">Trusted by Thousands</h2>
                    <p className="mb-8 text-sm text-white/80">Join our growing community of happy shoppers worldwide.</p>
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                        {[{ value: '10M+', label: 'Products' }, { value: '500K+', label: 'Happy Customers' }, { value: '99.8%', label: 'Satisfaction Rate' }, { value: '24/7', label: 'Support' }].map(({ value, label }) => (
                            <div key={label} className="rounded-2xl border border-[rgba(255,255,255,0.15)] bg-[rgba(255,255,255,0.08)] px-4 py-5 backdrop-blur-sm">
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
