import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { checkAuthStatus } from '../store/slices/authSlice';

const AuthCheck = ({ children }) => {
  const dispatch = useDispatch();
  const { loading, token } = useSelector((state) => state.auth);

  useEffect(() => {
    // Check authentication status on app startup if token exists
    if (token) {
      dispatch(checkAuthStatus());
    }
  }, [dispatch, token]);

  // Show loading spinner while checking authentication
  if (loading && token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-600 mx-auto"></div>
          <h2 className="mt-4 text-lg font-medium text-gray-900">Loading...</h2>
          <p className="mt-2 text-sm text-gray-500">Verifying your authentication</p>
        </div>
      </div>
    );
  }

  return children;
};

export default AuthCheck;