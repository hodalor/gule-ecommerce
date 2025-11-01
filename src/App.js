import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { store } from './store';
import { checkAuthStatus } from './store/slices/authSlice';
import { Toaster } from 'react-hot-toast';

// Layout Components
import AdminLayout from './components/Layout/AdminLayout';

// Auth Components
import Login from './pages/Auth/Login';

// Admin Pages
import Dashboard from './pages/Dashboard/Dashboard';
import AdminManagement from './pages/AdminManagement/AdminManagement';
import OrderManagement from './pages/OrderManagement/OrderManagement';
import UserManagement from './pages/UserManagement/UserManagement';
import ProductManagement from './pages/ProductManagement/ProductManagement';
import SellerManagement from './pages/SellerManagement/SellerManagement';
import ReviewManagement from './pages/ReviewManagement/ReviewManagement';
import CategoryManagement from './pages/CategoryManagement/CategoryManagement';
import EscrowManagement from './pages/EscrowManagement/EscrowManagement';
import DisputeManagement from './pages/DisputeManagement/DisputeManagement';
import ComplaintsManagement from './pages/ComplaintsManagement/ComplaintsManagement';
import RefundsManagement from './pages/RefundsManagement/RefundsManagement';
import InventoryManagement from './pages/InventoryManagement/InventoryManagement';
import StorePerformance from './pages/StorePerformance/StorePerformance';
import PrivacySettings from './pages/PrivacySettings/PrivacySettings';
import FinancePanel from './pages/FinancePanel/FinancePanel';
import AuditLogs from './pages/AuditLogs/AuditLogs';
import ServerLogs from './components/ServerLogs';
import Settings from './pages/Settings/Settings';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useSelector((state) => state.auth);
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }
  
  return isAuthenticated ? children : <Navigate to="/login" />;
};

// Auth Check Component
const AuthCheck = ({ children }) => {
  const dispatch = useDispatch();
  const { isAuthenticated } = useSelector((state) => state.auth);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (token && !isAuthenticated) {
      dispatch(checkAuthStatus());
    }
  }, [dispatch, isAuthenticated]);

  return children;
};

// Create Material-UI theme
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

function AppContent() {
  return (
    <Router>
      <AuthCheck>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          
          {/* Protected Admin Routes */}
          <Route path="/admin" element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }>
            <Route index element={<Dashboard />} />
            <Route path="users" element={<UserManagement />} />
            <Route path="admins" element={<AdminManagement />} />
            <Route path="orders" element={<OrderManagement />} />
            <Route path="products" element={<ProductManagement />} />
            <Route path="sellers" element={<SellerManagement />} />
            <Route path="reviews" element={<ReviewManagement />} />
            <Route path="categories" element={<CategoryManagement />} />
            <Route path="escrow" element={<EscrowManagement />} />
            <Route path="disputes" element={<DisputeManagement />} />
            <Route path="inventory" element={<InventoryManagement />} />
            <Route path="stores" element={<StorePerformance />} />
            <Route path="complaints" element={<ComplaintsManagement />} />
            <Route path="refunds" element={<RefundsManagement />} />
            <Route path="privacy" element={<PrivacySettings />} />
            <Route path="finance" element={<FinancePanel />} />
            <Route path="audit" element={<AuditLogs />} />
            <Route path="server-logs" element={<ServerLogs />} />
            <Route path="settings" element={<Settings />} />
          </Route>
          
          {/* Redirect root to admin */}
          <Route path="/" element={<Navigate to="/admin" />} />
          
          {/* Catch all route */}
          <Route path="*" element={<Navigate to="/admin" />} />
        </Routes>
      </AuthCheck>
    </Router>
  );
}

function App() {
  return (
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <div className="App">
          <AppContent />
        </div>
        <Toaster position="top-right" />
      </ThemeProvider>
    </Provider>
  );
}

export default App;
