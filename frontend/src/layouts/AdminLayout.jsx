/**
 * AdminLayout Component
 * 
 * Main layout wrapper for the admin dashboard that provides:
 * - Fixed top navigation bar with branding and user info
 * - Collapsible sidebar navigation
 * - Main content area with nested routing
 * - Logout functionality
 * 
 * @component
 * @returns {JSX.Element} Admin layout with header, sidebar, and content area
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import authService from '../services/authService';

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Navigation menu items configuration
 * @constant {Array<Object>}
 */
const MENU_ITEMS = [
    { path: '/admin', icon: '📊', label: 'Dashboard', exact: true },
    { path: '/admin/products', icon: '📦', label: 'Products' },
    { path: '/admin/categories', icon: '📂', label: 'Categories' },
    { path: '/admin/users', icon: '👥', label: 'Users' },
    { path: '/admin/orders', icon: '🛍️', label: 'Orders' },
    { path: '/admin/banners', icon: '🖼️', label: 'Banners' },
    { path: '/admin/brands', icon: '🏷️', label: 'Brands' },
    { path: '/admin/reviews', icon: '⭐', label: 'Reviews' },
    { path: '/admin/settings', icon: '⚙️', label: 'Settings' },
];

/**
 * UI Configuration Constants
 */
const UI_CONFIG = {
    SIDEBAR_WIDTH: 'w-64',
    SIDEBAR_COLLAPSED_WIDTH: 'w-0',
    HEADER_HEIGHT: 'top-16',
    BRAND_NAME: 'E-Shop Pro',
};

// ============================================================================
// COMPONENT
// ============================================================================

