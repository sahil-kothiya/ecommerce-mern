

export const API_CONFIG = {
    BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001',
    ENDPOINTS: {
        PRODUCTS: '/api/products',
        CATEGORIES: '/api/categories',
        BRANDS: '/api/brands',
        DISCOUNTS: '/api/discounts',
        BANNERS: '/api/banners',
        COUPONS: '/api/coupons',
        REVIEWS: '/api/reviews',
        SETTINGS: '/api/settings',
        VARIANT_TYPES: '/api/variant-types',
        VARIANT_OPTIONS: '/api/variant-options',
        WISHLIST: '/api/wishlist',
        CART: '/api/cart',
        ORDERS: '/api/orders',
        AUTH: '/api/auth',
        USERS: '/api/users',
    },
    TIMEOUT: 10000,
    RETRY_ATTEMPTS: 3
};

export const IMAGE_CONFIG = {
    BASE_PATH: '/images',
    PRODUCT_PATH: '/images/products',
    VARIANT_PATH: '/images/products/variants',
    PLACEHOLDER: '/images/placeholder.webp',
    SUPPORTED_FORMATS: ['webp', 'jpg', 'jpeg', 'png'],
    MAX_SIZE_MB: 5,
    LAZY_LOADING: true
};

export const PRODUCT_CONFIG = {
    ITEMS_PER_PAGE: 20,
    MAX_ITEMS_PER_REQUEST: 100,
    FEATURED_LIMIT: 8,
    RELATED_LIMIT: 4,
    MAX_IMAGES_PER_PRODUCT: 10,
    DEFAULT_SORT: 'newest'
};

export const UI_CONFIG = {
    BREAKPOINTS: {
        SM: 640,
        MD: 768,
        LG: 1024,
        XL: 1280,
        '2XL': 1536
    },
    GRID_COLUMNS: {
        SM: 2,
        MD: 3,
        LG: 4,
        XL: 5
    },
    DEBOUNCE_DELAY: 300,
    ANIMATION_DURATION: 200
};

export const PRODUCT_STATUS = {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
    DRAFT: 'draft',
    ARCHIVED: 'archived'
};

export const PRODUCT_CONDITIONS = {
    NEW: 'new',
    HOT: 'hot',
    SALE: 'sale',
    DEFAULT: 'default'
};

export const CURRENCY_CONFIG = {
    DEFAULT: 'USD',
    SYMBOL: '$',
    LOCALE: 'en-US',
    DECIMAL_PLACES: 2
};

export const SORT_OPTIONS = [
    { value: 'newest', label: 'Newest', field: 'createdAt', order: 'desc' },
    { value: 'price-low', label: 'Price: Low to High', field: 'basePrice', order: 'asc' },
    { value: 'price-high', label: 'Price: High to Low', field: 'basePrice', order: 'desc' },
    { value: 'rating', label: 'Best Rating', field: 'ratings.average', order: 'desc' },
    { value: 'popularity', label: 'Most Popular', field: 'viewCount', order: 'desc' }
];

export const FILTER_CONFIG = {
    PRICE_RANGES: [
        { min: 0, max: 50, label: 'Under $50' },
        { min: 50, max: 100, label: '$50 - $100' },
        { min: 100, max: 200, label: '$100 - $200' },
        { min: 200, max: 500, label: '$200 - $500' },
        { min: 500, max: null, label: 'Over $500' }
    ],
    RATING_THRESHOLD: 1,
    MAX_RATING: 5
};

export const ERROR_MESSAGES = {
    NETWORK_ERROR: 'Network error. Please check your connection.',
    SERVER_ERROR: 'Server error. Please try again later.',
    NOT_FOUND: 'The requested resource was not found.',
    VALIDATION_ERROR: 'Please check your input and try again.',
    UNAUTHORIZED: 'You are not authorized to perform this action.',
    IMAGE_LOAD_ERROR: 'Failed to load image.',
    GENERIC_ERROR: 'Something went wrong. Please try again.'
};

export const SUCCESS_MESSAGES = {
    PRODUCT_ADDED_TO_CART: 'Product added to cart successfully!',
    PRODUCT_ADDED_TO_WISHLIST: 'Product added to wishlist!',
    ORDER_PLACED: 'Your order has been placed successfully!',
    PROFILE_UPDATED: 'Your profile has been updated.',
    EMAIL_VERIFIED: 'Your email has been verified.'
};

export const STORAGE_KEYS = {
    CART: 'ecommerce_cart',
    WISHLIST: 'ecommerce_wishlist',
    USER_PREFERENCES: 'user_preferences',
    THEME: 'selected_theme',
    LANGUAGE: 'selected_language',
    SEARCH_HISTORY: 'search_history'
};

export const VALIDATION_RULES = {
    EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    PHONE: /^\+?[\d\s\-\(\)]{10,}$/,
    PASSWORD_MIN_LENGTH: 8,
    NAME_MIN_LENGTH: 2,
    NAME_MAX_LENGTH: 50,
    SEARCH_MIN_LENGTH: 2,
    SEARCH_MAX_LENGTH: 100
};

export const SEO_CONFIG = {
    DEFAULT_TITLE: 'Professional E-Commerce Platform',
    DEFAULT_DESCRIPTION: 'Discover amazing products with our professional e-commerce platform built with modern technology.',
    DEFAULT_KEYWORDS: 'ecommerce, shopping, products, online store',
    TITLE_SEPARATOR: ' | ',
    MAX_TITLE_LENGTH: 60,
    MAX_DESCRIPTION_LENGTH: 160
};

export const THEME_CONFIG = {
    COLORS: {
        PRIMARY: '#3B82F6',
        SECONDARY: '#6B7280',
        SUCCESS: '#10B981',
        WARNING: '#F59E0B',
        ERROR: '#EF4444',
        INFO: '#3B82F6'
    },
    ANIMATIONS: {
        FAST: '150ms',
        NORMAL: '300ms',
        SLOW: '500ms'
    }
};

export default {
    API_CONFIG,
    IMAGE_CONFIG,
    PRODUCT_CONFIG,
    UI_CONFIG,
    PRODUCT_STATUS,
    PRODUCT_CONDITIONS,
    CURRENCY_CONFIG,
    SORT_OPTIONS,
    FILTER_CONFIG,
    ERROR_MESSAGES,
    SUCCESS_MESSAGES,
    STORAGE_KEYS,
    VALIDATION_RULES,
    SEO_CONFIG,
    THEME_CONFIG
};
