import React, { Suspense, lazy, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/common/ProtectedRoute.jsx';
import { API_CONFIG } from './constants';
import { SiteSettingsProvider } from './context/SiteSettingsContext.jsx';
import authService from './services/authService';
import { clearLegacyRecentlyViewed } from './utils/recentlyViewed';
import { logger } from './utils/logger.js';

const HomePage = lazy(() => import('./pages/HomePage.jsx'));
const ProductDetailPage = lazy(() => import('./pages/ProductDetailPage.jsx'));
const CartPage = lazy(() => import('./pages/CartPage.jsx'));
const CheckoutPage = lazy(() => import('./pages/CheckoutPage.jsx'));
const ProductsPage = lazy(() => import('./pages/ProductsPage.jsx'));
const CategoryPage = lazy(() => import('./pages/CategoryPage.jsx'));
const WishlistPage = lazy(() => import('./pages/WishlistPage.jsx'));
const LoginPage = lazy(() => import('./pages/auth/LoginPage.jsx'));
const RegisterPage = lazy(() => import('./pages/auth/RegisterPage.jsx'));
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPasswordPage.jsx'));
const ResetPasswordPage = lazy(() => import('./pages/auth/ResetPasswordPage.jsx'));
const NotFound = lazy(() => import('./pages/NotFound.jsx'));

// User account panel
const UserLayout = lazy(() => import('./layouts/UserLayout.jsx'));
const AccountDashboard = lazy(() => import('./pages/account/AccountDashboard.jsx'));
const AccountOrders = lazy(() => import('./pages/account/AccountOrders.jsx'));
const AccountProfile = lazy(() => import('./pages/account/AccountProfile.jsx'));
const AccountAddresses = lazy(() => import('./pages/account/AccountAddresses.jsx'));
const AccountReturns = lazy(() => import('./pages/account/AccountReturns.jsx'));
const AccountWishlist = lazy(() => import('./pages/account/AccountWishlist.jsx'));
const AccountReviews = lazy(() => import('./pages/account/AccountReviews.jsx'));

const AdminLayout = lazy(() => import('./layouts/AdminLayout.jsx'));
const PublicLayout = lazy(() => import('./layouts/PublicLayout.jsx'));
const Dashboard = lazy(() => import('./pages/admin/Dashboard.jsx'));
const ProductsList = lazy(() => import('./pages/admin/products/ProductsList.jsx'));
const ProductForm = lazy(() => import('./pages/admin/products/ProductForm.jsx'));
const CategoriesList = lazy(() => import('./pages/admin/categories/CategoriesList.jsx'));
const CategoryTreeManager = lazy(() => import('./pages/admin/categories/CategoryTreeManager.jsx'));
const CategoryEditorPage = lazy(() => import('./pages/admin/categories/CategoryEditorPage.jsx'));
const UsersList = lazy(() => import('./pages/admin/users/UsersList.jsx'));
const UserForm = lazy(() => import('./pages/admin/users/UserForm.jsx'));
const BannersList = lazy(() => import('./pages/admin/banners/BannersList.jsx'));
const BannerForm = lazy(() => import('./pages/admin/banners/BannerForm.jsx'));
const BrandsList = lazy(() => import('./pages/admin/brands/BrandsList.jsx'));
const BrandForm = lazy(() => import('./pages/admin/brands/BrandForm.jsx'));
const DiscountsList = lazy(() => import('./pages/admin/discounts/DiscountsList.jsx'));
const DiscountForm = lazy(() => import('./pages/admin/discounts/DiscountForm.jsx'));
const CouponsList = lazy(() => import('./pages/admin/coupons/CouponsList.jsx'));
const CouponForm = lazy(() => import('./pages/admin/coupons/CouponForm.jsx'));
const ReviewsList = lazy(() => import('./pages/admin/reviews/ReviewsList.jsx'));
const SettingsPage = lazy(() => import('./pages/admin/settings/SettingsPage.jsx'));
const VariantTypesList = lazy(() => import('./pages/admin/variants/VariantTypesList.jsx'));
const VariantTypeForm = lazy(() => import('./pages/admin/variants/VariantTypeForm.jsx'));
const VariantTypeView = lazy(() => import('./pages/admin/variants/VariantTypeView.jsx'));
const VariantOptionsList = lazy(() => import('./pages/admin/variants/VariantOptionsList.jsx'));
const VariantOptionForm = lazy(() => import('./pages/admin/variants/VariantOptionForm.jsx'));
const OrdersList = lazy(() => import('./pages/admin/orders/OrdersList.jsx'));

const PageSkeleton = () => (
    <div className="flex min-h-screen flex-col bg-slate-50">
        <div className="h-16 w-full animate-pulse bg-white shadow-sm" />
        <div className="mx-auto mt-8 w-full max-w-6xl px-4 space-y-4">
            <div className="h-6 w-48 animate-pulse rounded bg-slate-200" />
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="h-48 animate-pulse rounded-xl bg-slate-200" />
                ))}
            </div>
        </div>
    </div>
);

