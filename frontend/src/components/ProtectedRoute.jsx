import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const hasRole = (user, role) => {
    return user?.role === role || (user?.roles || []).includes(role);
};

export const ProtectedRoute = ({ children, requiredRole = null, requiredRoles = [] }) => {
    const { user, loading } = useAuth();

    if (loading) {
        return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>;
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    // Check if user has required role
    if (requiredRole && !hasRole(user, requiredRole)) {
        return <Navigate to="/" replace />;
    }

    // Check if user has at least one of the required roles
    if (requiredRoles.length > 0 && !requiredRoles.some(role => hasRole(user, role))) {
        return <Navigate to="/" replace />;
    }

    return children;
};

export default ProtectedRoute;
