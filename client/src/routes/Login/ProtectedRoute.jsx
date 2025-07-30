import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

// This component now accepts an optional `allowedRoles` prop
const ProtectedRoute = ({ children, allowedRoles }) => {
    const { isAuthenticated, user } = useAuth();
    const location = useLocation();

    // 1. If not authenticated, redirect to login
    if (!isAuthenticated) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // 2. If roles are specified and the user's role is not included, redirect
    //    It's better to redirect to an "Unauthorized" page or a safe default.
    if (allowedRoles && !allowedRoles.includes(user.role)) {
        // You can create a dedicated /unauthorized page for a better UX
        return <Navigate to="/" replace />; 
    }

    // 3. If authenticated and authorized, render the children
    return children;
};

export default ProtectedRoute;