function App() {
    useEffect(() => {
        clearLegacyRecentlyViewed();

        const initAuth = async () => {
            try {
                await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.AUTH}/csrf-token`, {
                    credentials: "include",
                }).catch((err) => {
                    logger.warn('CSRF token fetch failed (non-critical)', { error: err.message });
                });

                if (authService.isAuthenticated()) {
                    try {
                        await authService.getCurrentUser();
                        logger.info('Auth state verified on app mount');
                    } catch (authError) {
                        if (authError.status === 401) {
                            logger.warn('Session expired, clearing auth state');
                            authService.reset();
                        } else {
                            logger.error('Failed to verify auth, but keeping session', { 
                                error: authError.message,
                                status: authError.status 
                            });
                        }
                    }
                }
            } catch (error) {
                logger.error('Auth initialization error', { error: error.message });
            }
        };

        initAuth();
    }, []);

    return (
        <Suspense fallback={<PageSkeleton />}>
            <Routes>
            <Route element={<PublicLayout />}>
                        <Route index element={<HomePage />} />
            <Route path="/" element={<HomePage />} />

            <Route path="/products" element={<ProductsPage />} />
            <Route path="/products/:id" element={<ProductDetailPage />} />
            <Route path="/categories" element={<ProductsPage />} />
            <Route path="/cart" element={
                <ProtectedRoute>
                    <CartPage />
                </ProtectedRoute>
            } />
            <Route path="/checkout" element={
                <ProtectedRoute>
                    <CheckoutPage />
                </ProtectedRoute>
            } />
            <Route path="/categories/:slug" element={<CategoryPage />} />
            <Route path="/wishlist" element={
                <ProtectedRoute>
                    <WishlistPage />
                </ProtectedRoute>
            } />
            {/* Legacy /dashboard redirect → new user account panel */}
            <Route path="/dashboard" element={<Navigate to="/account" replace />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            </Route>

            <Route path="/admin" element={
                <ProtectedRoute requireAdmin={true}>
                    <SiteSettingsProvider>
                        <AdminLayout />
                    </SiteSettingsProvider>
                </ProtectedRoute>
            }>
                <Route index element={<Dashboard />} />
                <Route path="products" element={<ProductsList />} />
                <Route path="products/create" element={<ProductForm />} />
                <Route path="products/:id/edit" element={<ProductForm />} />
                <Route path="categories" element={<CategoriesList />} />
                <Route path="categories/tree" element={<CategoryTreeManager />} />
                <Route path="categories/create" element={<CategoryEditorPage />} />
                <Route path="categories/:id/edit" element={<CategoryEditorPage />} />
                <Route path="categories/list" element={<CategoriesList />} />
                <Route path="users" element={<UsersList />} />
                <Route path="users/create" element={<UserForm />} />
                <Route path="users/:id/edit" element={<UserForm />} />
                <Route path="banners" element={<BannersList />} />
                <Route path="banners/create" element={<BannerForm />} />
                <Route path="banners/:id/edit" element={<BannerForm />} />
                <Route path="brands" element={<BrandsList />} />
                <Route path="brands/create" element={<BrandForm />} />
                <Route path="brands/:id/edit" element={<BrandForm />} />
                <Route path="discounts" element={<DiscountsList />} />
                <Route path="discounts/create" element={<DiscountForm />} />
                <Route path="discounts/:id/edit" element={<DiscountForm />} />
                <Route path="coupons" element={<CouponsList />} />
                <Route path="coupons/create" element={<CouponForm />} />
                <Route path="coupons/:id/edit" element={<CouponForm />} />
                <Route path="variant-type" element={<VariantTypesList />} />
                <Route path="variant-type/create" element={<VariantTypeForm />} />
                <Route path="variant-type/:id" element={<VariantTypeView />} />
                <Route path="variant-type/:id/edit" element={<VariantTypeForm />} />
                <Route path="variant-option" element={<VariantOptionsList />} />
                <Route path="variant-option/create" element={<VariantOptionForm />} />
                <Route path="variant-option/:id/edit" element={<VariantOptionForm />} />
                <Route path="orders" element={<OrdersList />} />
                <Route path="reviews" element={<ReviewsList />} />
                <Route path="settings" element={<SettingsPage />} />
            </Route>

            {/* User account panel — authenticated users only */}
            <Route path="/account" element={
                <ProtectedRoute>
                    <SiteSettingsProvider>
                        <UserLayout />
                    </SiteSettingsProvider>
                </ProtectedRoute>
            }>
                <Route index element={<AccountDashboard />} />
                <Route path="orders" element={<AccountOrders />} />
                <Route path="profile" element={<AccountProfile />} />
                <Route path="addresses" element={<AccountAddresses />} />
                <Route path="returns" element={<AccountReturns />} />
                <Route path="wishlist" element={<AccountWishlist />} />
                <Route path="reviews" element={<AccountReviews />} />
            </Route>

                        <Route path="*" element={<NotFound />} />
            </Routes>
        </Suspense>
    );
}

export default App;
