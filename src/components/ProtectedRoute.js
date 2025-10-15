import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';

const ProtectedRoute = ({ children, requiredRole = null, requireAuth = true }) => {
  const { isAuthenticated, user, loading } = useSelector((state) => state.auth);
  const location = useLocation();

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  // If authentication is required but user is not authenticated
  if (requireAuth && !isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If specific role is required but user doesn't have it
  if (requiredRole && (!user || user.userType !== requiredRole)) {
    return <Navigate to="/unauthorized" replace />;
  }

  // If user is authenticated but trying to access auth pages
  if (!requireAuth && isAuthenticated) {
    const redirectTo = location.state?.from?.pathname || 
      (user?.userType === 'seller' ? '/seller/dashboard' : '/buyer/dashboard');
    return <Navigate to={redirectTo} replace />;
  }

  return children;
};

export default ProtectedRoute;