import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
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

const FALLBACK_CATEGORIES = [
    { _id: 'cat1', title: 'Electronics', slug: 'electronics' },
    { _id: 'cat2', title: 'Fashion & Apparel', slug: 'fashion' },
    { _id: 'cat3', title: 'Home & Garden', slug: 'home-garden' },
    { _id: 'cat4', title: 'Sports & Outdoors', slug: 'sports' },
    { _id: 'cat5', title: 'Books & Media', slug: 'books' },
    { _id: 'cat6', title: 'Beauty & Personal Care', slug: 'beauty' }
];

const MOCK_BRANDS = ['Sony', 'Apple', 'Samsung', 'Nike', 'Adidas', 'Canon', 'Dell', 'HP'];

const HomePage = () => {
    const navigate = useNavigate();
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [productsByCategory, setProductsByCategory] = useState({});
    const [featuredProducts, setFeaturedProducts] = useState([]);
    const [wishlistItems, setWishlistItems] = useState([]);
    const [cartItems, setCartItems] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [isLoading, setIsLoading] = useState(true);
    const [hoveredProduct, setHoveredProduct] = useState(null);
    const [currentImageIndex, setCurrentImageIndex] = useState({});
    const [sortOption, setSortOption] = useState('newest');
    const hoverIntervalsRef = useRef({});

    const loadWishlist = async () => {
        if (!authService.isAuthenticated()) {
            setWishlistItems([]);
            return;
        }

        try {
            const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.WISHLIST}`, {
                headers: authService.getAuthHeaders(),
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data?.message || 'Failed to load wishlist');
            }

            const items = Array.isArray(data?.data?.items) ? data.data.items : [];
            const products = items
                .map((item) => item.productId)
                .filter(Boolean);
            setWishlistItems(products);
        } catch (error) {
            notify.error(error, 'Failed to load wishlist');
        }
    };

    const loadData = async () => {
        try {
            setIsLoading(true);

            const productsUrl = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.PRODUCTS}?limit=${PRODUCT_FETCH_LIMIT}&sort=-popularity`;
            const categoriesUrl = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.CATEGORIES}`;

            const [productsResponse, categoriesResponse] = await Promise.all([
                fetch(productsUrl),
                fetch(categoriesUrl)
            ]);

            if (!productsResponse.ok) {
                throw new Error(`Products request failed: ${productsResponse.status}`);
            }

            if (!categoriesResponse.ok) {
                throw new Error(`Categories request failed: ${categoriesResponse.status}`);
            }

            const [productsData, categoriesData] = await Promise.all([
                productsResponse.json(),
                categoriesResponse.json()
            ]);

            const apiProducts = (productsData?.data?.products || []).map(product => ({
                ...product,
                images: Array.isArray(product.images) ? product.images : []
            }));

            const apiCategories = Array.isArray(categoriesData?.data)
                ? categoriesData.data
                : (categoriesData?.data?.categories || []);

            if (!apiProducts.length) {
                throw new Error('No products returned from API');
            }

            setProducts(apiProducts);

            const categoriesWithCounts = apiCategories
                .map(category => ({
                    ...category,
                    productCount: apiProducts.filter(product => product.category?.slug === category.slug).length
                }))
                .sort((a, b) => b.productCount - a.productCount)
                .slice(0, FEATURED_CATEGORY_LIMIT);

            setCategories(categoriesWithCounts);

            const categoryBuckets = bucketProductsBySlug(apiProducts);
            setProductsByCategory(buildProductsByCategory(categoriesWithCounts, categoryBuckets));
            setFeaturedProducts(aggregateFeaturedProducts(categoriesWithCounts, categoryBuckets, apiProducts));
            initializeImageIndices(apiProducts);
        } catch (error) {
            console.error('Falling back to mock data due to:', error);
            const mockProducts = generateMockProductsWithImages();
            setProducts(mockProducts);
            setCategories(FALLBACK_CATEGORIES);

            const fallbackBuckets = bucketProductsBySlug(mockProducts);
            setProductsByCategory(buildProductsByCategory(FALLBACK_CATEGORIES, fallbackBuckets));
            setFeaturedProducts(aggregateFeaturedProducts(FALLBACK_CATEGORIES, fallbackBuckets, mockProducts));
            initializeImageIndices(mockProducts);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadData();
        loadWishlist();

        return () => {
            Object.values(hoverIntervalsRef.current).forEach(intervalId => clearInterval(intervalId));
        };
         
    }, []);

    const generateMockProductsWithImages = () => {
        const mockProducts = [];
        const desiredCount = Math.max(FEATURED_PRODUCTS_TARGET, 80);

        for (let index = 0; index < desiredCount; index += 1) {
            const category = FALLBACK_CATEGORIES[index % FALLBACK_CATEGORIES.length];
            const basePrice = 50 + Math.random() * 500;
            const discount = Math.random() > 0.6 ? Math.floor(Math.random() * 30) + 5 : 0;

            mockProducts.push({
                _id: `mock_${index}`,
                title: `${category.title} Premium Product ${index + 1}`,
                basePrice,
                baseDiscount: discount,
                condition: [PRODUCT_CONDITIONS.NEW, PRODUCT_CONDITIONS.HOT, PRODUCT_CONDITIONS.DEFAULT][index % 3],
                ratings: {
                    average: 3 + Math.random() * 2,
                    count: Math.floor(Math.random() * 120) + 5
                },
                brand: {
                    title: MOCK_BRANDS[index % MOCK_BRANDS.length]
                },
                category,
                images: getRandomProductImages(3)
            });
        }

        return mockProducts;
    };

    const getRandomProductImages = (count = 3) => {
        return Array.from({ length: count }).map((_, imageIndex) => ({
            path: getRandomProductImage(),
            isPrimary: imageIndex === 0,
            _id: `mock_image_${Date.now()}_${imageIndex}`
        }));
    };

    const bucketProductsBySlug = (productList) => {
        return productList.reduce((acc, product) => {
            const slug = product.category?.slug;

            if (!slug) {
                return acc;
            }

            if (!acc[slug]) {
                acc[slug] = [];
            }

            if (acc[slug].length < PRODUCTS_PER_CATEGORY_LIMIT) {
                acc[slug].push(product);
            }

            return acc;
        }, {});
    };

    const buildProductsByCategory = (categoryList, buckets) => {
        const map = {};

        categoryList.forEach(category => {
            map[category.slug] = buckets[category.slug] || [];
        });

        return map;
    };

    const aggregateFeaturedProducts = (categoryList, buckets, fallbackProducts) => {
        const prioritized = [];
        const usedIds = new Set();

        categoryList.forEach(category => {
            (buckets[category.slug] || []).forEach(product => {
                if (prioritized.length < FEATURED_PRODUCTS_TARGET && product?._id && !usedIds.has(product._id)) {
                    prioritized.push(product);
                    usedIds.add(product._id);
                }
            });
        });

        if (prioritized.length < FEATURED_PRODUCTS_TARGET) {
            (fallbackProducts || []).some(product => {
                if (!product?._id || usedIds.has(product._id)) {
                    return false;
                }

                prioritized.push(product);
                usedIds.add(product._id);
                return prioritized.length >= FEATURED_PRODUCTS_TARGET;
            });
        }

        return prioritized.slice(0, FEATURED_PRODUCTS_TARGET);
    };

    const initializeImageIndices = (sourceProducts) => {
        const indices = {};

        sourceProducts.forEach(product => {
            indices[product._id] = 0;
        });

        setCurrentImageIndex(indices);
    };

    const addToCart = async (product) => {
        if (!authService.isAuthenticated()) {
            navigate('/login');
            return;
        }

        try {
            const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.CART}`, {
                method: 'POST',
                headers: authService.getAuthHeaders(),
                body: JSON.stringify({
                    productId: product._id,
                    quantity: 1,
                }),
            });
            const data = await response.json();

            if (!response.ok || !data?.success) {
                throw new Error(data?.message || 'Failed to add item to cart');
            }

            setCartItems((prev) => {
                const existing = prev.find((item) => item._id === product._id);
                if (existing) {
                    return prev.map((item) => (
                        item._id === product._id
                            ? { ...item, quantity: item.quantity + 1 }
                            : item
                    ));
                }

                return [...prev, { ...product, quantity: 1 }];
            });
        } catch (error) {
            notify.error(error, 'Failed to add item to cart');
        }
    };

    const addToWishlist = async (product) => {
        if (!authService.isAuthenticated()) {
            navigate('/login');
            return;
        }

        try {
            const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.WISHLIST}`, {
                method: 'POST',
                headers: authService.getAuthHeaders(),
                body: JSON.stringify({ productId: product._id }),
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data?.message || 'Failed to add to wishlist');
            }

            setWishlistItems((prev) => {
                if (prev.some((item) => item._id === product._id)) {
                    return prev;
                }
                return [...prev, product];
            });
        } catch (error) {
            notify.error(error, 'Failed to add to wishlist');
        }
    };

    const removeFromWishlist = async (productId) => {
        if (!authService.isAuthenticated()) {
            setWishlistItems((prev) => prev.filter((item) => item._id !== productId));
            return;
        }

        try {
            const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.WISHLIST}`, {
                headers: authService.getAuthHeaders(),
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data?.message || 'Failed to resolve wishlist item');
            }

            const items = Array.isArray(data?.data?.items) ? data.data.items : [];
            const matched = items.find((item) => item.productId?._id === productId);
            if (!matched?._id) {
                setWishlistItems((prev) => prev.filter((item) => item._id !== productId));
                return;
            }

            const deleteResponse = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.WISHLIST}/${matched._id}`, {
                method: 'DELETE',
                headers: authService.getAuthHeaders(),
            });
            const deleteData = await deleteResponse.json();
            if (!deleteResponse.ok) {
                throw new Error(deleteData?.message || 'Failed to remove from wishlist');
            }

            setWishlistItems((prev) => prev.filter((item) => item._id !== productId));
        } catch (error) {
            notify.error(error, 'Failed to remove from wishlist');
        }
    };

    const isInWishlist = (productId) => wishlistItems.some(item => item._id === productId);

    const handleImageCycle = (productId, images = []) => {
        if (images.length < 2) {
            return;
        }

        setCurrentImageIndex(prev => ({
            ...prev,
            [productId]: ((prev[productId] || 0) + 1) % images.length
        }));
    };

    const handleProductHover = (product) => {
        setHoveredProduct(product._id);

        if ((product.images?.length || 0) < 2 || hoverIntervalsRef.current[product._id]) {
            return;
        }

        hoverIntervalsRef.current[product._id] = setInterval(() => {
            handleImageCycle(product._id, product.images);
        }, IMAGE_ROTATION_INTERVAL);
    };

    const handleProductLeave = (product) => {
        setHoveredProduct(null);
        const intervalId = hoverIntervalsRef.current[product._id];

        if (intervalId) {
            clearInterval(intervalId);
            delete hoverIntervalsRef.current[product._id];
        }

        setCurrentImageIndex(prev => ({
            ...prev,
            [product._id]: 0
        }));
    };

    const formatCurrency = (price) => formatPrice(price || 0, CURRENCY_CONFIG.DEFAULT, CURRENCY_CONFIG.LOCALE);

    const getImageUrl = (path) => {
        if (!path) {
            return getRandomProductImage();
        }

        if (path.startsWith('http')) {
            return path;
        }

        return path;
    };

    const getCurrentImage = (product) => {
        const images = product.images || [];
        if (!images.length) {
            return getRandomProductImage();
        }

        const index = currentImageIndex[product._id] || 0;
        const currentImage = images[index] || images[0];
        return getImageUrl(currentImage?.path);
    };

    const sortProducts = (productList) => {
        const sorted = [...productList];

        switch (sortOption) {
            case 'price-low':
                return sorted.sort((a, b) => {
                    const priceA = calculateDiscountPrice(a.basePrice || 0, a.baseDiscount || 0);
                    const priceB = calculateDiscountPrice(b.basePrice || 0, b.baseDiscount || 0);
                    return priceA - priceB;
                });
            case 'price-high':
                return sorted.sort((a, b) => {
                    const priceA = calculateDiscountPrice(a.basePrice || 0, a.baseDiscount || 0);
                    const priceB = calculateDiscountPrice(b.basePrice || 0, b.baseDiscount || 0);
                    return priceB - priceA;
                });
            case 'rating':
                return sorted.sort((a, b) => {
                    const ratingA = a.ratings?.average || 0;
                    const ratingB = b.ratings?.average || 0;
                    return ratingB - ratingA;
                });
            case 'newest':
            default:
                return sorted; // Keep original order (already sorted by popularity from API)
        }
    };

    const renderProductCard = (product) => {
        if (!product) {
            return null;
        }

        const hasDiscount = Number(product.baseDiscount) > 0;
        const finalPrice = calculateDiscountPrice(product.basePrice || 0, product.baseDiscount || 0);
        const isHovered = hoveredProduct === product._id;
        const inWishlist = isInWishlist(product._id);
        const wishlistHandler = async () => {
            if (inWishlist) {
                await removeFromWishlist(product._id);
            } else {
                await addToWishlist(product);
            }
        };

        return (
            <div
                key={product._id}
                className="group relative bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-2xl hover:border-blue-300 transition-all duration-300 cursor-pointer transform hover:-translate-y-1 flex flex-col h-full"
                onClick={() => navigate(`/products/${product._id}`)}
                onMouseEnter={() => handleProductHover(product)}
                onMouseLeave={() => handleProductLeave(product)}
            >
                <div className="relative bg-gray-50 flex-shrink-0">
                    <img
                        src={getCurrentImage(product)}
                        alt={product.title}
                        className="w-full h-48 object-cover object-center transition-transform duration-500 group-hover:scale-105"
                    />

                    {product.condition && (
                        <span className="absolute top-3 left-3 px-3 py-1 text-xs font-semibold rounded-full bg-blue-600 text-white shadow-lg">
                            {product.condition === PRODUCT_CONDITIONS.HOT && '🔥 Hot'}
                            {product.condition === PRODUCT_CONDITIONS.NEW && '✨ New'}
                            {product.condition === PRODUCT_CONDITIONS.DEFAULT && '⭐ Trending'}
                        </span>
                    )}

                    <button
                        type="button"
                        title="Wishlist"
                        onClick={(event) => {
                            event.stopPropagation();
                            wishlistHandler();
                        }}
                        className={`absolute top-3 right-3 p-2 rounded-full backdrop-blur-sm transition-all duration-200 ${inWishlist ? 'bg-red-100 text-red-600 shadow-lg' : 'bg-white/80 text-gray-600 hover:bg-red-100 hover:text-red-600'} ${isHovered ? 'scale-110' : ''}`}
                    >
                        {inWishlist ? '❤️' : '🤍'}
                    </button>

                    <div className={`absolute inset-0 bg-black/20 flex items-center justify-center gap-3 transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
                        <button className="p-3 bg-white rounded-full shadow-lg hover:bg-gray-50 transition-all duration-200 transform hover:scale-110" title="Quick View">
                            <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                        </button>
                        <button className="p-3 bg-white rounded-full shadow-lg hover:bg-gray-50 transition-all duration-200 transform hover:scale-110" title="Compare">
                            <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                        </button>
                    </div>
                </div>

                <div className="p-4 flex-grow flex flex-col">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                            {product.brand?.title || 'Brand'}
                        </span>
                        <div className="flex items-center gap-1">
                            <div className="flex text-yellow-400 text-sm">
                                {'★'.repeat(Math.floor(product.ratings?.average || 4))}
                                {'☆'.repeat(5 - Math.floor(product.ratings?.average || 4))}
                            </div>
                            <span className="text-xs text-gray-500 ml-1">
                                ({product.ratings?.count || Math.floor(Math.random() * 100) + 10})
                            </span>
                        </div>
                    </div>

                    <h3 className="font-semibold text-gray-900 text-sm leading-tight line-clamp-2 group-hover:text-blue-700 transition-colors min-h-[2.5rem] mb-3">
                        {product.title}
                    </h3>

                    <div className="mt-auto space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-lg text-gray-900">
                                    {formatCurrency(finalPrice)}
                                </span>
                                {hasDiscount && (
                                    <span className="text-sm text-gray-500 line-through">
                                        {formatCurrency(product.basePrice)}
                                    </span>
                                )}
                            </div>
                            {hasDiscount && (
                                <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-1 rounded-full">
                                    Save {Math.round(product.baseDiscount)}%
                                </span>
                            )}
                        </div>

                        <button
                            type="button"
                            onClick={(event) => {
                                event.stopPropagation();
                                addToCart(product);
                            }}
                            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-2.5 px-4 rounded-lg transition-all duration-200 text-sm font-semibold shadow-lg hover:shadow-xl transform hover:scale-[1.02] flex items-center justify-center gap-2"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5-5M7 13l-2.5 5M17 13v6a2 2 0 01-2 2H9a2 2 0 01-2-2v-6" />
                            </svg>
                            Add to Cart
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    const featuredGridProducts = sortProducts(featuredProducts.length ? featuredProducts : products.slice(0, FEATURED_PRODUCTS_TARGET));
    const visibleCategoryProducts = sortProducts(selectedCategory === 'all' ? [] : (productsByCategory[selectedCategory] || []));

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white shadow-sm border-b border-gray-200">
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 border-b border-gray-200">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex items-center justify-between h-10 text-sm text-white">
                            <div>🚚 Free shipping on orders over $50 | ✨ 30-day returns</div>
                            <div className="flex items-center space-x-4">
                                <span className="hover:text-blue-200 cursor-pointer">Help</span>
                                <span className="hover:text-blue-200 cursor-pointer">Contact</span>
                                <span className="hover:text-blue-200 cursor-pointer">Track Order</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <div className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                            E-Shop Pro
                        </div>

                        <div className="flex-1 max-w-2xl mx-8">
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Search for products, brands, categories..."
                                    className="w-full px-4 py-3 pl-12 border border-gray-300 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
                                />
                                <svg className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
                        </div>

                        <div className="flex items-center space-x-4">
                            <button className="relative p-2 text-gray-600 hover:text-blue-600 transition-colors" title="Wishlist">
                                <span className="text-lg">🤍</span>
                                {wishlistItems.length > 0 && (
                                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                                        {wishlistItems.length}
                                    </span>
                                )}
                            </button>
                            <button className="relative p-2 text-gray-600 hover:text-blue-600 transition-colors" title="Cart">
                                <span className="text-lg">🛒</span>
                                {cartItems.length > 0 && (
                                    <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                                        {cartItems.reduce((sum, item) => sum + item.quantity, 0)}
                                    </span>
                                )}
                            </button>
                            <button className="p-2 text-gray-600 hover:text-blue-600 transition-colors" title="Account">
                                <span className="text-lg">👤</span>
                            </button>
                        </div>
                    </div>

                    <nav className="flex items-center space-x-8 py-4 border-t border-gray-200 overflow-auto">
                        <button
                            onClick={() => setSelectedCategory('all')}
                            className={`font-medium transition-colors ${selectedCategory === 'all' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-700 hover:text-blue-600'}`}
                        >
                            All Products
                        </button>
                        {categories.slice(0, 5).map((category) => (
                            <button
                                key={category._id || category.slug}
                                onClick={() => setSelectedCategory(category.slug)}
                                className={`font-medium transition-colors ${selectedCategory === category.slug ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-700 hover:text-blue-600'}`}
                            >
                                {category.title}
                            </button>
                        ))}
                        <span className="text-red-600 font-medium hover:text-red-700 cursor-pointer whitespace-nowrap">🔥 Featured</span>
                    </nav>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="relative bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-2xl overflow-hidden mb-12">
                    <div className="absolute inset-0 bg-black/20" />
                    <div className="relative z-10 px-8 py-16 text-white">
                        <div className="max-w-2xl">
                            <span className="inline-block bg-white/20 backdrop-blur-sm text-white text-sm font-medium px-4 py-2 rounded-full mb-4">
                                🎉 Limited Time Offer
                            </span>
                            <h1 className="text-5xl md:text-6xl font-bold mb-4">
                                Up to 80% Off
                            </h1>
                            <p className="text-xl mb-6 text-white/90">
                                Discover amazing deals on fashion, electronics, and more! Free shipping on all orders.
                            </p>
                            <button className="bg-white text-blue-600 hover:bg-gray-100 font-semibold px-8 py-4 rounded-full transition-all duration-200 transform hover:scale-105 shadow-xl">
                                Shop Now →
                            </button>
                        </div>
                    </div>
                </div>

                <div className="mb-12">
                    <div className="text-center mb-8">
                        <h2 className="text-3xl font-bold text-gray-900 mb-4">Shop by Category</h2>
                        <p className="text-gray-600 text-lg">Discover amazing products across all our categories</p>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                        {categories.slice(0, 10).map((category) => (
                            <button
                                key={category._id || category.slug}
                                onClick={() => setSelectedCategory(category.slug)}
                                className={`group relative p-6 bg-white rounded-xl border-2 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 ${selectedCategory === category.slug
                                    ? 'border-blue-500 bg-blue-50'
                                    : 'border-gray-200 hover:border-blue-300'
                                    }`}
                            >
                                <div className="text-center">
                                    <div className="mb-3">
                                        <div className={`w-12 h-12 mx-auto rounded-full flex items-center justify-center text-2xl transition-colors ${selectedCategory === category.slug
                                            ? 'bg-blue-500 text-white'
                                            : 'bg-gray-100 text-gray-600 group-hover:bg-blue-100 group-hover:text-blue-600'
                                            }`}>
                                            {category.title.includes('Electronics') && '📱'}
                                            {category.title.includes('Fashion') && '👕'}
                                            {category.title.includes('Home') && '🏠'}
                                            {category.title.includes('Sports') && '⚽'}
                                            {category.title.includes('Books') && '📚'}
                                            {!['Electronics', 'Fashion', 'Home', 'Sports', 'Books'].some(keyword => category.title.includes(keyword)) && '🛍️'}
                                        </div>
                                    </div>
                                    <h3 className={`font-semibold text-sm transition-colors ${selectedCategory === category.slug
                                        ? 'text-blue-700'
                                        : 'text-gray-800 group-hover:text-blue-600'
                                        }`}>
                                        {category.title}
                                    </h3>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="mb-8">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center space-x-8">
                            <button
                                onClick={() => setSelectedCategory('all')}
                                className={`text-lg font-semibold pb-2 border-b-2 transition-colors ${selectedCategory === 'all' ? 'text-gray-900 border-blue-600' : 'text-gray-500 border-transparent hover:text-gray-700'}`}
                            >
                                All Products
                            </button>

                            {categories.slice(0, 5).map((category) => (
                                <button
                                    key={category._id || category.slug}
                                    onClick={() => setSelectedCategory(category.slug)}
                                    className={`text-lg font-semibold pb-2 border-b-2 transition-colors whitespace-nowrap ${selectedCategory === category.slug ? 'text-gray-900 border-blue-600' : 'text-gray-500 border-transparent hover:text-gray-700'}`}
                                >
                                    {category.title} ({(productsByCategory[category.slug] || []).length})
                                </button>
                            ))}
                        </div>

                        <div className="flex items-center space-x-4">
                            <select
                                value={sortOption}
                                onChange={(e) => setSortOption(e.target.value)}
                                className="border border-gray-300 rounded-lg px-4 py-2 text-sm bg-white shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer hover:border-gray-400 transition-colors"
                            >
                                <option value="newest">Newest First</option>
                                <option value="price-low">Price: Low to High</option>
                                <option value="price-high">Price: High to Low</option>
                                <option value="rating">Best Rating</option>
                            </select>
                        </div>
                    </div>
                </div>

                {isLoading ? (
                    <div className="flex justify-center items-center min-h-[400px]">
                        <div className="text-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
                            <div className="text-lg text-gray-600">Loading amazing products...</div>
                        </div>
                    </div>
                ) : (
                    <section>
                        {selectedCategory === 'all' ? (
                            <div>
                                <div className="flex items-center justify-between mb-8">
                                    <div>
                                        <h2 className="text-3xl font-bold text-gray-900 mb-2">Featured Products</h2>
                                        <p className="text-gray-600">
                                            Showing {featuredGridProducts.length} curated items sourced from {categories.length || FALLBACK_CATEGORIES.length} categories
                                        </p>
                                    </div>
                                    <div className="text-sm text-gray-500">
                                        Powered by smart sampling (fetch limit {PRODUCT_FETCH_LIMIT})
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
                                    {featuredGridProducts.map(renderProductCard)}
                                </div>
                            </div>
                        ) : (
                            <div>
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-2xl font-bold text-gray-900">
                                        {categories.find(c => c.slug === selectedCategory)?.title || 'Products'}
                                        <span className="text-sm font-normal text-gray-500 ml-2">
                                            ({visibleCategoryProducts.length} items)
                                        </span>
                                    </h2>
                                    <button
                                        onClick={() => setSelectedCategory('all')}
                                        className="text-blue-600 hover:text-blue-700 font-medium"
                                    >
                                        ← Back to All Categories
                                    </button>
                                </div>

                                {!visibleCategoryProducts.length ? (
                                    <div className="text-center py-12">
                                        <div className="text-6xl mb-4">🛍️</div>
                                        <h3 className="text-xl font-semibold text-gray-700 mb-2">No Products Found</h3>
                                        <p className="text-gray-500">No products available in this category</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
                                        {visibleCategoryProducts.map(renderProductCard)}
                                    </div>
                                )}
                            </div>
                        )}
                    </section>
                )}
            </main>

            <footer className="bg-gray-900 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                        <div className="space-y-4">
                            <div className="text-2xl font-bold text-blue-400">E-Shop Pro</div>
                            <p className="text-gray-300 text-sm leading-relaxed">
                                Your trusted partner for premium products. We deliver quality, style, and excellence right to your doorstep with professional service.
                            </p>
                            <div className="flex space-x-3">
                                <button className="bg-blue-600 hover:bg-blue-700 p-2 rounded-full transition-colors" aria-label="Twitter">
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z" />
                                    </svg>
                                </button>
                                <button className="bg-blue-800 hover:bg-blue-900 p-2 rounded-full transition-colors" aria-label="Facebook">
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                                    </svg>
                                </button>
                                <button className="bg-pink-600 hover:bg-pink-700 p-2 rounded-full transition-colors" aria-label="Instagram">
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.174-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.347-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.402.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.357-.629-2.746-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24.009 12.017 24.009c6.624 0 11.99-5.367 11.99-11.988C24.007 5.367 18.641.001 12.017.001z" />
                                    </svg>
                                </button>
                                <button className="bg-red-600 hover:bg-red-700 p-2 rounded-full transition-colors" aria-label="YouTube">
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-white">Quick Links</h3>
                            <ul className="space-y-2 text-sm">
                                <li><a href="#" className="text-gray-300 hover:text-blue-400 transition-colors">About Us</a></li>
                                <li><a href="#" className="text-gray-300 hover:text-blue-400 transition-colors">Contact Us</a></li>
                                <li><a href="#" className="text-gray-300 hover:text-blue-400 transition-colors">FAQ</a></li>
                                <li><a href="#" className="text-gray-300 hover:text-blue-400 transition-colors">Size Guide</a></li>
                                <li><a href="#" className="text-gray-300 hover:text-blue-400 transition-colors">Returns & Exchanges</a></li>
                                <li><a href="#" className="text-gray-300 hover:text-blue-400 transition-colors">Track Your Order</a></li>
                            </ul>
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-white">Customer Service</h3>
                            <ul className="space-y-2 text-sm">
                                <li><a href="#" className="text-gray-300 hover:text-blue-400 transition-colors">Help Center</a></li>
                                <li><a href="#" className="text-gray-300 hover:text-blue-400 transition-colors">Shipping Information</a></li>
                                <li><a href="#" className="text-gray-300 hover:text-blue-400 transition-colors">Return Policy</a></li>
                                <li><a href="#" className="text-gray-300 hover:text-blue-400 transition-colors">Privacy Policy</a></li>
                                <li><a href="#" className="text-gray-300 hover:text-blue-400 transition-colors">Terms of Service</a></li>
                                <li><a href="#" className="text-gray-300 hover:text-blue-400 transition-colors">Live Chat Support</a></li>
                            </ul>
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-white">Stay Connected</h3>
                            <p className="text-gray-300 text-sm">Subscribe to get exclusive offers and updates on new products</p>
                            <div className="space-y-3">
                                <input
                                    type="email"
                                    placeholder="Enter your email address"
                                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                />
                                <button className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-3 px-4 rounded-lg transition-all duration-200 font-semibold shadow-lg">
                                    Subscribe Now
                                </button>
                            </div>
                            <div className="flex items-center gap-4 pt-2">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                    <span className="text-sm text-gray-300">24/7 Support</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                                    <span className="text-sm text-gray-300">Fast Delivery</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="border-t border-gray-800">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                            <div className="text-sm text-gray-300">
                                © 2025 E-Shop Pro. All rights reserved. Built with ❤️ for an amazing shopping experience.
                            </div>
                            <div className="flex items-center gap-6">
                                <div className="flex items-center gap-3">
                                    <span className="text-sm text-gray-300">We Accept:</span>
                                    <div className="flex gap-2">
                                        <div className="px-2 py-1 bg-blue-600 text-white text-xs rounded">VISA</div>
                                        <div className="px-2 py-1 bg-red-600 text-white text-xs rounded">MC</div>
                                        <div className="px-2 py-1 bg-blue-500 text-white text-xs rounded">PAYPAL</div>
                                        <div className="px-2 py-1 bg-green-600 text-white text-xs rounded">SECURE</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default HomePage;
