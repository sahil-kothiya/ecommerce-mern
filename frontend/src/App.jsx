import { Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage.jsx';
import ProductDetailPage from './pages/ProductDetailPage.jsx';
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
import BannersList from './pages/admin/banners/BannersList.jsx';
import BannerForm from './pages/admin/banners/BannerForm.jsx';
import BrandsList from './pages/admin/brands/BrandsList.jsx';
import BrandForm from './pages/admin/brands/BrandForm.jsx';

function App() {
    return (
        <Routes>
            {/* Homepage with professional e-commerce design */}
            <Route index element={<HomePage />} />
            <Route path="/" element={<HomePage />} />

            {/* Placeholder routes for future development */}
            <Route path="/products" element={<div>Products Page (Coming Soon)</div>} />
            <Route path="/products/:id" element={<ProductDetailPage />} />
            <Route path="/cart" element={<div>Cart Page (Coming Soon)</div>} />
            <Route path="/checkout" element={<div>Checkout Page (Coming Soon)</div>} />
            <Route path="/categories/:slug" element={<div>Category Page (Coming Soon)</div>} />
            <Route path="/wishlist" element={<div>Wishlist Page (Coming Soon)</div>} />
            <Route path="/account" element={<div>Account Page (Coming Soon)</div>} />
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
                <Route path="banners" element={<BannersList />} />
                <Route path="banners/create" element={<BannerForm />} />
                <Route path="banners/:id/edit" element={<BannerForm />} />
                <Route path="brands" element={<BrandsList />} />
                <Route path="brands/create" element={<BrandForm />} />
                <Route path="brands/:id/edit" element={<BrandForm />} />
                <Route path="orders" element={<div className="p-6"><h1 className="text-3xl font-bold">Orders Management (Coming Soon)</h1></div>} />
                <Route path="reviews" element={<div className="p-6"><h1 className="text-3xl font-bold">Reviews Management (Coming Soon)</h1></div>} />
                <Route path="settings" element={<div className="p-6"><h1 className="text-3xl font-bold">Settings (Coming Soon)</h1></div>} />
            </Route>

            {/* 404 */}
            <Route path="*" element={<NotFound />} />
        </Routes>
    );
}

export default App;
