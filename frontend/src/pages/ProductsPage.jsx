import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { API_CONFIG } from '../constants';
import { formatPrice } from '../utils/productUtils';
import { getImageSource, getPrimaryProductImage, resolveImageUrl } from '../utils/imageUrl';
import authService from '../services/authService';
import apiClient from '../services/apiClient';
import notify from '../utils/notify';
import StoreNav from '../components/common/StoreNav';
import LazyImage from '../components/common/LazyImage';
import { useSiteSettings } from '../context/useSiteSettings';
import { resolveBannerAction } from '../utils/bannerLink';
import ProductCard from '../components/product/ProductCard';

const RECENT_SEARCHES_KEY = 'products_recent_searches';
const SAVED_FILTERS_KEY = 'products_saved_filters';
const MAX_RECENT_SEARCHES = 8;
const DEFAULT_PAGE_SIZE = 24;
const PAGE_SIZE_OPTIONS = [12, 24, 48];
const ALLOWED_SORT_OPTIONS = new Set(['newest', 'popular', 'rating', 'price-low', 'price-high']);

const defaultFilters = {
    search: '',
    category: 'all',
    brand: 'all',
    minPrice: '',
    maxPrice: '',
    sort: 'newest',
};

const parseCategoryList = (payload) => {
    if (Array.isArray(payload?.data?.categories)) return payload.data.categories;
    if (Array.isArray(payload?.data?.items)) return payload.data.items;
    if (Array.isArray(payload?.data)) return payload.data;
    return [];
};

const parseBrandList = (payload) => {
    if (Array.isArray(payload?.data?.brands)) return payload.data.brands;
    if (Array.isArray(payload?.data?.items)) return payload.data.items;
    if (Array.isArray(payload?.data)) return payload.data;
    return [];
};

const SkeletonCard = () => (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="img-shimmer h-56 w-full" />
        <div className="space-y-2 p-4">
            <div className="img-shimmer h-3 w-1/3 rounded" />
            <div className="img-shimmer h-4 w-3/4 rounded" />
            <div className="img-shimmer h-4 w-1/2 rounded" />
            <div className="img-shimmer h-3 w-1/4 rounded" />
        </div>
    </div>
);

