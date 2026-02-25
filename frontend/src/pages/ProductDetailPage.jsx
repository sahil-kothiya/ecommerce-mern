import { logger } from '../utils/logger.js';
import React, { useState, useEffect, useMemo } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { getRandomProductImage } from '../services/imageService';
import { resolveImageUrl } from '../utils/imageUrl';
import { formatPrice, getProductDisplayPricing } from '../utils/productUtils';
import { API_CONFIG, PRODUCT_CONDITIONS, CURRENCY_CONFIG } from '../constants';
import authService from '../services/authService';
import notify from '../utils/notify';

// ============================================================================
// HELPERS
// ============================================================================

const fmt = (price) => formatPrice(price || 0, CURRENCY_CONFIG.DEFAULT, CURRENCY_CONFIG.LOCALE);

// ============================================================================
// VARIANT SELECTION LOGIC
// ============================================================================

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

// ============================================================================
// VARIANT UI SUB-COMPONENTS
// ============================================================================

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
    const navigate = useNavigate();

    const [product, setProduct] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedImage, setSelectedImage] = useState(0);
    const [quantity, setQuantity] = useState(1);
    // { [typeId]: optionId }
    const [selectedOpts, setSelectedOpts] = useState({});

    useEffect(() => { loadProductDetail(); }, [id]);

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
        } catch (error) {
            logger.error('Error loading product:', error);
            setProduct(null);
        } finally { setIsLoading(false); }
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

            {/* Specifications */}
            <div className="store-surface p-7">
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
        </div>
    );
};

export default ProductDetailPage;
