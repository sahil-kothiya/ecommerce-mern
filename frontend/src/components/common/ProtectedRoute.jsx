import React, { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import authService from '../../services/authService';

const PageLoader = () => (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600"></div>
            <p className="text-sm text-slate-600">Verifying authentication...</p>
        </div>
    </div>
);

const ProtectedRoute = ({ children, requireAdmin = false }) => {
    const location = useLocation();
    const [isAuthChecking, setIsAuthChecking] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        const checkAuth = async () => {
            try {
                if (!authService.isAuthenticated()) {
                    setIsAuthenticated(false);
                    setIsAuthChecking(false);
                    return;
                }

                await authService.getCurrentUser();
                const user = authService.getUser();
                
                setIsAuthenticated(!!user);
                setIsAdmin(user?.role === 'admin');
            } catch (error) {
                setIsAuthenticated(false);
                setIsAdmin(false);
            } finally {
                setIsAuthChecking(false);
            }
        };

        checkAuth();
    }, []);

    if (isAuthChecking) {
        return <PageLoader />;
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (requireAdmin && !isAdmin) {
        return <Navigate to="/account" replace />;
    }

    return children;
};

export default ProtectedRoute;