const HeroBanner = ({ banners }) => {
    const [idx, setIdx] = useState(0);
    const timerRef = useRef(null);
    const slides = banners.length
        ? banners
        : [{
            title: 'Featured Deals',
            description: 'Discover top products, curated offers, and fresh arrivals.',
            image: null,
        }];

    useEffect(() => {
        if (idx >= slides.length) setIdx(0);
    }, [idx, slides.length]);

    useEffect(() => {
        clearInterval(timerRef.current);
        if (slides.length > 1) {
            timerRef.current = setInterval(() => setIdx((p) => (p + 1) % slides.length), 4500);
        }
        return () => clearInterval(timerRef.current);
    }, [slides.length]);

    const b = slides[idx];
    const action = resolveBannerAction(b);

    return (
        <div className="relative mb-8 overflow-hidden rounded-2xl shadow-lg" style={{ minHeight: 220 }}>
            <div className="absolute inset-0">
                <div
                    className="flex h-full transition-transform duration-700 ease-out"
                    style={{ width: `${slides.length * 100}%`, transform: `translateX(-${idx * (100 / slides.length)}%)` }}
                >
                    {slides.map((slide, slideIndex) => {
                        const imgUrl = resolveImageUrl(slide.image || slide.photo, { placeholder: null });
                        return (
                            <div key={slide._id || slide.slug || slideIndex} className="relative h-full" style={{ width: `${100 / slides.length}%` }}>
                                {imgUrl ? (
                                    <LazyImage
                                        src={imgUrl}
                                        alt={slide.title || `Banner ${slideIndex + 1}`}
                                        wrapperClassName="h-56 w-full"
                                        className="h-56 w-full object-cover"
                                        rootMargin="0px"
                                        fallback={<div className="h-56 w-full bg-gradient-to-r from-slate-900 via-primary-800 to-primary-600" />}
                                    />
                                ) : (
                                    <div className="h-56 w-full bg-gradient-to-r from-slate-900 via-primary-800 to-primary-600" />
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
            <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-transparent" />
            <div className="absolute bottom-0 left-0 p-6">
                <h2 className="text-2xl font-bold text-white drop-shadow">{b.title}</h2>
                {b.description && (
                    <p className="mt-1 max-w-md text-sm text-white/85">{b.description}</p>
                )}
                {action.external || action.target === '_blank' ? (
                    <a
                        href={action.href}
                        target={action.target}
                        rel="noopener noreferrer"
                        className="mt-3 inline-block rounded-xl bg-secondary-400 px-5 py-2 text-sm font-bold text-white shadow hover:bg-secondary-500 transition"
                    >
                        Shop Now →
                    </a>
                ) : (
                    <Link
                        to={action.href}
                        className="mt-3 inline-block rounded-xl bg-secondary-400 px-5 py-2 text-sm font-bold text-white shadow hover:bg-secondary-500 transition"
                    >
                        Shop Now →
                    </Link>
                )}
            </div>
            {slides.length > 1 && (
                <div className="absolute bottom-4 right-5 flex items-center gap-2">
                    {slides.map((_, i) => (
                        <button
                            key={i}
                            onClick={() => setIdx(i)}
                            aria-label={`Go to slide ${i + 1}`}
                            className={`h-2 rounded-full transition-all ${
                                i === idx ? 'w-6 bg-secondary-400' : 'w-2 bg-white/50 hover:bg-white/80'
                            }`}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

const parsePositiveInt = (value, fallback) => {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed) || parsed < 1) {
        return fallback;
    }
    return parsed;
};

const parsePageSize = (value) => {
    const parsed = parsePositiveInt(value, DEFAULT_PAGE_SIZE);
    return PAGE_SIZE_OPTIONS.includes(parsed) ? parsed : DEFAULT_PAGE_SIZE;
};

const buildFiltersFromSearchParams = (params) => ({
    search: params.get('search') || '',
    category: params.get('category') || 'all',
    brand: params.get('brand') || 'all',
    minPrice: params.get('minPrice') || '',
    maxPrice: params.get('maxPrice') || '',
    sort: ALLOWED_SORT_OPTIONS.has(params.get('sort')) ? params.get('sort') : defaultFilters.sort,
});

const areFiltersEqual = (left, right) => (
    left.search === right.search
    && left.category === right.category
    && left.brand === right.brand
    && left.minPrice === right.minPrice
    && left.maxPrice === right.maxPrice
    && left.sort === right.sort
);

const ProductsPage = () => {
    const { settings } = useSiteSettings();
    const currencyCode = String(settings?.currencyCode || 'USD').toUpperCase();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const initialFilters = buildFiltersFromSearchParams(searchParams);
    const initialPage = parsePositiveInt(searchParams.get('page'), 1);
    const initialPageSize = parsePageSize(searchParams.get('limit'));

    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [brands, setBrands] = useState([]);
    const [banners, setBanners] = useState([]);
    const [filters, setFilters] = useState(initialFilters);
    const [recentSearches, setRecentSearches] = useState([]);
    const [savedFilters, setSavedFilters] = useState([]);
    const [saveName, setSaveName] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [message, setMessage] = useState('');
    const [priceError, setPriceError] = useState('');
    const searchDebounceRef = useRef(null);
    const [debouncedSearch, setDebouncedSearch] = useState(initialFilters.search);
    const messageTimerRef = useRef(null);
    const [prefsReady, setPrefsReady] = useState(false);
    const [canSyncPreferences, setCanSyncPreferences] = useState(false);
    const [wishlistItems, setWishlistItems] = useState([]);
    const [hoveredProduct, setHoveredProduct] = useState(null);
    const [currentImageIndex, setCurrentImageIndex] = useState({});
    const hoverIntervalsRef = useRef({});
    const [page, setPage] = useState(initialPage);
    const [pageSize, setPageSize] = useState(initialPageSize);
    const [pagination, setPagination] = useState({
        page: initialPage,
        limit: initialPageSize,
        total: 0,
        pages: 1,
        hasNext: false,
        hasPrev: false,
    });

    const isAuthenticated = authService.isAuthenticated();

    useEffect(() => {
        return () => {
            clearTimeout(searchDebounceRef.current);
            clearTimeout(messageTimerRef.current);
            Object.values(hoverIntervalsRef.current).forEach(clearInterval);
        };
    }, []);

    const loadWishlist = useCallback(async () => {
        if (!authService.isAuthenticated()) { setWishlistItems([]); return; }
        try {
            const data = await apiClient.get(API_CONFIG.ENDPOINTS.WISHLIST);
            setWishlistItems((Array.isArray(data?.data?.items) ? data.data.items : []).map((i) => i.productId).filter(Boolean));
        } catch { setWishlistItems([]); }
    }, []);

    const addToCart = async (product) => {
        if (!authService.isAuthenticated()) { navigate('/login'); return; }
        if (authService.isAdmin()) { notify.info('Admins cannot add items to cart'); return; }
        const activeVariants = Array.isArray(product?.variants)
            ? product.variants.filter(v => !v.status || v.status === 'active')
            : [];
        if (product?.hasVariants === true && activeVariants.length > 0) {
            notify.info('Redirecting to select your preferred options...');
            navigate(`/products/${product._id}`);
            return;
        }
        try {
            await apiClient.post(API_CONFIG.ENDPOINTS.CART, { productId: product._id, quantity: 1 });
            window.dispatchEvent(new Event('cart:changed'));
            notify.success(`"${product.title.slice(0, 30)}" added to cart`);
        } catch (error) { notify.error(error, 'Failed to add to cart'); }
    };

    const toggleWishlist = async (product) => {
        if (!authService.isAuthenticated()) { navigate('/login'); return; }
        if (authService.isAdmin()) { notify.info('Admins cannot manage wishlist'); return; }
        const inList = wishlistItems.some((i) => i._id === product._id);
        if (inList) {
            setWishlistItems((prev) => prev.filter((i) => i._id !== product._id));
            try {
                const data = await apiClient.get(API_CONFIG.ENDPOINTS.WISHLIST);
                const matched = (Array.isArray(data?.data?.items) ? data.data.items : []).find((i) => i.productId?._id === product._id || i.productId === product._id);
                if (matched?._id) {
                    await apiClient.delete(`${API_CONFIG.ENDPOINTS.WISHLIST}/${matched._id}`);
                    window.dispatchEvent(new Event('wishlist:changed'));
                }
            } catch { /* ignore */ }
        } else {
            setWishlistItems((prev) => prev.some((i) => i._id === product._id) ? prev : [...prev, product]);
            try {
                await apiClient.post(API_CONFIG.ENDPOINTS.WISHLIST, { productId: product._id });
                window.dispatchEvent(new Event('wishlist:changed'));
            } catch { /* ignore */ }
        }
    };

    const getProductImage = (product) => {
        const images = [
            ...(Array.isArray(product?.images) ? product.images : []),
        ].filter(Boolean);
        const primary = getPrimaryProductImage(product);
        const src = resolveImageUrl(getImageSource(primary), { placeholder: null });
        if (src) {
            const idx = (currentImageIndex[product._id] || 0) % Math.max(1, images.length);
            const rotated = images[idx];
            return resolveImageUrl(getImageSource(rotated), { placeholder: null }) || src;
        }
        return resolveImageUrl(getImageSource(primary));
    };

    const handleProductHover = (product) => {
        setHoveredProduct(product._id);
        const images = Array.isArray(product?.images) ? product.images : [];
        if (images.length < 2 || hoverIntervalsRef.current[product._id]) return;
        hoverIntervalsRef.current[product._id] = setInterval(() => {
            setCurrentImageIndex((prev) => {
                const nextIdx = ((prev[product._id] || 0) + 1) % images.length;
                return { ...prev, [product._id]: nextIdx };
            });
        }, 900);
    };

    const handleProductLeave = (product) => {
        setHoveredProduct(null);
        clearInterval(hoverIntervalsRef.current[product._id]);
        delete hoverIntervalsRef.current[product._id];
        setCurrentImageIndex((prev) => ({ ...prev, [product._id]: 0 }));
    };

    const formatCurrency = (price) => formatPrice(price || 0, currencyCode);

    const cardProps = (product) => ({
        product,
        currentImage: getProductImage(product),
        isHovered: hoveredProduct === product._id,
        inWishlist: wishlistItems.some((i) => i._id === product._id),
        isAdmin: authService.isAdmin(),
        onHover: handleProductHover,
        onLeave: handleProductLeave,
        onAddToCart: addToCart,
        onWishlistToggle: toggleWishlist,
        onImageError: () => {},
        formatCurrency,
        currencyCode,
    });

    const loadLocalPreferences = useCallback(() => {
        const storedRecent = JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY) || '[]');
        const storedSaved = JSON.parse(localStorage.getItem(SAVED_FILTERS_KEY) || '[]');
        setRecentSearches(Array.isArray(storedRecent) ? storedRecent : []);
        setSavedFilters(Array.isArray(storedSaved) ? storedSaved : []);
    }, []);

    const persistPreferences = useCallback(async (nextSavedFilters, nextRecentSearches) => {
        if (canSyncPreferences) {
            try {
                await apiClient.put(`${API_CONFIG.ENDPOINTS.AUTH}/preferences/product-discovery`, {
                    savedFilters: nextSavedFilters,
                    recentSearches: nextRecentSearches,
                });
            } catch { /* ignore — fall back to localStorage */ }
            return;
        }

        localStorage.setItem(SAVED_FILTERS_KEY, JSON.stringify(nextSavedFilters));
        localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(nextRecentSearches));
    }, [canSyncPreferences]);

    useEffect(() => {
        loadWishlist();
        const handleWishlistChanged = () => loadWishlist();
        window.addEventListener('wishlist:changed', handleWishlistChanged);
        return () => window.removeEventListener('wishlist:changed', handleWishlistChanged);
    }, [loadWishlist]);

    useEffect(() => {
        const loadTaxonomy = async () => {
            try {
                const [categoriesData, brandsData, bannersData] = await Promise.all([
                    apiClient.get(API_CONFIG.ENDPOINTS.CATEGORIES),
                    apiClient.get(API_CONFIG.ENDPOINTS.BRANDS),
                    apiClient.get(`${API_CONFIG.ENDPOINTS.BANNERS}?status=active&limit=5`).catch(() => null),
                ]);

                setCategories(parseCategoryList(categoriesData));
                setBrands(parseBrandList(brandsData));

                if (bannersData?.data) {
                    const bArr = Array.isArray(bannersData.data)
                        ? bannersData.data
                        : (bannersData.data?.banners || []);
                    setBanners(bArr.slice(0, 5));
                }
            } catch {
                setCategories([]);
                setBrands([]);
            }
        };

        loadTaxonomy();
    }, []);

    useEffect(() => {
        const loadPreferences = async () => {
            if (isAuthenticated) {
                try {
                    await authService.getCurrentUser();
                    setCanSyncPreferences(true);

                    const payload = await apiClient.get(`${API_CONFIG.ENDPOINTS.AUTH}/preferences/product-discovery`);
                    const discovery = payload?.data?.productDiscovery || {};
                    setRecentSearches(Array.isArray(discovery.recentSearches) ? discovery.recentSearches : []);
                    setSavedFilters(Array.isArray(discovery.savedFilters) ? discovery.savedFilters : []);
                } catch {
                    setCanSyncPreferences(false);
                    loadLocalPreferences();
                } finally {
                    setPrefsReady(true);
                }
                return;
            }

            setCanSyncPreferences(false);
            loadLocalPreferences();
            setPrefsReady(true);
        };

        loadPreferences();
    }, [isAuthenticated, loadLocalPreferences]);

    useEffect(() => {
        if (!prefsReady) return;
        persistPreferences(savedFilters, recentSearches);
    }, [persistPreferences, prefsReady, recentSearches, savedFilters]);

    // Track recent searches only after debounce settles (avoids storing partial keystrokes)
    useEffect(() => {
        const query = debouncedSearch.trim();
        if (query.length < 2) return;
        setRecentSearches((prev) => [query, ...prev.filter((item) => item !== query)].slice(0, MAX_RECENT_SEARCHES));
    }, [debouncedSearch]);

    useEffect(() => {
        const params = new URLSearchParams();

        if (filters.search.trim()) params.set('search', filters.search.trim());
        if (filters.category !== 'all') params.set('category', filters.category);
        if (filters.brand !== 'all') params.set('brand', filters.brand);
        if (String(filters.minPrice).trim()) params.set('minPrice', String(filters.minPrice).trim());
        if (String(filters.maxPrice).trim()) params.set('maxPrice', String(filters.maxPrice).trim());
        if (filters.sort !== defaultFilters.sort) params.set('sort', filters.sort);
        if (page > 1) params.set('page', String(page));
        if (pageSize !== DEFAULT_PAGE_SIZE) params.set('limit', String(pageSize));

        setSearchParams(params, { replace: true });
    }, [filters, page, pageSize, setSearchParams]);

    useEffect(() => {
        const nextFilters = buildFiltersFromSearchParams(searchParams);
        const nextPage = parsePositiveInt(searchParams.get('page'), 1);
        const nextPageSize = parsePageSize(searchParams.get('limit'));

        setFilters((prev) => (areFiltersEqual(prev, nextFilters) ? prev : nextFilters));
        setPage((prev) => (prev === nextPage ? prev : nextPage));
        setPageSize((prev) => (prev === nextPageSize ? prev : nextPageSize));
    }, [searchParams]);

    // Compose the effective search term: use debouncedSearch so typing doesn't fire on every keystroke
    const effectiveFilters = useMemo(() => ({
        ...filters,
        search: debouncedSearch,
    }), [filters, debouncedSearch]);

    useEffect(() => {
        const loadProducts = async () => {
            try {
                setIsLoading(true);

                const params = new URLSearchParams({
                    limit: String(pageSize),
                    page: String(page),
                    sort: effectiveFilters.sort,
                    status: 'active',
                });

                if (effectiveFilters.search.trim()) params.set('search', effectiveFilters.search.trim());
                if (effectiveFilters.category !== 'all') params.set('category', effectiveFilters.category);
                if (effectiveFilters.brand !== 'all') params.set('brand', effectiveFilters.brand);
                if (String(effectiveFilters.minPrice).trim()) params.set('minPrice', String(effectiveFilters.minPrice).trim());
                if (String(effectiveFilters.maxPrice).trim()) params.set('maxPrice', String(effectiveFilters.maxPrice).trim());

                const payload = await apiClient.get(`${API_CONFIG.ENDPOINTS.PRODUCTS}?${params.toString()}`);

                setProducts(Array.isArray(payload?.data?.products) ? payload.data.products : []);
                setPagination(payload?.data?.pagination || {
                    page: 1,
                    limit: pageSize,
                    total: 0,
                    pages: 1,
                    hasNext: false,
                    hasPrev: false,
                });
            } catch {
                setProducts([]);
                setPagination({
                    page: 1,
                    limit: pageSize,
                    total: 0,
                    pages: 1,
                    hasNext: false,
                    hasPrev: false,
                });
            } finally {
                setIsLoading(false);
            }
        };

        loadProducts();
    }, [effectiveFilters, page, pageSize]);

    const showMessage = (msg) => {
        setMessage(msg);
        clearTimeout(messageTimerRef.current);
        messageTimerRef.current = setTimeout(() => setMessage(''), 3000);
    };

    const parsePriceInt = (raw) => {
        const n = parseInt(raw, 10);
        return Number.isFinite(n) && n >= 0 ? n : '';
    };

    const onFilterChange = (key, value) => {
        if (key === 'search') {
            setFilters((prev) => ({ ...prev, search: value }));
            clearTimeout(searchDebounceRef.current);
            searchDebounceRef.current = setTimeout(() => setDebouncedSearch(value), 400);
            setPage(1);
            return;
        }

        if (key === 'minPrice') {
            const parsed = parsePriceInt(value);
            setFilters((prev) => {
                const max = prev.maxPrice !== '' ? Number(prev.maxPrice) : Infinity;
                if (parsed !== '' && Number(parsed) > max) {
                    setPriceError('Min price cannot exceed Max price');
                    return prev;
                }
                setPriceError('');
                return { ...prev, minPrice: parsed === '' ? '' : String(parsed) };
            });
            setPage(1);
            return;
        }

        if (key === 'maxPrice') {
            const parsed = parsePriceInt(value);
            setFilters((prev) => {
                const min = prev.minPrice !== '' ? Number(prev.minPrice) : 0;
                if (parsed !== '' && Number(parsed) < min) {
                    setPriceError('Max price cannot be less than Min price');
                    return prev;
                }
                setPriceError('');
                return { ...prev, maxPrice: parsed === '' ? '' : String(parsed) };
            });
            setPage(1);
            return;
        }

        setFilters((prev) => ({ ...prev, [key]: value }));
        setPage(1);
    };

    const resetFilters = () => {
        setFilters(defaultFilters);
        setDebouncedSearch('');
        setPriceError('');
        setPage(1);
        showMessage('Filters reset');
    };

    const saveCurrentFilter = () => {
        const name = saveName.trim();
        if (!name) {
            showMessage('Enter a filter preset name first');
            return;
        }

        const nextSaved = [
            { name, filters },
            ...savedFilters.filter((entry) => entry.name !== name),
        ].slice(0, 15);

        setSavedFilters(nextSaved);
        setSaveName('');
        showMessage(`Saved: "${name}"`);
    };

    const applySavedFilter = (entry) => {
        const f = entry.filters || defaultFilters;
        setFilters(f);
        setDebouncedSearch(f.search || '');
        setPriceError('');
        setPage(1);
        showMessage(`Applied: "${entry.name}"`);
    };

    const removeSavedFilter = (name) => {
        setSavedFilters((prev) => prev.filter((entry) => entry.name !== name));
    };

    const onPageSizeChange = (value) => {
        setPageSize(parsePageSize(value));
        setPage(1);
    };

    const pageWindowStart = Math.max(1, pagination.page - 2);
    const pageWindowEnd = Math.min(pagination.pages, pageWindowStart + 4);
    const visiblePageNumbers = [];
    for (let pageNumber = pageWindowStart; pageNumber <= pageWindowEnd; pageNumber += 1) {
        visiblePageNumbers.push(pageNumber);
    }

    return (
        <div className="mx-auto max-w-[90rem] px-4 py-6 sm:px-6 lg:px-8">
            <HeroBanner banners={banners} />

            {/* Page header + nav */}
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                    <h1 className="text-lg font-bold text-slate-900">Products Discovery</h1>
                </div>
                <StoreNav />
            </div>

            {(message || priceError) && (
                <div className={`mb-2 rounded border px-3 py-1.5 text-xs ${
                    priceError
                        ? 'border-rose-200 bg-rose-50 text-rose-700'
                        : 'border-primary-200 bg-primary-50 text-primary-800'
                }`}>
                    {priceError || message}
                </div>
            )}

            {/* Compact filter bar */}
            <div className="mb-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
                <div className="flex flex-wrap items-center gap-2">
                    <input
                        type="text"
                        value={filters.search}
                        onChange={(event) => onFilterChange('search', event.target.value)}
                        placeholder="Search products..."
                        aria-label="Search products"
                        className="h-8 min-w-[160px] flex-1 rounded-md border border-slate-300 px-2.5 text-xs outline-none ring-primary-500 focus:ring"
                    />
                    <select
                        value={filters.category}
                        onChange={(event) => onFilterChange('category', event.target.value)}
                        aria-label="Filter by category"
                        className="h-8 rounded-md border border-slate-300 px-2 text-xs"
                    >
                        <option value="all">All Categories</option>
                        {categories.map((category) => (
                            <option key={category._id || category.slug} value={category.slug}>
                                {category.title}
                            </option>
                        ))}
                    </select>
                    <select
                        value={filters.brand}
                        onChange={(event) => onFilterChange('brand', event.target.value)}
                        aria-label="Filter by brand"
                        className="h-8 rounded-md border border-slate-300 px-2 text-xs"
                    >
                        <option value="all">All Brands</option>
                        {brands.map((brand) => (
                            <option key={brand._id || brand.slug} value={brand.slug}>
                                {brand.title}
                            </option>
                        ))}
                    </select>
                    <input
                        type="number"
                        value={filters.minPrice}
                        onChange={(event) => onFilterChange('minPrice', event.target.value)}
                        onKeyDown={(e) => ['-', '+', '.', 'e'].includes(e.key) && e.preventDefault()}
                        placeholder="Min $"
                        aria-label="Minimum price"
                        min="0"
                        step="1"
                        className={`h-8 w-20 rounded-md border px-2 text-xs ${
                            priceError ? 'border-rose-400 bg-rose-50' : 'border-slate-300'
                        }`}
                    />
                    <input
                        type="number"
                        value={filters.maxPrice}
                        onChange={(event) => onFilterChange('maxPrice', event.target.value)}
                        onKeyDown={(e) => ['-', '+', '.', 'e'].includes(e.key) && e.preventDefault()}
                        placeholder="Max $"
                        aria-label="Maximum price"
                        min={filters.minPrice !== '' ? String(filters.minPrice) : '0'}
                        step="1"
                        className={`h-8 w-20 rounded-md border px-2 text-xs ${
                            priceError ? 'border-rose-400 bg-rose-50' : 'border-slate-300'
                        }`}
                    />
                    <div className="mx-0.5 h-5 w-px bg-slate-200" />
                    <select
                        value={filters.sort}
                        onChange={(event) => onFilterChange('sort', event.target.value)}
                        aria-label="Sort by"
                        className="h-8 rounded-md border border-slate-300 px-2 text-xs"
                    >
                        <option value="newest">Newest</option>
                        <option value="popular">Most Popular</option>
                        <option value="rating">Best Rated</option>
                        <option value="price-low">Price ↑</option>
                        <option value="price-high">Price ↓</option>
                    </select>
                    <select
                        value={pageSize}
                        onChange={(event) => onPageSizeChange(event.target.value)}
                        aria-label="Items per page"
                        className="h-8 rounded-md border border-slate-300 px-2 text-xs"
                    >
                        {PAGE_SIZE_OPTIONS.map((size) => (
                            <option key={size} value={size}>{size}/page</option>
                        ))}
                    </select>
                    <button
                        onClick={resetFilters}
                        className="h-8 rounded-md bg-slate-100 px-3 text-xs font-medium text-slate-600 hover:bg-slate-200"
                    >
                        Reset
                    </button>
                </div>

                {/* Recent searches + saved filters – compact inline row */}
                {(recentSearches.length > 0 || savedFilters.length > 0) && (
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-slate-100 pt-2">
                        {recentSearches.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1.5">
                                <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Recent:</span>
                                {recentSearches.map((item) => (
                                    <button
                                        key={item}
                                        onClick={() => onFilterChange('search', item)}
                                        className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600 hover:bg-slate-200"
                                    >
                                        {item}
                                    </button>
                                ))}
                            </div>
                        )}
                        {savedFilters.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1.5">
                                <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Saved:</span>
                                {savedFilters.map((entry) => (
                                    <span key={entry.name} className="flex items-center gap-0.5">
                                        <button
                                            onClick={() => applySavedFilter(entry)}
                                            className="rounded-full bg-primary-50 px-2 py-0.5 text-[11px] text-primary-700 hover:bg-primary-100"
                                        >
                                            {entry.name}
                                        </button>
                                        <button
                                            onClick={() => removeSavedFilter(entry.name)}
                                            className="text-[10px] text-rose-400 hover:text-rose-600"
                                            aria-label={`Remove ${entry.name}`}
                                        >
                                            ×
                                        </button>
                                    </span>
                                ))}
                            </div>
                        )}
                        <div className="ml-auto flex items-center gap-1.5">
                            <input
                                value={saveName}
                                onChange={(event) => setSaveName(event.target.value)}
                                placeholder="Save preset…"
                                className="h-6 rounded border border-slate-300 px-2 text-[11px] w-28"
                            />
                            <button
                                onClick={saveCurrentFilter}
                                className="h-6 rounded bg-primary-600 px-2.5 text-[11px] font-medium text-white hover:bg-primary-700"
                            >
                                Save
                            </button>
                        </div>
                    </div>
                )}

                {/* Save preset row when no recent/saved yet */}
                {recentSearches.length === 0 && savedFilters.length === 0 && (
                    <div className="mt-2 flex items-center justify-end gap-1.5 border-t border-slate-100 pt-2">
                        <input
                            value={saveName}
                            onChange={(event) => setSaveName(event.target.value)}
                            placeholder="Save current filter…"
                            className="h-6 rounded border border-slate-300 px-2 text-[11px] w-36"
                        />
                        <button
                            onClick={saveCurrentFilter}
                            className="h-6 rounded bg-primary-600 px-2.5 text-[11px] font-medium text-white hover:bg-primary-700"
                        >
                            Save
                        </button>
                    </div>
                )}
            </div>

            {isLoading ? (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                    {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
                </div>
            ) : products.length === 0 ? (
                <p className="text-slate-500">No products found for selected filters.</p>
            ) : (
                <div className="space-y-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-sm text-slate-600">
                            Showing page {pagination.page} of {pagination.pages} ({pagination.total} products)
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setPage(1)}
                                disabled={pagination.page <= 1}
                                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                First
                            </button>
                            <button
                                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                                disabled={!pagination.hasPrev}
                                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                Prev
                            </button>
                            {visiblePageNumbers.map((pageNumber) => (
                                <button
                                    key={pageNumber}
                                    onClick={() => setPage(pageNumber)}
                                    aria-label={`Page ${pageNumber}`}
                                    aria-current={pageNumber === pagination.page ? 'page' : undefined}
                                    className={`rounded-lg px-3 py-1.5 text-sm ${
                                        pageNumber === pagination.page
                                            ? 'bg-primary-600 text-white'
                                            : 'border border-slate-300 text-slate-700'
                                    }`}
                                >
                                    {pageNumber}
                                </button>
                            ))}
                            <button
                                onClick={() => setPage((prev) => prev + 1)}
                                disabled={!pagination.hasNext}
                                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                Next
                            </button>
                            <button
                                onClick={() => setPage(Math.max(1, pagination.pages))}
                                disabled={pagination.page >= pagination.pages}
                                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                Last
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                        {products.map((product, i) => (
                            <ProductCard
                                key={product._id}
                                {...cardProps(product)}
                                animDelay={Math.min(i * 45, 700)}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProductsPage;
