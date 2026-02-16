import { logger } from '../utils/logger.js';

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getRandomProductImage } from '../services/imageService';
import { formatPrice, calculateDiscountPrice } from '../utils/productUtils';
import { API_CONFIG, PRODUCT_CONDITIONS, CURRENCY_CONFIG } from '../constants';

const ProductDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [product, setProduct] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedImage, setSelectedImage] = useState(0);
    const [quantity, setQuantity] = useState(1);
    const [selectedVariant, setSelectedVariant] = useState(null);

    useEffect(() => {
        loadProductDetail();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const loadProductDetail = async () => {
        try {
            setIsLoading(true);
            const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.PRODUCTS}/${id}`);
            
            if (!response.ok) {
                throw new Error('Product not found');
            }

            const data = await response.json();
            const productData = data?.data || data;
            
            // Ensure images array exists
            if (productData) {
                productData.images = Array.isArray(productData.images) ? productData.images : [];
                setProduct(productData);
            }
        } catch (error) {
            console.error('Error loading product:', error);
            // If API fails, show error
            setProduct(null);
        } finally {
            setIsLoading(false);
        }
    };

    const formatCurrency = (price) => formatPrice(price || 0, CURRENCY_CONFIG.DEFAULT, CURRENCY_CONFIG.LOCALE);

    const getImageUrl = (path) => {
        if (!path) return getRandomProductImage();
        if (path.startsWith('http')) return path;
        return path;
    };

    const handleAddToCart = () => {
        logger.info('Adding to cart:', { product, quantity, selectedVariant });
        alert(`Added ${quantity} item(s) to cart!`);
    };

    const handleBuyNow = () => {
        handleAddToCart();
        navigate('/cart');
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4" />
                    <div className="text-lg text-gray-600">Loading product details...</div>
                </div>
            </div>
        );
    }

    if (!product) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="text-6xl mb-4">ðŸ˜•</div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Product Not Found</h2>
                    <p className="text-gray-600 mb-6">The product you're looking for doesn't exist.</p>
                    <button
                        onClick={() => navigate('/')}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
                    >
                        Back to Home
                    </button>
                </div>
            </div>
        );
    }

    const hasDiscount = Number(product.baseDiscount) > 0;
    const finalPrice = calculateDiscountPrice(product.basePrice || 0, product.baseDiscount || 0);
    const images = product.images?.length ? product.images : [{ path: getRandomProductImage(), isPrimary: true }];

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white shadow-sm border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <button
                            onClick={() => navigate('/')}
                            className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent hover:opacity-80 transition-opacity"
                        >
                            E-Shop Pro
                        </button>
                        <div className="flex items-center space-x-4">
                            <button className="p-2 text-gray-600 hover:text-blue-600 transition-colors" title="Cart">
                                <span className="text-lg">ðŸ›’</span>
                            </button>
                            <button className="p-2 text-gray-600 hover:text-blue-600 transition-colors" title="Account">
                                <span className="text-lg">ðŸ‘¤</span>
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Breadcrumb */}
            <div className="bg-white border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
                    <nav className="flex text-sm text-gray-500">
                        <button onClick={() => navigate('/')} className="hover:text-blue-600">Home</button>
                        <span className="mx-2">/</span>
                        <button onClick={() => navigate('/')} className="hover:text-blue-600">
                            {product.category?.title || 'Products'}
                        </button>
                        <span className="mx-2">/</span>
                        <span className="text-gray-900 font-medium truncate">{product.title}</span>
                    </nav>
                </div>
            </div>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
                    {/* Image Gallery */}
                    <div className="space-y-4">
                        <div className="bg-white rounded-xl overflow-hidden border border-gray-200 p-4">
                            <div className="relative aspect-square bg-gray-50 rounded-lg overflow-hidden">
                                <img
                                    src={getImageUrl(images[selectedImage]?.path)}
                                    alt={product.title}
                                    className="w-full h-full object-cover"
                                />
                                {product.condition && (
                                    <span className="absolute top-4 left-4 px-4 py-2 text-sm font-semibold rounded-full bg-blue-600 text-white shadow-lg">
                                        {product.condition === PRODUCT_CONDITIONS.HOT && 'ðŸ”¥ Hot'}
                                        {product.condition === PRODUCT_CONDITIONS.NEW && 'âœ¨ New'}
                                        {product.condition === PRODUCT_CONDITIONS.DEFAULT && 'â­ Trending'}
                                    </span>
                                )}
                                {hasDiscount && (
                                    <span className="absolute top-4 right-4 px-4 py-2 text-sm font-bold rounded-full bg-red-600 text-white shadow-lg">
                                        -{Math.round(product.baseDiscount)}%
                                    </span>
                                )}
                            </div>
                        </div>
                        {images.length > 1 && (
                            <div className="grid grid-cols-4 gap-2">
                                {images.map((img, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => setSelectedImage(idx)}
                                        className={`aspect-square bg-white rounded-lg overflow-hidden border-2 transition-all ${
                                            selectedImage === idx ? 'border-blue-600 ring-2 ring-blue-200' : 'border-gray-200 hover:border-blue-300'
                                        }`}
                                    >
                                        <img
                                            src={getImageUrl(img.path)}
                                            alt={`${product.title} ${idx + 1}`}
                                            className="w-full h-full object-cover"
                                        />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Product Info */}
                    <div className="space-y-6">
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-sm font-medium text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                                    {product.brand?.title || 'Brand'}
                                </span>
                                <span className="text-sm text-gray-500">
                                    SKU: {product._id?.substring(0, 8).toUpperCase()}
                                </span>
                            </div>
                            <h1 className="text-3xl font-bold text-gray-900 mb-3">{product.title}</h1>
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-1">
                                    <div className="flex text-yellow-400 text-lg">
                                        {'â˜…'.repeat(Math.floor(product.ratings?.average || 4))}
                                        {'â˜†'.repeat(5 - Math.floor(product.ratings?.average || 4))}
                                    </div>
                                    <span className="text-sm font-medium text-gray-900 ml-1">
                                        {(product.ratings?.average || 4).toFixed(1)}
                                    </span>
                                </div>
                                <span className="text-sm text-gray-500">
                                    ({product.ratings?.count || 0} reviews)
                                </span>
                            </div>
                        </div>

                        <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                            <div className="flex items-baseline gap-3 mb-2">
                                <span className="text-4xl font-bold text-gray-900">
                                    {formatCurrency(finalPrice)}
                                </span>
                                {hasDiscount && (
                                    <span className="text-xl text-gray-500 line-through">
                                        {formatCurrency(product.basePrice)}
                                    </span>
                                )}
                            </div>
                            {hasDiscount && (
                                <div className="flex items-center gap-2">
                                    <span className="text-green-600 font-semibold">You save {formatCurrency(product.basePrice - finalPrice)}</span>
                                    <span className="text-sm text-gray-500">({Math.round(product.baseDiscount)}% off)</span>
                                </div>
                            )}
                            <div className="mt-4 flex items-center gap-2 text-sm">
                                <span className="text-green-600 font-medium">âœ“ In Stock</span>
                                <span className="text-gray-400">|</span>
                                <span className="text-gray-600">ðŸšš Free Shipping</span>
                            </div>
                        </div>

                        {/* Quantity Selector */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-900 mb-2">Quantity</label>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                    className="w-10 h-10 rounded-lg border-2 border-gray-300 hover:border-blue-600 hover:text-blue-600 font-bold transition-colors"
                                >
                                    -
                                </button>
                                <input
                                    type="number"
                                    value={quantity}
                                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                                    className="w-20 h-10 text-center border-2 border-gray-300 rounded-lg font-semibold focus:border-blue-600 focus:outline-none"
                                    min="1"
                                />
                                <button
                                    onClick={() => setQuantity(quantity + 1)}
                                    className="w-10 h-10 rounded-lg border-2 border-gray-300 hover:border-blue-600 hover:text-blue-600 font-bold transition-colors"
                                >
                                    +
                                </button>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="space-y-3">
                            <button
                                onClick={handleBuyNow}
                                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-4 px-6 rounded-xl font-bold text-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
                            >
                                Buy Now
                            </button>
                            <button
                                onClick={handleAddToCart}
                                className="w-full bg-white hover:bg-gray-50 text-blue-600 border-2 border-blue-600 py-4 px-6 rounded-xl font-bold text-lg transition-all duration-200 flex items-center justify-center gap-2"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5-5M7 13l-2.5 5M17 13v6a2 2 0 01-2 2H9a2 2 0 01-2-2v-6" />
                                </svg>
                                Add to Cart
                            </button>
                            <button className="w-full bg-white hover:bg-gray-50 text-gray-700 border-2 border-gray-300 py-4 px-6 rounded-xl font-bold text-lg transition-all duration-200 flex items-center justify-center gap-2">
                                <span className="text-2xl">ðŸ¤</span>
                                Add to Wishlist
                            </button>
                        </div>

                        {/* Features */}
                        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                            <div className="flex items-center gap-2 text-sm">
                                <span className="text-blue-600">ðŸ›¡ï¸</span>
                                <span className="text-gray-700">Secure Payment</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                                <span className="text-blue-600">â†©ï¸</span>
                                <span className="text-gray-700">30-Day Returns</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                                <span className="text-blue-600">âœ“</span>
                                <span className="text-gray-700">Genuine Product</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                                <span className="text-blue-600">ðŸ“¦</span>
                                <span className="text-gray-700">Fast Delivery</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Product Description */}
                <div className="bg-white rounded-xl p-8 border border-gray-200 mb-8">
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">Product Description</h2>
                    <div className="prose max-w-none text-gray-700">
                        <p className="mb-4">
                            {product.description || `Experience the premium quality of ${product.title}. This exceptional product from ${product.brand?.title || 'our trusted brand'} combines innovative design with superior functionality.`}
                        </p>
                        <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-3">Key Features:</h3>
                        <ul className="space-y-2 list-disc list-inside">
                            <li>Premium quality materials and construction</li>
                            <li>Designed for durability and long-lasting performance</li>
                            <li>Elegant and modern design aesthetic</li>
                            <li>Perfect for everyday use</li>
                            <li>Backed by manufacturer warranty</li>
                        </ul>
                    </div>
                </div>

                {/* Specifications */}
                <div className="bg-white rounded-xl p-8 border border-gray-200">
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">Specifications</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex justify-between py-3 border-b border-gray-200">
                            <span className="font-medium text-gray-700">Brand</span>
                            <span className="text-gray-900">{product.brand?.title || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between py-3 border-b border-gray-200">
                            <span className="font-medium text-gray-700">Category</span>
                            <span className="text-gray-900">{product.category?.title || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between py-3 border-b border-gray-200">
                            <span className="font-medium text-gray-700">Condition</span>
                            <span className="text-gray-900">{product.condition || 'New'}</span>
                        </div>
                        <div className="flex justify-between py-3 border-b border-gray-200">
                            <span className="font-medium text-gray-700">Availability</span>
                            <span className="text-green-600 font-medium">In Stock</span>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default ProductDetailPage;
