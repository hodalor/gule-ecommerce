import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { 
  HomeIcon,
  CubeIcon,
  ShoppingBagIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  UserIcon,
  CurrencyDollarIcon,
  EyeIcon,
  ExclamationTriangleIcon,
  ArchiveBoxIcon,
  ClipboardDocumentListIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import { fetchUserOrders } from '../../store/slices/orderSlice';
import { fetchProducts } from '../../store/slices/productSlice';
import NotificationCenter from '../../components/notifications/NotificationCenter';

// Import seller components (to be created)
import SellerProducts from './SellerProducts';
import SellerOrders from './SellerOrders';
import SellerAnalytics from './SellerAnalytics';
import SellerProfile from './SellerProfile';
import SellerSettings from './SellerSettings';
import SellerInventory from './SellerInventory';
import SellerReports from './SellerReports';

const SellerDashboard = () => {
  const dispatch = useDispatch();
  const location = useLocation();
  const { user } = useSelector((state) => state.auth);
  const { orders } = useSelector((state) => state.orders);
  const { products } = useSelector((state) => state.products);

  useEffect(() => {
    if (user?.id) {
      dispatch(fetchUserOrders({ userId: user.id, userType: 'seller' }));
      dispatch(fetchProducts({ seller: user.id }));
    }
  }, [dispatch, user?.id]);

  // Calculate real stats from Redux data
  const stats = {
    totalProducts: products?.length || 0,
    totalOrders: orders?.length || 0,
    totalRevenue: orders?.reduce((sum, order) => sum + (order.total || 0), 0) || 0,
    pendingOrders: orders?.filter(order => order.status === 'pending')?.length || 0,
    lowStockProducts: products?.filter(product => product.stock <= (product.lowStockThreshold || 5))?.length || 0,
    totalViews: products?.reduce((sum, product) => sum + (product.views || 0), 0) || 0,
    conversionRate: orders?.length > 0 && products?.length > 0 ? 
      ((orders.length / products.reduce((sum, product) => sum + (product.views || 0), 0)) * 100).toFixed(1) : 0
  };

  // Get recent orders from Redux (last 5)
  const recentOrders = orders?.slice(0, 5) || [];

  // Get low stock products from Redux
  const lowStockProducts = products?.filter(product => 
    product.stock <= (product.lowStockThreshold || 5)
  ).slice(0, 5) || [];

  const sidebarItems = [
    { path: '/seller/dashboard', icon: HomeIcon, label: 'Overview', exact: true },
    { path: '/seller/dashboard/products', icon: CubeIcon, label: 'My Products' },
    { path: '/seller/dashboard/orders', icon: ShoppingBagIcon, label: 'Orders' },
    { path: '/seller/dashboard/inventory', icon: ArchiveBoxIcon, label: 'Inventory' },
    { path: '/seller/dashboard/analytics', icon: ChartBarIcon, label: 'Analytics' },
    { path: '/seller/dashboard/reports', icon: ClipboardDocumentListIcon, label: 'Reports' },
    { path: '/seller/dashboard/profile', icon: UserIcon, label: 'Profile' },
    { path: '/seller/dashboard/settings', icon: Cog6ToothIcon, label: 'Settings' }
  ];

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      processing: 'bg-blue-100 text-blue-800',
      shipped: 'bg-purple-100 text-purple-800',
      delivered: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const isActive = (path, exact = false) => {
    if (exact) {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 bg-white shadow-lg">
          <div className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">S</span>
              </div>
              <div>
                <h2 className="font-semibold text-gray-900">Seller Dashboard</h2>
                <p className="text-sm text-gray-600">{user?.businessName || user?.name}</p>
              </div>
            </div>
          </div>

          <nav className="px-4 pb-4">
            <ul className="space-y-2">
              {sidebarItems.map((item) => {
                const IconComponent = item.icon;
                return (
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                        isActive(item.path, item.exact)
                          ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <IconComponent className="h-5 w-5" />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1">
          {/* Header */}
          <header className="bg-white shadow-sm border-b border-gray-200">
            <div className="px-6 py-4">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    {location.pathname === '/seller/dashboard' ? 'Dashboard Overview' : 
                     location.pathname.includes('/products') ? 'My Products' :
                     location.pathname.includes('/orders') ? 'Orders' :
                     location.pathname.includes('/inventory') ? 'Inventory Management' :
                     location.pathname.includes('/analytics') ? 'Analytics' :
                     location.pathname.includes('/reports') ? 'Reports' :
                     location.pathname.includes('/profile') ? 'Profile' :
                     location.pathname.includes('/settings') ? 'Settings' : 'Dashboard'}
                  </h1>
                  <p className="text-gray-600">
                    Welcome back, {user?.name}! Here's what's happening with your store.
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <NotificationCenter />
                  <div className="flex items-center gap-3">
                    <img
                      src={user?.avatar || `https://ui-avatars.com/api/?name=${user?.name}&background=3b82f6&color=fff`}
                      alt={user?.name}
                      className="w-8 h-8 rounded-full"
                    />
                    <span className="text-sm font-medium text-gray-700">{user?.name}</span>
                  </div>
                </div>
              </div>
            </div>
          </header>

          {/* Page Content */}
          <main className="p-6">
            <Routes>
              <Route path="/" element={
                <div className="space-y-6">
                  {/* Stats Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-white rounded-lg shadow-md p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Total Products</p>
                          <p className="text-2xl font-bold text-gray-900">{stats.totalProducts}</p>
                        </div>
                        <div className="p-3 bg-blue-100 rounded-full">
                          <CubeIcon className="h-6 w-6 text-blue-600" />
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-lg shadow-md p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Total Orders</p>
                          <p className="text-2xl font-bold text-gray-900">{stats.totalOrders}</p>
                        </div>
                        <div className="p-3 bg-green-100 rounded-full">
                          <ShoppingBagIcon className="h-6 w-6 text-green-600" />
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-lg shadow-md p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                          <p className="text-2xl font-bold text-gray-900">${stats.totalRevenue.toLocaleString()}</p>
                        </div>
                        <div className="p-3 bg-yellow-100 rounded-full">
                          <CurrencyDollarIcon className="h-6 w-6 text-yellow-600" />
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-lg shadow-md p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Pending Orders</p>
                          <p className="text-2xl font-bold text-gray-900">{stats.pendingOrders}</p>
                        </div>
                        <div className="p-3 bg-red-100 rounded-full">
                          <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Additional Stats */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white rounded-lg shadow-md p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Product Views</p>
                          <p className="text-xl font-bold text-gray-900">{stats.totalViews.toLocaleString()}</p>
                          <p className="text-sm text-green-600">+12% from last month</p>
                        </div>
                        <EyeIcon className="h-8 w-8 text-gray-400" />
                      </div>
                    </div>

                    <div className="bg-white rounded-lg shadow-md p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Conversion Rate</p>
                          <p className="text-xl font-bold text-gray-900">{stats.conversionRate}%</p>
                          <p className="text-sm text-green-600">+0.5% from last month</p>
                        </div>
                        <ChartBarIcon className="h-8 w-8 text-gray-400" />
                      </div>
                    </div>

                    <div className="bg-white rounded-lg shadow-md p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Low Stock Items</p>
                          <p className="text-xl font-bold text-gray-900">{stats.lowStockProducts}</p>
                          <p className="text-sm text-red-600">Needs attention</p>
                        </div>
                        <ExclamationTriangleIcon className="h-8 w-8 text-red-400" />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Recent Orders */}
                    <div className="bg-white rounded-lg shadow-md">
                      <div className="p-6 border-b border-gray-200">
                        <div className="flex justify-between items-center">
                          <h3 className="text-lg font-semibold text-gray-900">Recent Orders</h3>
                          <Link
                            to="/seller/dashboard/orders"
                            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                          >
                            View All
                          </Link>
                        </div>
                      </div>
                      <div className="p-6">
                        <div className="space-y-4">
                          {recentOrders.length > 0 ? (
                            recentOrders.map((order) => (
                              <div key={order._id || order.id} className="flex items-center justify-between">
                                <div>
                                  <p className="font-medium text-gray-900">{order._id || order.id}</p>
                                  <p className="text-sm text-gray-600">
                                    {order.customer?.name || order.customerName || 'Customer'} • 
                                    {order.items?.[0]?.name || order.productName || 'Product'}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="font-medium text-gray-900">${order.total || order.amount || 0}</p>
                                  <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                                    {order.status}
                                  </span>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="text-center py-8">
                              <ShoppingBagIcon className="mx-auto h-12 w-12 text-gray-400" />
                              <h3 className="mt-2 text-sm font-medium text-gray-900">No recent orders</h3>
                              <p className="mt-1 text-sm text-gray-500">Orders will appear here once customers start purchasing.</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Low Stock Alert */}
                    <div className="bg-white rounded-lg shadow-md">
                      <div className="p-6 border-b border-gray-200">
                        <div className="flex justify-between items-center">
                          <h3 className="text-lg font-semibold text-gray-900">Low Stock Alert</h3>
                          <Link
                            to="/seller/dashboard/products"
                            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                          >
                            Manage Inventory
                          </Link>
                        </div>
                      </div>
                      <div className="p-6">
                        <div className="space-y-4">
                          {lowStockProducts.length > 0 ? (
                            lowStockProducts.map((product) => (
                              <div key={product._id || product.id} className="flex items-center justify-between">
                                <div>
                                  <p className="font-medium text-gray-900">{product.name}</p>
                                  <p className="text-sm text-gray-600">Min stock: {product.lowStockThreshold || 5}</p>
                                </div>
                                <div className="text-right">
                                  <span className="inline-block px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                    {product.stock || 0} left
                                  </span>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="text-center py-8">
                              <CheckCircleIcon className="mx-auto h-12 w-12 text-green-400" />
                              <h3 className="mt-2 text-sm font-medium text-gray-900">All products in stock</h3>
                              <p className="mt-1 text-sm text-gray-500">Your inventory levels are healthy.</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              } />
              <Route path="/products/*" element={<SellerProducts />} />
              <Route path="/orders/*" element={<SellerOrders />} />
              <Route path="/inventory/*" element={<SellerInventory />} />
              <Route path="/analytics/*" element={<SellerAnalytics />} />
              <Route path="/reports/*" element={<SellerReports />} />
              <Route path="/profile/*" element={<SellerProfile />} />
              <Route path="/settings/*" element={<SellerSettings />} />
            </Routes>
          </main>
        </div>
      </div>
    </div>
  );
};

export default SellerDashboard;