const AdminLayout = () => {
    // ------------------------------------------------------------------------
    // Hooks
    // ------------------------------------------------------------------------
    const location = useLocation();
    const navigate = useNavigate();

    // ------------------------------------------------------------------------
    // State Management
    // ------------------------------------------------------------------------
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [currentUser, setCurrentUser] = useState(null);
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    // ------------------------------------------------------------------------
    // Effects
    // ------------------------------------------------------------------------

    /**
     * Initialize user data on component mount
     * Retrieves authenticated user information from localStorage
     */
    useEffect(() => {
        try {
            const user = authService.getUser();
            
            if (user) {
                setCurrentUser(user);
            } else {
                // Redirect to login if no user found
                console.warn('No authenticated user found');
                navigate('/login', { replace: true });
            }
        } catch (error) {
            console.error('Error loading user data:', error);
            navigate('/login', { replace: true });
        }
    }, [navigate]);

    // ------------------------------------------------------------------------
    // Memoized Values
    // ------------------------------------------------------------------------

    /**
     * Get user's initials for avatar display
     * Extracts first letter of user's name, fallback to 'A'
     */
    const userInitial = useMemo(() => {
        return currentUser?.name?.charAt(0)?.toUpperCase() || 'A';
    }, [currentUser]);

    /**
     * Get user display name with fallback
     */
    const userName = useMemo(() => {
        return currentUser?.name || 'Admin User';
    }, [currentUser]);

    /**
     * Get user email with fallback
     */
    const userEmail = useMemo(() => {
        return currentUser?.email || 'Loading...';
    }, [currentUser]);

    // ------------------------------------------------------------------------
    // Event Handlers
    // ------------------------------------------------------------------------

    /**
     * Toggle sidebar visibility
     * @callback
     */
    const toggleSidebar = useCallback(() => {
        setIsSidebarOpen(prev => !prev);
    }, []);

    /**
     * Check if a route is currently active
     * 
     * @param {string} path - Route path to check
     * @param {boolean} exact - Whether to use exact path matching
     * @returns {boolean} True if route is active
     */
    const isActive = useCallback((path, exact = false) => {
        if (exact) {
            return location.pathname === path;
        }
        return location.pathname.startsWith(path);
    }, [location.pathname]);

    /**
     * Handle user logout
     * Clears authentication data and redirects to login page
     * 
     * @async
     * @throws {Error} If logout fails
     */
    const handleLogout = useCallback(async () => {
        // Prevent multiple logout attempts
        if (isLoggingOut) return;

        setIsLoggingOut(true);

        try {
            // Call logout service
            await authService.logout();

            // Clear local user state
            setCurrentUser(null);

            // Redirect to login with replace to prevent back navigation
            navigate('/login', { replace: true });
        } catch (error) {
            console.error('Logout failed:', error);

            // Even if backend logout fails, clear local state and redirect
            // This ensures user cannot access protected routes
            setCurrentUser(null);
            navigate('/login', { replace: true });
        } finally {
            setIsLoggingOut(false);
        }
    }, [navigate, isLoggingOut]);

    // ------------------------------------------------------------------------
    // Render
    // ------------------------------------------------------------------------

    return (
        <div className="min-h-screen bg-gray-100">
            {/* ============================================================ */}
            {/* TOP NAVIGATION BAR                                           */}
            {/* ============================================================ */}
            <header className="bg-white border-b border-gray-200 fixed top-0 left-0 right-0 z-30">
                <div className="flex items-center justify-between px-4 py-3">
                    {/* Left Section: Menu Toggle + Brand */}
                    <div className="flex items-center gap-4">
                        {/* Sidebar Toggle Button */}
                        <button
                            onClick={toggleSidebar}
                            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                            aria-label="Toggle sidebar"
                            aria-expanded={isSidebarOpen}
                        >
                            <svg 
                                className="w-6 h-6 text-gray-600" 
                                fill="none" 
                                stroke="currentColor" 
                                viewBox="0 0 24 24"
                                aria-hidden="true"
                            >
                                <path 
                                    strokeLinecap="round" 
                                    strokeLinejoin="round" 
                                    strokeWidth={2} 
                                    d="M4 6h16M4 12h16M4 18h16" 
                                />
                            </svg>
                        </button>

                        {/* Brand Logo/Name */}
                        <Link 
                            to="/" 
                            className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"
                            aria-label="Go to homepage"
                        >
                            {UI_CONFIG.BRAND_NAME}
                        </Link>

                        {/* Admin Badge */}
                        <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
                            Admin
                        </span>
                    </div>

                    {/* Right Section: Actions + User Profile */}
                    <div className="flex items-center gap-4">
                        {/* Notification Bell */}
                        <button 
                            className="relative p-2 text-gray-600 hover:text-blue-600 transition-colors"
                            aria-label="View notifications"
                        >
                            <svg 
                                className="w-6 h-6" 
                                fill="none" 
                                stroke="currentColor" 
                                viewBox="0 0 24 24"
                                aria-hidden="true"
                            >
                                <path 
                                    strokeLinecap="round" 
                                    strokeLinejoin="round" 
                                    strokeWidth={2} 
                                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" 
                                />
                            </svg>
                            {/* Notification Indicator */}
                            <span 
                                className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"
                                aria-label="You have unread notifications"
                            ></span>
                        </button>

                        {/* View Site Link */}
                        <Link 
                            to="/" 
                            className="px-4 py-2 text-sm text-gray-600 hover:text-blue-600 transition-colors"
                            aria-label="View public website"
                        >
                            View Site
                        </Link>

                        {/* User Profile Section */}
                        <div className="flex items-center gap-3 pl-4 border-l border-gray-200">
                            {/* User Avatar */}
                            <div 
                                className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold"
                                aria-label={`Avatar for ${userName}`}
                            >
                                {userInitial}
                            </div>

                            {/* User Info */}
                            <div>
                                <div className="text-sm font-semibold text-gray-900">
                                    {userName}
                                </div>
                                <div className="text-xs text-gray-500">
                                    {userEmail}
                                </div>
                            </div>

                            {/* Logout Button */}
                            <button
                                onClick={handleLogout}
                                disabled={isLoggingOut}
                                className="p-2 text-gray-600 hover:text-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Logout"
                                aria-label="Logout from admin panel"
                            >
                                <svg 
                                    className="w-5 h-5" 
                                    fill="none" 
                                    stroke="currentColor" 
                                    viewBox="0 0 24 24"
                                    aria-hidden="true"
                                >
                                    <path 
                                        strokeLinecap="round" 
                                        strokeLinejoin="round" 
                                        strokeWidth={2} 
                                        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" 
                                    />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* ============================================================ */}
            {/* MAIN CONTENT AREA                                            */}
            {/* ============================================================ */}
            <div className="flex pt-16">
                {/* ========================================================== */}
                {/* SIDEBAR NAVIGATION                                         */}
                {/* ========================================================== */}
                <aside
                    className={`fixed left-0 top-16 h-[calc(100vh-4rem)] bg-white border-r border-gray-200 transition-all duration-300 z-20 ${
                        isSidebarOpen ? UI_CONFIG.SIDEBAR_WIDTH : UI_CONFIG.SIDEBAR_COLLAPSED_WIDTH
                    } overflow-hidden`}
                    aria-label="Main navigation"
                    aria-hidden={!isSidebarOpen}
                >
                    <nav className="p-4 space-y-1" role="navigation">
                        {MENU_ITEMS.map((item) => {
                            const isCurrentlyActive = isActive(item.path, item.exact);
                            
                            return (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                                        isCurrentlyActive
                                            ? 'bg-blue-50 text-blue-700 font-semibold'
                                            : 'text-gray-700 hover:bg-gray-50'
                                    }`}
                                    aria-current={isCurrentlyActive ? 'page' : undefined}
                                >
                                    <span className="text-xl" aria-hidden="true">{item.icon}</span>
                                    <span>{item.label}</span>
                                </Link>
                            );
                        })}
                    </nav>
                </aside>

                {/* ========================================================== */}
                {/* MAIN CONTENT                                               */}
                {/* ========================================================== */}
                <main 
                    className={`flex-1 transition-all duration-300 ${
                        isSidebarOpen ? 'ml-64' : 'ml-0'
                    }`}
                    role="main"
                >
                    <div className="p-6">
                        {/* Nested Routes Rendered Here */}
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
};

// ============================================================================
// DISPLAY NAME (for React DevTools)
// ============================================================================
AdminLayout.displayName = 'AdminLayout';

// ============================================================================
// EXPORTS
// ============================================================================
export default AdminLayout;
