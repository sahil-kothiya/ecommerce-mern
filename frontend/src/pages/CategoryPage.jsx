import { Link, useParams } from 'react-router-dom';
import { useCategoryBySlug, useProducts } from '@/hooks/queries';
import { formatPrice, getProductDisplayPricing } from '@/utils/productUtils';
import { useSiteSettings } from '@/context/useSiteSettings';

const CategoryPage = () => {
    const { slug } = useParams();
    const { settings } = useSiteSettings();
    const currencyCode = String(settings?.currencyCode || 'USD').toUpperCase();

    const { data: category, isLoading: isLoadingCategory, error: categoryError } = useCategoryBySlug(slug);

    const { data: productsData, isLoading: isLoadingProducts } = useProducts({
        category: slug,
        status: 'active',
        limit: 100,
    });

    const isLoading = isLoadingCategory || isLoadingProducts;
    const products = Array.isArray(productsData?.products) ? productsData.products : [];

    return (
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <h1 className="text-2xl font-bold text-slate-900">
                {category?.title || 'Category'}
            </h1>

            {isLoading ? (
                <p className="mt-4 text-slate-500">Loading category...</p>
            ) : categoryError ? (
                <p className="mt-4 text-red-600">{categoryError.message || 'Failed to load category'}</p>
            ) : products.length === 0 ? (
                <p className="mt-4 text-slate-500">No products available in this category.</p>
            ) : (
                <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {products.map((product) => {
                        const pricing = getProductDisplayPricing(product);
                        const showFromLabel = pricing.isRange;
                        const priceLabel = pricing.isRange
                            ? formatPrice(pricing.minPrice, currencyCode)
                            : formatPrice(pricing.finalPrice, currencyCode);

                        return (
                            <Link
                                key={product._id}
                                to={`/products/${product.slug || product._id}`}
                                className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-primary-300 hover:shadow-md"
                            >
                                <h2 className="line-clamp-2 text-sm font-semibold text-slate-900">{product.title}</h2>
                                <p className="mt-2 text-sm text-slate-600">
                                    {showFromLabel && <span className="text-xs text-slate-500 mr-1">From</span>}
                                    {priceLabel}
                                </p>
                            </Link>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default CategoryPage;
