import { Link, useNavigate } from 'react-router-dom';
import { formatPrice, getProductDisplayPricing } from '@/utils/productUtils';
import { getPrimaryProductImage, resolveImageUrl } from '@/utils/imageUrl';
import { useSiteSettings } from '@/context/useSiteSettings';
import { useWishlist, useRemoveFromWishlist } from '@/hooks/queries';
import apiClient from '@/services/apiClient';
import { API_CONFIG } from '@/constants';
import notify from '@/utils/notify';
import { useQueryClient } from '@tanstack/react-query';
import { WISHLIST_KEYS } from '@/hooks/queries/useWishlist';

const WishlistPage = () => {
    const navigate = useNavigate();
    const { settings } = useSiteSettings();
    const qc = useQueryClient();
    const currencyCode = String(settings?.currencyCode || 'USD').toUpperCase();

    const { data: wishlistData, isLoading } = useWishlist();
    const items = wishlistData?.items || [];

    const { mutate: removeFromWishlist, isPending: isRemoving } = useRemoveFromWishlist();

    const removeItem = (id) => removeFromWishlist(id);

    const moveToCart = async (item) => {
        const product = item.productId;
        if (!product) return;

        const activeVariants = Array.isArray(product?.variants)
            ? product.variants.filter(v => !v.status || v.status === 'active')
            : [];
        const hasVariants = product?.hasVariants === true && activeVariants.length > 0;

        if (hasVariants) {
            notify.info('Redirecting to select your options...');
            navigate(`/products/${product.slug || product._id}`);
            return;
        }

        try {
            await apiClient.post(`${API_CONFIG.ENDPOINTS.WISHLIST}/${item._id}/move-to-cart`);
            notify.success('Item moved to cart!');
            qc.invalidateQueries({ queryKey: WISHLIST_KEYS.wishlist });
        } catch (err) {
            notify.error(err.message || 'Failed to move to cart');
        }
    };

    return (
        <div className="mx-auto max-w-5xl px-4 pb-16 sm:px-6 lg:px-8">
            <div className="mb-8">
                <p className="store-eyebrow mb-1">My Account</p>
                <h1 className="store-display text-2xl text-slate-900 sm:text-3xl">
                    My Wishlist <span className="text-base font-normal text-slate-500">({items.length} items)</span>
                </h1>
            </div>

            {isLoading ? (
                <div className="flex min-h-[300px] items-center justify-center">
                    <div className="store-surface p-10 text-center">
                        <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-[3px] border-primary-200 border-t-secondary-500" />
                        <p className="store-display text-base text-primary-800">Loading wishlist...</p>
                    </div>
                </div>
            ) : items.length === 0 ? (
                <div className="store-surface py-16 text-center">
                    <div className="mb-3 text-5xl">💝</div>
                    <h2 className="store-display mb-2 text-xl text-primary-800">Your wishlist is empty</h2>
                    <p className="mb-6 text-sm text-slate-500">Save items you love and shop them later.</p>
                    <Link to="/" className="store-btn-primary tap-bounce inline-block rounded-2xl px-8 py-3 text-sm font-bold">Browse Products</Link>
                </div>
            ) : (
                <div className="space-y-3">
                    {items.map((item) => {
                        const product = item.productId;
                        if (!product) return null;
                        const pricing = getProductDisplayPricing(product);
                        const imgUrl = resolveImageUrl(getPrimaryProductImage(product));

                        const showFromLabel = pricing.isRange;
                        const priceLabel = pricing.isRange
                            ? formatPrice(pricing.minPrice, currencyCode)
                            : formatPrice(pricing.finalPrice, currencyCode);
                        return (
                            <div key={item._id} className="store-surface p-4">
                                <div className="flex items-center gap-4">
                                    <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-slate-50 to-primary-50">
                                        <img src={imgUrl} alt={product.title} loading="lazy" decoding="async" className="h-full w-full object-cover" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <Link to={`/products/${product.slug || product._id}`} className="font-semibold text-slate-800 hover:text-primary-700 line-clamp-1 transition">{product.title}</Link>
                                        <p className="mt-1 text-sm font-bold text-primary-600">
                                            {showFromLabel && <span className="text-xs font-medium text-slate-500 mr-1">From</span>}
                                            {priceLabel}
                                        </p>
                                        {product.brand?.title && <p className="text-xs text-slate-400">{product.brand.title}</p>}
                                    </div>
                                    <div className="flex flex-shrink-0 flex-col sm:flex-row items-center gap-2">
                                        <button onClick={() => moveToCart(item)} disabled={isRemoving}
                                            className="store-btn-primary tap-bounce rounded-xl px-4 py-2 text-xs font-bold disabled:opacity-40 whitespace-nowrap">
                                            {product.hasVariants ? 'Select Options' : 'Move to Cart'}
                                        </button>
                                        <button onClick={() => removeItem(item._id)} disabled={isRemoving}
                                            className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-100 disabled:opacity-40 transition">
                                            Remove
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default WishlistPage;
