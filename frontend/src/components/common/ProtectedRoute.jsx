import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import authService from '../../services/authService';

const ProtectedRoute = ({ children, requireAdmin = false }) => {
    const location = useLocation();

    if (!authService.isAuthenticated()) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Non-admin trying to access admin-only routes → send to their account panel
    if (requireAdmin && !authService.isAdmin()) {
        return <Navigate to="/account" replace />;
    }

    return children;
};

export default ProtectedRoute;
