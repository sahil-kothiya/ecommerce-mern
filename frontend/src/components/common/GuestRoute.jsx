import React from 'react';
import { Navigate } from 'react-router-dom';
import authService from '../../services/authService';

const GuestRoute = ({ children }) => {
    if (authService.isAuthenticated()) {
        const user = authService.getUser();
        const redirectTo = user?.role === 'admin' ? '/admin' : '/account';
        return <Navigate to={redirectTo} replace />;
    }

    return children;
};

export default GuestRoute;
