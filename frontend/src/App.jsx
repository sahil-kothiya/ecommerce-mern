import { Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage.jsx';
import ProductDetailPage from './pages/ProductDetailPage.jsx';
import CartPage from './pages/CartPage.jsx';
import CheckoutPage from './pages/CheckoutPage.jsx';
import ProductsPage from './pages/ProductsPage.jsx';
import CategoryPage from './pages/CategoryPage.jsx';
import WishlistPage from './pages/WishlistPage.jsx';
import LoginPage from './pages/auth/LoginPage.jsx';
import RegisterPage from './pages/auth/RegisterPage.jsx';
import UserDashboard from './pages/UserDashboard.jsx';
import NotFound from './pages/NotFound.jsx';
import ProtectedRoute from './components/common/ProtectedRoute.jsx';

// Admin imports
import AdminLayout from './layouts/AdminLayout.jsx';
import Dashboard from './pages/admin/Dashboard.jsx';
import ProductsList from './pages/admin/products/ProductsList.jsx';
import ProductForm from './pages/admin/products/ProductForm.jsx';
import CategoriesList from './pages/admin/categories/CategoriesList.jsx';
import CategoryTreeManager from './pages/admin/categories/CategoryTreeManager.jsx';
import CategoryEditorPage from './pages/admin/categories/CategoryEditorPage.jsx';
import UsersList from './pages/admin/users/UsersList.jsx';
import UserForm from './pages/admin/users/UserForm.jsx';
import BannersList from './pages/admin/banners/BannersList.jsx';
import BannerForm from './pages/admin/banners/BannerForm.jsx';
import BrandsList from './pages/admin/brands/BrandsList.jsx';
import BrandForm from './pages/admin/brands/BrandForm.jsx';
import DiscountsList from './pages/admin/discounts/DiscountsList.jsx';
import DiscountForm from './pages/admin/discounts/DiscountForm.jsx';
import CouponsList from './pages/admin/coupons/CouponsList.jsx';
import CouponForm from './pages/admin/coupons/CouponForm.jsx';
import ReviewsList from './pages/admin/reviews/ReviewsList.jsx';
import SettingsPage from './pages/admin/settings/SettingsPage.jsx';
import VariantTypesList from './pages/admin/variants/VariantTypesList.jsx';
import VariantTypeForm from './pages/admin/variants/VariantTypeForm.jsx';
import VariantOptionsList from './pages/admin/variants/VariantOptionsList.jsx';
import VariantOptionForm from './pages/admin/variants/VariantOptionForm.jsx';
import OrdersList from './pages/admin/orders/OrdersList.jsx';

function App() {
    return (
        <Routes>
            {/* Homepage with professional e-commerce design */}
            <Route index element={<HomePage />} />
            <Route path="/" element={<HomePage />} />

            <Route path="/products" element={<ProductsPage />} />
            <Route path="/products/:id" element={<ProductDetailPage />} />
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
            <Route path="/account" element={
                <ProtectedRoute>
                    <UserDashboard />
                </ProtectedRoute>
            } />
            <Route path="/dashboard" element={
                <ProtectedRoute>
                    <UserDashboard />
                </ProtectedRoute>
            } />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* Admin Routes - Protected */}
            <Route path="/admin" element={
                <ProtectedRoute requireAdmin={true}>
                    <AdminLayout />
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
                <Route path="variant-type/:id/edit" element={<VariantTypeForm />} />
                <Route path="variant-option" element={<VariantOptionsList />} />
                <Route path="variant-option/create" element={<VariantOptionForm />} />
                <Route path="variant-option/:id/edit" element={<VariantOptionForm />} />
                <Route path="orders" element={<OrdersList />} />
                <Route path="reviews" element={<ReviewsList />} />
                <Route path="settings" element={<SettingsPage />} />
            </Route>

            {/* 404 */}
            <Route path="*" element={<NotFound />} />
        </Routes>
    );
}

export default App;
