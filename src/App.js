import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Provider } from 'react-redux';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useDispatch } from 'react-redux';
import store from './store/store';
import { getCurrentUser } from './store/slices/authSlice';
import { fetchPrivacySettings, fetchAppSettings } from './store/slices/settingsSlice';

// Layout
import Layout from './components/Layout/Layout';
import ProtectedRoute from './components/ProtectedRoute';

// Public Pages
import Home from './pages/Home';
import Products from './pages/Products';
import Categories from './pages/Categories';
import Sellers from './pages/Sellers';
import ProductDetails from './pages/ProductDetails';
import SellerStorefront from './pages/SellerStorefront';
import Login from './pages/auth/Login';
import SignUp from './pages/auth/SignUp';
import About from './pages/About';
import Contact from './pages/Contact';
import FAQ from './pages/FAQ';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import OrderConfirmation from './pages/OrderConfirmation';
import Wishlist from './pages/Wishlist';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';

// Buyer Pages
import BuyerDashboard from './pages/buyer/BuyerDashboard';

// Seller Pages
import SellerDashboard from './pages/seller/SellerDashboard';

// Error Pages
import NotFound from './pages/NotFound';
import Unauthorized from './pages/Unauthorized';

import './App.css';

// Create a query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// App initialization component
const AppInitializer = ({ children }) => {
  const dispatch = useDispatch();

  useEffect(() => {
    // Initialize app data
    dispatch(getCurrentUser());
    dispatch(fetchPrivacySettings());
    dispatch(fetchAppSettings());
  }, [dispatch]);

  return children;
};

function App() {
  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <Router>
          <AppInitializer>
            <Routes>
              <Route path="/" element={<Layout />}>
                {/* Public Routes */}
                <Route index element={<Home />} />
                <Route path="products" element={<Products />} />
                <Route path="categories" element={<Categories />} />
                <Route path="sellers" element={<Sellers />} />
                <Route path="product/:id" element={<ProductDetails />} />
                <Route path="seller/:sellerId" element={<SellerStorefront />} />
                <Route path="about" element={<About />} />
                <Route path="contact" element={<Contact />} />
                <Route path="faq" element={<FAQ />} />
                <Route path="cart" element={<Cart />} />
                <Route path="checkout" element={<Checkout />} />
                <Route path="order-confirmation" element={<OrderConfirmation />} />
                <Route path="wishlist" element={<Wishlist />} />
                
                {/* Auth Routes - Only accessible when not authenticated */}
                <Route 
                  path="login" 
                  element={
                    <ProtectedRoute requireAuth={false}>
                      <Login />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="signup" 
                  element={
                    <ProtectedRoute requireAuth={false}>
                      <SignUp />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="forgot-password" 
                  element={
                    <ProtectedRoute requireAuth={false}>
                      <ForgotPassword />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="reset-password" 
                  element={
                    <ProtectedRoute requireAuth={false}>
                      <ResetPassword />
                    </ProtectedRoute>
                  } 
                />

                {/* Buyer Protected Routes */}
                <Route 
                  path="buyer/dashboard/*" 
                  element={
                    <ProtectedRoute requiredRole="buyer">
                      <BuyerDashboard />
                    </ProtectedRoute>
                  } 
                />

                {/* Seller Protected Routes */}
                <Route 
                  path="seller/dashboard/*" 
                  element={
                    <ProtectedRoute requiredRole="seller">
                      <SellerDashboard />
                    </ProtectedRoute>
                  } 
                />

                {/* Error Routes */}
                <Route path="unauthorized" element={<Unauthorized />} />
                <Route path="*" element={<NotFound />} />
              </Route>
            </Routes>
          </AppInitializer>
        </Router>
      </QueryClientProvider>
    </Provider>
  );
}

export default App;
