import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { API_CONFIG } from '../constants';
import apiClient from '../services/apiClient';
import { formatPrice, getProductDisplayPricing } from '../utils/productUtils';
import { useSiteSettings } from '../context/useSiteSettings';
import notify from '../utils/notify';

const CategoryPage = () => {
    const { slug } = useParams();
    const { settings } = useSiteSettings();
    const currencyCode = String(settings?.currencyCode || 'USD').toUpperCase();
    const [category, setCategory] = useState(null);
    const [products, setProducts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const loadCategoryData = async () => {
            try {
                setIsLoading(true);
                setError(null);
                const categoryData = await apiClient.get(
                    `${API_CONFIG.ENDPOINTS.CATEGORIES}/slug/${slug}`
                );
                const categoryItem = categoryData?.data;
                setCategory(categoryItem || null);

                if (categoryItem?._id) {
                    const productsData = await apiClient.get(
                        `${API_CONFIG.ENDPOINTS.CATEGORIES}/${categoryItem._id}/products`
                    );
                    setProducts(productsData?.data?.products || []);
                } else {
                    setProducts([]);
                }
            } catch (err) {
                setError(err?.message || 'Failed to load category');
                notify.error(err?.message || 'Failed to load category');
                setCategory(null);
                setProducts([]);
            } finally {
                setIsLoading(false);
            }
        };

        loadCategoryData();
    }, [slug]);

    return (
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <h1 className="text-2xl font-bold text-slate-900">
                {category?.title || 'Category'}
            </h1>

            {isLoading ? (
                <p className="mt-4 text-slate-500">Loading category...</p>
            ) : error ? (
                <p className="mt-4 text-red-600">{error}</p>
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
