import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { API_CONFIG } from '../constants';
import { formatPrice, getProductDisplayPricing } from '../utils/productUtils';
import { useSiteSettings } from '../context/SiteSettingsContext';

const CategoryPage = () => {
    const { slug } = useParams();
    const { settings } = useSiteSettings();
    const currencyCode = String(settings?.currencyCode || 'USD').toUpperCase();
    const [category, setCategory] = useState(null);
    const [products, setProducts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadCategoryData = async () => {
            try {
                setIsLoading(true);
                const categoryResponse = await fetch(
                    `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.CATEGORIES}/slug/${slug}`
                );
                const categoryData = await categoryResponse.json();
                const categoryItem = categoryData?.data;
                setCategory(categoryItem || null);

                if (categoryItem?._id) {
                    const productsResponse = await fetch(
                        `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.CATEGORIES}/${categoryItem._id}/products`
                    );
                    const productsData = await productsResponse.json();
                    setProducts(productsData?.data?.products || []);
                } else {
                    setProducts([]);
                }
            } catch {
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
            ) : products.length === 0 ? (
                <p className="mt-4 text-slate-500">No products available in this category.</p>
            ) : (
                <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {products.map((product) => {
                        const pricing = getProductDisplayPricing(product);
                        const priceLabel = pricing.isRange
                            ? `${formatPrice(pricing.minPrice, currencyCode)} - ${formatPrice(pricing.maxPrice, currencyCode)}`
                            : formatPrice(pricing.finalPrice, currencyCode);

                        return (
                            <Link
                                key={product._id}
                                to={`/products/${product.slug || product._id}`}
                                className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-cyan-300 hover:shadow-md"
                            >
                                <h2 className="line-clamp-2 text-sm font-semibold text-slate-900">{product.title}</h2>
                                <p className="mt-2 text-sm text-slate-600">{priceLabel}</p>
                            </Link>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default CategoryPage;
