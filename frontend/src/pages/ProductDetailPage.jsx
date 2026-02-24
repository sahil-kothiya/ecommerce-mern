import { logger } from '../utils/logger.js';
import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { getRandomProductImage } from '../services/imageService';
import { formatPrice, getProductDisplayPricing } from '../utils/productUtils';
import { API_CONFIG, PRODUCT_CONDITIONS, CURRENCY_CONFIG } from '../constants';
import authService from '../services/authService';
import notify from '../utils/notify';

const ProductDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [product, setProduct] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedImage, setSelectedImage] = useState(0);
    const [quantity, setQuantity] = useState(1);
    const [selectedVariant, setSelectedVariant] = useState(null);

    useEffect(() => { loadProductDetail(); }, [id]);

    const loadProductDetail = async () => {
        try {
            setIsLoading(true);
            const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.PRODUCTS}/${id}`);
            if (!response.ok) throw new Error('Product not found');
            const data = await response.json();
            const productData = data?.data || data;
            if (productData) {
                productData.images = Array.isArray(productData.images) ? productData.images : [];
                const variants = Array.isArray(productData.variants) ? productData.variants : [];
                const activeVariants = variants.filter((variant) => !variant?.status || variant.status === 'active');
                setSelectedVariant(productData.hasVariants ? (activeVariants[0] || variants[0] || null) : null);
                setSelectedImage(0);
                setProduct(productData);
            }
        } catch (error) {
            logger.error('Error loading product:', error);
            setProduct(null);
        } finally { setIsLoading(false); }
    };

    const formatCurrency = (price) => formatPrice(price || 0, CURRENCY_CONFIG.DEFAULT, CURRENCY_CONFIG.LOCALE);
    const getImageUrl = (path) => {
        if (!path) return getRandomProductImage();
        if (path.startsWith('http')) return path;
        return path.startsWith('/') ? `${API_CONFIG.BASE_URL}${path}` : `${API_CONFIG.BASE_URL}/${path}`;
    };

    const handleAddToCart = async () => {
        if (!authService.isAuthenticated()) { navigate('/login'); return false; }
        try {
            const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.CART}`, {
                method: 'POST', headers: authService.getAuthHeaders(),
                body: JSON.stringify({ productId: product._id, variantId: selectedVariant?._id || null, quantity }),
            });
            const data = await response.json();
            if (!response.ok || !data?.success) throw new Error(data?.message || 'Failed to add to cart');
            window.dispatchEvent(new Event('cart:changed'));
            notify.success(`Added ${quantity} item(s) to cart`);
            return true;
        } catch (error) { notify.error(error, 'Failed to add to cart'); return false; }
    };

    const handleBuyNow = async () => { const added = await handleAddToCart(); if (added) navigate('/cart'); };

    if (isLoading) return (
        <div className="flex min-h-[400px] items-center justify-center">
            <div className="store-surface p-12 text-center">
                <div className="mx-auto mb-5 h-14 w-14 animate-spin rounded-full border-[3px] border-[#d2dff9] border-t-[#f9730c] shadow-[0_0_0_4px_rgba(165,187,252,0.18)]" />
                <p className="store-display text-lg text-[#212191]">Loading product…</p>
            </div>
        </div>
    );

    if (!product) return (
        <div className="flex min-h-[400px] items-center justify-center px-4">
            <div className="store-surface p-12 text-center">
                <div className="mb-3 text-5xl">😕</div>
                <h2 className="store-display mb-2 text-xl text-[#131313]">Product Not Found</h2>
                <p className="mb-6 text-sm text-[#666]">The product you're looking for doesn't exist.</p>
                <button onClick={() => navigate('/')} className="store-btn-primary tap-bounce inline-block rounded-2xl px-7 py-3 text-sm font-bold">Back to Home</button>
            </div>
        </div>
    );

    const selectedVariantImages = Array.isArray(selectedVariant?.images) ? selectedVariant.images : [];
    const images = selectedVariantImages.length
        ? selectedVariantImages
        : (product.images?.length ? product.images : [{ path: getRandomProductImage(), isPrimary: true }]);
    const pricing = getProductDisplayPricing(product, { selectedVariantId: selectedVariant?._id });
    const hasDiscount = pricing.hasDiscount;
    const finalPriceLabel = pricing.isRange
        ? `${formatCurrency(pricing.minPrice)} - ${formatCurrency(pricing.maxPrice)}`
        : formatCurrency(pricing.finalPrice);

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

            {/* Product main grid */}
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 mb-10">
                {/* Images */}
                <div className="space-y-3">
                    <div className="store-surface overflow-hidden p-3">
                        <div className="relative aspect-square overflow-hidden rounded-xl bg-gradient-to-br from-slate-50 to-blue-50">
                            <img src={getImageUrl(images[selectedImage]?.path)} alt={product.title} className="h-full w-full object-cover" />
                            {product.condition && (
                                <span className="absolute left-4 top-4 rounded-full bg-gradient-to-r from-[#4250d5] to-[#f9730c] px-4 py-1.5 text-xs font-bold text-white shadow-lg">
                                    {product.condition === PRODUCT_CONDITIONS.HOT && '🔥 Hot'}
                                    {product.condition === PRODUCT_CONDITIONS.NEW && '✨ New'}
                                    {product.condition === PRODUCT_CONDITIONS.DEFAULT && '⭐ Trending'}
                                </span>
                            )}
                            {hasDiscount && (
                                <span className="absolute right-4 top-4 rounded-full bg-[rgba(249,115,12,0.9)] px-3 py-1.5 text-xs font-bold text-white shadow-lg border border-[rgba(255,163,51,0.5)]">
                                    -{Math.round(pricing.discount)}% OFF
                                </span>
                            )}
                        </div>
                    </div>
                    {images.length > 1 && (
                        <div className="grid grid-cols-4 gap-2">
                            {images.map((img, idx) => (
                                <button key={idx} onClick={() => setSelectedImage(idx)}
                                    className={`store-surface aspect-square overflow-hidden transition-all ${selectedImage === idx ? 'ring-2 ring-[#4250d5] ring-offset-2' : 'opacity-70 hover:opacity-100'}`}>
                                    <img src={getImageUrl(img.path)} alt={`${product.title} ${idx + 1}`} className="h-full w-full object-cover" />
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Info */}
                <div className="space-y-5">
                    <div>
                        <div className="mb-3 flex items-center gap-2">
                            <span className="rounded-xl border border-[rgba(165,187,252,0.35)] bg-[rgba(66,80,213,0.06)] px-3 py-1 text-sm font-semibold text-[#4250d5]">{product.brand?.title || 'Brand'}</span>
                            <span className="text-xs text-[#999]">SKU: {product._id?.substring(0, 8).toUpperCase()}</span>
                        </div>
                        <h1 className="store-display mb-3 text-3xl leading-tight text-[#131313] sm:text-4xl">{product.title}</h1>
                        <div className="flex items-center gap-3">
                            <span className="text-lg text-[#ffa336]">{'★'.repeat(Math.min(5, Math.floor(product.ratings?.average || 4)))}</span>
                            <span className="text-sm font-semibold text-[#1f1f1f]">{(product.ratings?.average || 4).toFixed(1)}</span>
                            <span className="text-sm text-[#999]">({product.ratings?.count || 0} reviews)</span>
                        </div>
                    </div>

                    {/* Price panel */}
                    <div className="store-surface p-5">
                        <div className="mb-2 flex items-baseline gap-3">
                            <span className="store-display text-4xl font-bold text-[#131313]">{finalPriceLabel}</span>
                            {hasDiscount && !pricing.isRange && <span className="text-xl text-[#999] line-through">{formatCurrency(pricing.basePrice)}</span>}
                        </div>
                        {hasDiscount && (
                            <div className="flex items-center gap-2">
                                <span className="font-semibold text-[#27ae60]">You save {formatCurrency(pricing.savings)}</span>
                                <span className="text-sm text-[#666]">({Math.round(pricing.discount)}% off)</span>
                            </div>
                        )}
                        <div className="mt-3 flex items-center gap-3 text-sm">
                            <span className="flex items-center gap-1 font-medium text-[#27ae60]"><svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>In Stock</span>
                            <span className="text-[#bbb]">|</span>
                            <span className="text-[#666]">🚚 Free Shipping</span>
                        </div>
                    </div>

                    {/* Quantity */}
                    <div>
                        <p className="mb-2 text-sm font-semibold text-[#1f1f1f]">Quantity</p>
                        <div className="flex items-center gap-3">
                            <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="flex h-10 w-10 items-center justify-center rounded-xl border border-[rgba(165,187,252,0.4)] bg-[rgba(66,80,213,0.04)] font-bold text-[#4250d5] hover:bg-[rgba(66,80,213,0.1)] transition">−</button>
                            <input type="number" value={quantity} onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))} className="store-input h-10 w-20 rounded-xl text-center font-semibold" min="1" />
                            <button onClick={() => setQuantity(quantity + 1)} className="flex h-10 w-10 items-center justify-center rounded-xl border border-[rgba(165,187,252,0.4)] bg-[rgba(66,80,213,0.04)] font-bold text-[#4250d5] hover:bg-[rgba(66,80,213,0.1)] transition">+</button>
                        </div>
                    </div>

                    {/* Action buttons */}
                    <div className="space-y-3">
                        <button onClick={handleBuyNow} className="store-btn-primary tap-bounce w-full rounded-2xl py-4 text-base font-bold">Buy Now</button>
                        <button onClick={handleAddToCart} className="store-btn-secondary tap-bounce w-full rounded-2xl py-4 text-base font-bold flex items-center justify-center gap-2">
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5-5M7 13l-2.5 5M17 13v6a2 2 0 01-2 2H9a2 2 0 01-2-2v-6" /></svg>
                            Add to Cart
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
                <p className="mb-4 text-[#444] leading-relaxed">
                    {product.description || `Experience the premium quality of ${product.title}. This exceptional product from ${product.brand?.title || 'our trusted brand'} combines innovative design with superior functionality.`}
                </p>
                <h3 className="mb-3 mt-6 text-base font-semibold text-[#1f1f1f]">Key Features:</h3>
                <ul className="space-y-2 text-sm text-[#555]">
                    {['Premium quality materials and construction', 'Designed for durability and long-lasting performance', 'Elegant and modern design aesthetic', 'Perfect for everyday use', 'Backed by manufacturer warranty'].map((f) => (
                        <li key={f} className="flex items-center gap-2"><span className="text-[#4250d5]">✓</span>{f}</li>
                    ))}
                </ul>
            </div>

            {/* Specs */}
            <div className="store-surface p-7">
                <h2 className="store-display mb-5 text-xl text-[#131313]">Specifications</h2>
                <div className="grid grid-cols-1 gap-0 md:grid-cols-2">
                    {[['Brand', product.brand?.title || 'N/A'], ['Category', product.category?.title || 'N/A'], ['Condition', product.condition || 'New'], ['Availability', 'In Stock']].map(([k, v]) => (
                        <div key={k} className="flex justify-between border-b border-[rgba(165,187,252,0.2)] py-3">
                            <span className="font-medium text-[#666]">{k}</span>
                            <span className={`font-semibold ${k === 'Availability' ? 'text-[#27ae60]' : 'text-[#1f1f1f]'}`}>{v}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ProductDetailPage;
