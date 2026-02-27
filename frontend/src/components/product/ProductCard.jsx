import { memo } from 'react';
import { Link } from 'react-router-dom';
import LazyImage from '../common/LazyImage';
import { formatPrice, getProductDisplayPricing } from '../../utils/productUtils';

// Variant products: redirect to PDP on click. Non-variant: add directly to cart.
// Always shows "Add to Cart", never variant selectors on card.
const ProductCard = ({ 
    product, 
    currentImage, 
    isHovered, 
    inWishlist, 
    onHover, 
    onLeave, 
    onAddToCart, 
    onWishlistToggle, 
    onImageError,
    formatCurrency, 
    currencyCode = 'USD',
    animDelay = 0 
}) => {
    if (!product) return null;

    const defaultFormatter = (price) => formatPrice(price || 0, currencyCode);
    const priceFormatter = formatCurrency || defaultFormatter;

    const activeVariants = Array.isArray(product?.variants)
        ? product.variants.filter(v => !v.status || v.status === 'active')
        : [];
    const hasVariants = product?.hasVariants === true && activeVariants.length > 0;

    const pricing = getProductDisplayPricing(product);
    const hasDiscount = pricing.hasDiscount;
    const showFromLabel = pricing.isRange && hasVariants;
    const isOutOfStock = hasVariants 
        ? activeVariants.every(v => (v.stock || 0) <= 0)
        : (product.baseStock || 0) <= 0;

    const PRODUCT_CONDITIONS = {
        HOT: 'hot',
        NEW: 'new',
        DEFAULT: 'default'
    };

    return (
        <Link 
            to={`/products/${product._id}`} 
            style={{ animationDelay: `${animDelay}ms` }} 
            className="store-product-card animate-fade-up group flex flex-col overflow-hidden bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-lg hover:border-cyan-300 transition-all duration-300"
            onMouseEnter={() => onHover(product)} 
            onMouseLeave={() => onLeave(product)}
        >
            <div className="relative overflow-hidden bg-gradient-to-br from-slate-50 to-blue-50">
                <LazyImage
                    src={currentImage}
                    alt={product.title}
                    wrapperClassName="h-56 w-full"
                    className="h-56 w-full object-cover transition-transform duration-500 group-hover:scale-110"
                    onImageError={onImageError}
                    fallback={
                        <div className="flex h-56 w-full items-center justify-center bg-gradient-to-br from-slate-100 to-blue-100">
                            <svg className="h-10 w-10 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                        </div>
                    }
                />
                
                {product.condition && (
                    <span className="absolute left-3 top-3 rounded-full bg-gradient-to-r from-[#4250d5] to-[#f9730c] px-2.5 py-1 text-[10px] font-bold text-white shadow-md z-10">
                        {product.condition === PRODUCT_CONDITIONS.HOT && '🔥 Hot'}
                        {product.condition === PRODUCT_CONDITIONS.NEW && '✨ New'}
                        {product.condition === PRODUCT_CONDITIONS.DEFAULT && '⭐ Trending'}
                    </span>
                )}
                
                <div className="absolute right-3 top-3 z-10 flex items-center gap-2">
                    {hasDiscount && (
                        <span className="rounded-full border border-orange-300 bg-orange-500 px-2.5 py-1 text-[10px] font-bold text-white shadow-md">
                            {Math.round(pricing.discount)}% OFF
                        </span>
                    )}

                    <button
                        type="button"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onWishlistToggle(product);
                        }}
                        className={`flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all ${
                            inWishlist
                                ? 'border-rose-400 bg-rose-100 text-rose-600 shadow-md'
                                : 'border-white bg-white/90 text-slate-600 hover:border-rose-400 hover:bg-rose-50 hover:text-rose-500'
                        } ${isHovered ? 'scale-110' : ''}`}
                        aria-label={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
                    >
                        {inWishlist ? (
                            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5A5.5 5.5 0 017.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3A5.5 5.5 0 0122 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                            </svg>
                        ) : (
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                            </svg>
                        )}
                    </button>
                </div>
            </div>
            
            <div className="flex flex-1 flex-col gap-2 p-4">
                <div className="flex items-center justify-between gap-2">
                    <span className="rounded-lg border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700 truncate">
                        {product.brand?.title || 'Brand'}
                    </span>
                    {product.ratings?.count > 0 && (
                        <div className="flex items-center gap-1 flex-shrink-0">
                            <span className="text-[11px] text-amber-500">
                                {'★'.repeat(Math.min(5, Math.floor(product.ratings?.average || 0)))}
                            </span>
                            <span className="text-[10px] text-slate-500">
                                ({product.ratings.count})
                            </span>
                        </div>
                    )}
                </div>
                
                <h3 className="line-clamp-2 min-h-[2.5rem] text-sm font-semibold leading-tight text-slate-900 transition-colors group-hover:text-blue-600">
                    {product.title}
                </h3>
                
                <div className="mt-auto space-y-2.5 pt-1">
                    <div className="flex items-baseline gap-2">
                        <div className="flex items-baseline gap-1.5">
                            {showFromLabel && (
                                <span className="text-xs font-medium text-slate-600">From</span>
                            )}
                            <span className="text-base font-bold text-slate-900">
                                {priceFormatter(pricing.finalPrice)}
                            </span>
                        </div>
                        {hasDiscount && !pricing.isRange && (
                            <span className="text-xs text-slate-400 line-through">
                                {priceFormatter(pricing.basePrice)}
                            </span>
                        )}
                    </div>
                    
                    <button 
                        type="button" 
                        onClick={(e) => { 
                            e.preventDefault(); 
                            e.stopPropagation(); 
                            onAddToCart(product); 
                        }}
                        disabled={isOutOfStock}
                        className={`w-full rounded-lg py-2.5 px-4 text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                            isOutOfStock
                                ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                                : 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white hover:from-blue-700 hover:to-cyan-700 active:scale-95 shadow-md hover:shadow-lg'
                        }`}
                        aria-label={isOutOfStock ? 'Out of stock' : 'Add to cart'}
                    >
                        {isOutOfStock ? (
                            <>
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                </svg>
                                Out of Stock
                            </>
                        ) : (
                            <>
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m1.6 8L5.4 5M7 13l-1.5 7h13M9 20a1 1 0 100-2 1 1 0 000 2zm8 0a1 1 0 100-2 1 1 0 000 2z" />
                                </svg>
                                Add to Cart
                            </>
                        )}
                    </button>
                </div>
            </div>
        </Link>
    );
};

export default memo(ProductCard);
