import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { API_CONFIG } from '../constants';
import { calculateDiscountPrice, formatPrice } from '../utils/productUtils';
import authService from '../services/authService';
import StoreNav from '../components/common/StoreNav';

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
    if (Array.isArray(payload?.data)) return payload.data;
    return [];
};

const parseBrandList = (payload) => {
    if (Array.isArray(payload?.data?.brands)) return payload.data.brands;
    if (Array.isArray(payload?.data)) return payload.data;
    return [];
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

const ProductsPage = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const initialFilters = {
        search: searchParams.get('search') || '',
        category: searchParams.get('category') || 'all',
        brand: searchParams.get('brand') || 'all',
        minPrice: searchParams.get('minPrice') || '',
        maxPrice: searchParams.get('maxPrice') || '',
        sort: ALLOWED_SORT_OPTIONS.has(searchParams.get('sort')) ? searchParams.get('sort') : defaultFilters.sort,
    };
    const initialPage = parsePositiveInt(searchParams.get('page'), 1);
    const initialPageSize = parsePageSize(searchParams.get('limit'));

    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [brands, setBrands] = useState([]);
    const [filters, setFilters] = useState(initialFilters);
    const [recentSearches, setRecentSearches] = useState([]);
    const [savedFilters, setSavedFilters] = useState([]);
    const [saveName, setSaveName] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [message, setMessage] = useState('');
    const [prefsReady, setPrefsReady] = useState(false);
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

    const persistPreferences = useCallback(async (nextSavedFilters, nextRecentSearches) => {
        if (isAuthenticated) {
            try {
                await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.AUTH}/preferences/product-discovery`, {
                    method: 'PUT',
                    headers: authService.getAuthHeaders(),
                    body: JSON.stringify({
                        savedFilters: nextSavedFilters,
                        recentSearches: nextRecentSearches,
                    }),
                });
            } catch {
                // Keep UI state even if persistence fails.
            }
            return;
        }

        localStorage.setItem(SAVED_FILTERS_KEY, JSON.stringify(nextSavedFilters));
        localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(nextRecentSearches));
    }, [isAuthenticated]);

    useEffect(() => {
        const loadTaxonomy = async () => {
            try {
                const [categoriesResponse, brandsResponse] = await Promise.all([
                    fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.CATEGORIES}`),
                    fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.BRANDS}`),
                ]);

                const [categoriesData, brandsData] = await Promise.all([
                    categoriesResponse.json(),
                    brandsResponse.json(),
                ]);

                setCategories(parseCategoryList(categoriesData));
                setBrands(parseBrandList(brandsData));
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
                    const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.AUTH}/preferences/product-discovery`, {
                        headers: authService.getAuthHeaders(),
                    });
                    const payload = await response.json();
                    if (response.ok) {
                        const discovery = payload?.data?.productDiscovery || {};
                        setRecentSearches(Array.isArray(discovery.recentSearches) ? discovery.recentSearches : []);
                        setSavedFilters(Array.isArray(discovery.savedFilters) ? discovery.savedFilters : []);
                    }
                } catch {
                    setRecentSearches([]);
                    setSavedFilters([]);
                } finally {
                    setPrefsReady(true);
                }
                return;
            }

            const storedRecent = JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY) || '[]');
            const storedSaved = JSON.parse(localStorage.getItem(SAVED_FILTERS_KEY) || '[]');
            setRecentSearches(Array.isArray(storedRecent) ? storedRecent : []);
            setSavedFilters(Array.isArray(storedSaved) ? storedSaved : []);
            setPrefsReady(true);
        };

        loadPreferences();
    }, [isAuthenticated]);

    useEffect(() => {
        if (!prefsReady) return;
        persistPreferences(savedFilters, recentSearches);
    }, [persistPreferences, prefsReady, recentSearches, savedFilters]);

    useEffect(() => {
        const query = filters.search.trim();
        if (query.length < 2) return;

        setRecentSearches((prev) => [query, ...prev.filter((item) => item !== query)].slice(0, MAX_RECENT_SEARCHES));
    }, [filters.search]);

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
        const loadProducts = async () => {
            try {
                setIsLoading(true);

                const params = new URLSearchParams({
                    limit: String(pageSize),
                    page: String(page),
                    sort: filters.sort,
                    status: 'active',
                });

                if (filters.search.trim()) params.set('search', filters.search.trim());
                if (filters.category !== 'all') params.set('category', filters.category);
                if (filters.brand !== 'all') params.set('brand', filters.brand);
                if (String(filters.minPrice).trim()) params.set('minPrice', String(filters.minPrice).trim());
                if (String(filters.maxPrice).trim()) params.set('maxPrice', String(filters.maxPrice).trim());

                const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.PRODUCTS}?${params.toString()}`);
                const payload = await response.json();

                if (!response.ok) {
                    throw new Error(payload?.message || 'Failed to fetch products');
                }

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
    }, [filters, page, pageSize]);

    const onFilterChange = (key, value) => {
        setFilters((prev) => ({ ...prev, [key]: value }));
        setPage(1);
    };

    const resetFilters = () => {
        setFilters(defaultFilters);
        setPage(1);
        setMessage('Filters reset');
    };

    const saveCurrentFilter = () => {
        const name = saveName.trim();
        if (!name) {
            setMessage('Enter a filter preset name first');
            return;
        }

        const nextSaved = [
            { name, filters },
            ...savedFilters.filter((entry) => entry.name !== name),
        ].slice(0, 15);

        setSavedFilters(nextSaved);
        setSaveName('');
        setMessage(`Saved filter preset: ${name}`);
    };

    const applySavedFilter = (entry) => {
        setFilters(entry.filters || defaultFilters);
        setPage(1);
        setMessage(`Applied saved filter: ${entry.name}`);
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
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <div className="mb-6 flex flex-col gap-3">
                <h1 className="text-2xl font-bold text-slate-900">Products Discovery</h1>
                <p className="text-sm text-slate-600">
                    Use filters and sorting to quickly find the right products.
                </p>
                <StoreNav />
                {message && (
                    <div className="rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-2 text-sm text-cyan-800">
                        {message}
                    </div>
                )}
            </div>

            <div className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-6">
                <input
                    type="text"
                    value={filters.search}
                    onChange={(event) => onFilterChange('search', event.target.value)}
                    placeholder="Search products..."
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-cyan-500 focus:ring lg:col-span-2"
                />
                <select
                    value={filters.category}
                    onChange={(event) => onFilterChange('category', event.target.value)}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
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
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
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
                    placeholder="Min Price"
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
                <input
                    type="number"
                    value={filters.maxPrice}
                    onChange={(event) => onFilterChange('maxPrice', event.target.value)}
                    placeholder="Max Price"
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
            </div>

            <div className="mb-6 flex flex-wrap items-center gap-3">
                <select
                    value={filters.sort}
                    onChange={(event) => onFilterChange('sort', event.target.value)}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                    <option value="newest">Newest</option>
                    <option value="popular">Most Popular</option>
                    <option value="rating">Best Rated</option>
                    <option value="price-low">Price Low to High</option>
                    <option value="price-high">Price High to Low</option>
                </select>
                <select
                    value={pageSize}
                    onChange={(event) => onPageSizeChange(event.target.value)}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                    {PAGE_SIZE_OPTIONS.map((size) => (
                        <option key={size} value={size}>
                            {size} per page
                        </option>
                    ))}
                </select>
                <button
                    onClick={resetFilters}
                    className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
                >
                    Reset Filters
                </button>
            </div>

            <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-lg border border-slate-200 bg-white p-4">
                    <h2 className="mb-2 text-sm font-semibold text-slate-900">Recent Searches</h2>
                    {recentSearches.length === 0 ? (
                        <p className="text-xs text-slate-500">No recent searches yet.</p>
                    ) : (
                        <div className="flex flex-wrap gap-2">
                            {recentSearches.map((item) => (
                                <button
                                    key={item}
                                    onClick={() => onFilterChange('search', item)}
                                    className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700 hover:bg-slate-200"
                                >
                                    {item}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="rounded-lg border border-slate-200 bg-white p-4">
                    <h2 className="mb-2 text-sm font-semibold text-slate-900">Saved Filters</h2>
                    <div className="mb-3 flex gap-2">
                        <input
                            value={saveName}
                            onChange={(event) => setSaveName(event.target.value)}
                            placeholder="Preset name"
                            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                        />
                        <button
                            onClick={saveCurrentFilter}
                            className="rounded-lg bg-cyan-600 px-3 py-2 text-sm font-medium text-white hover:bg-cyan-700"
                        >
                            Save
                        </button>
                    </div>
                    {savedFilters.length === 0 ? (
                        <p className="text-xs text-slate-500">No saved filters yet.</p>
                    ) : (
                        <div className="space-y-2">
                            {savedFilters.map((entry) => (
                                <div key={entry.name} className="flex items-center justify-between rounded bg-slate-50 px-3 py-2">
                                    <button
                                        onClick={() => applySavedFilter(entry)}
                                        className="text-sm font-medium text-slate-800 hover:text-cyan-700"
                                    >
                                        {entry.name}
                                    </button>
                                    <button
                                        onClick={() => removeSavedFilter(entry.name)}
                                        className="text-xs text-rose-600 hover:text-rose-700"
                                    >
                                        Remove
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {isLoading ? (
                <p className="text-slate-500">Loading products...</p>
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
                                    className={`rounded-lg px-3 py-1.5 text-sm ${
                                        pageNumber === pagination.page
                                            ? 'bg-cyan-600 text-white'
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

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {products.map((product) => {
                            const finalPrice = calculateDiscountPrice(product.basePrice || 0, product.baseDiscount || 0);
                            return (
                                <Link
                                    key={product._id}
                                    to={`/products/${product.slug || product._id}`}
                                    className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-cyan-300 hover:shadow-md"
                                >
                                    <h2 className="line-clamp-2 text-sm font-semibold text-slate-900">{product.title}</h2>
                                    <p className="mt-1 text-xs text-slate-500">{product.brand?.title || 'Brand'}</p>
                                    <p className="mt-2 text-sm font-semibold text-slate-700">
                                        {formatPrice(finalPrice)}
                                    </p>
                                    {Number(product.baseDiscount || 0) > 0 && (
                                        <p className="text-xs text-slate-500 line-through">
                                            {formatPrice(product.basePrice || 0)}
                                        </p>
                                    )}
                                </Link>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProductsPage;
