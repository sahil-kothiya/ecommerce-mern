import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import authService from '../../services/authService';

const ProtectedRoute = ({ children, requireAdmin = false }) => {
    const location = useLocation();

    if (!authService.isAuthenticated()) {
        // Redirect to login if not authenticated
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (requireAdmin && !authService.isAdmin()) {
        // Redirect to home if admin access is required but user is not admin
        return <Navigate to="/" replace />;
    }

    return children;
};

export default ProtectedRoute;
