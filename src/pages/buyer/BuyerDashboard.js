import React from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  ShoppingBagIcon,
  TruckIcon,
  StarIcon,
  UserIcon,
  MapPinIcon,
  ExclamationTriangleIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';
import NotificationCenter from '../../components/notifications/NotificationCenter';
import BuyerOrders from './BuyerOrders';
import OrderTracking from './OrderTracking';
import BuyerProfile from './BuyerProfile';
import BuyerAddresses from './BuyerAddresses';
import BuyerReviews from './BuyerReviews';
import BuyerDisputes from './BuyerDisputes';

const BuyerDashboard = () => {
  const location = useLocation();
  const { user } = useSelector(state => state.auth);
  const { orders } = useSelector(state => state.orders);

  const navigation = [
    {
      name: 'Orders',
      href: '/buyer/dashboard/orders',
      icon: ShoppingBagIcon,
      count: orders?.length || 0
    },
    {
      name: 'Track Orders',
      href: '/buyer/dashboard/tracking',
      icon: TruckIcon
    },
    {
      name: 'Reviews & Ratings',
      href: '/buyer/dashboard/reviews',
      icon: StarIcon
    },
    {
      name: 'Disputes & Refunds',
      href: '/buyer/dashboard/disputes',
      icon: ExclamationTriangleIcon
    },
    {
      name: 'Profile',
      href: '/buyer/dashboard/profile',
      icon: UserIcon
    },
    {
      name: 'Addresses',
      href: '/buyer/dashboard/addresses',
      icon: MapPinIcon
    }
  ];

  const isActive = (href) => {
    return location.pathname === href || location.pathname.startsWith(href + '/');
  };

  // Quick stats for dashboard overview
  const stats = [
    {
      name: 'Total Orders',
      value: orders?.length || 0,
      icon: ShoppingBagIcon,
      color: 'bg-blue-500'
    },
    {
      name: 'Pending Orders',
      value: orders?.filter(order => order.status === 'pending')?.length || 0,
      icon: TruckIcon,
      color: 'bg-yellow-500'
    },
    {
      name: 'Completed Orders',
      value: orders?.filter(order => order.status === 'completed')?.length || 0,
      icon: ChartBarIcon,
      color: 'bg-green-500'
    },
    {
      name: 'Reviews Given',
      value: 0, // This would come from reviews data
      icon: StarIcon,
      color: 'bg-purple-500'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Welcome back, {user?.name}!
              </h1>
              <p className="text-gray-600 mt-2">
                Manage your orders, track deliveries, and update your profile.
              </p>
            </div>
            <NotificationCenter />
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Navigation */}
          <div className="lg:w-64 flex-shrink-0">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <nav className="space-y-2">
                {navigation.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        isActive(item.href)
                          ? 'bg-primary-100 text-primary-700'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="h-5 w-5" />
                        <span>{item.name}</span>
                      </div>
                      {item.count !== undefined && item.count > 0 && (
                        <span className="bg-primary-600 text-white text-xs px-2 py-1 rounded-full">
                          {item.count}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow-sm p-6 mt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Quick Actions
              </h3>
              <div className="space-y-3">
                <Link
                  to="/"
                  className="block w-full text-left px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  Continue Shopping
                </Link>
                <Link
                  to="/buyer/dashboard/tracking"
                  className="block w-full text-left px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Track Latest Order
                </Link>
                <Link
                  to="/buyer/dashboard/profile"
                  className="block w-full text-left px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Update Profile
                </Link>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            <Routes>
              <Route path="/" element={<DashboardOverview stats={stats} />} />
              <Route path="/orders/*" element={<BuyerOrders />} />
              <Route path="/tracking/*" element={<OrderTracking />} />
              <Route path="/reviews/*" element={<BuyerReviews />} />
              <Route path="/disputes/*" element={<BuyerDisputes />} />
              <Route path="/profile/*" element={<BuyerProfile />} />
              <Route path="/addresses/*" element={<BuyerAddresses />} />
            </Routes>
          </div>
        </div>
      </div>
    </div>
  );
};

// Dashboard Overview Component
const DashboardOverview = ({ stats }) => {
  const { orders } = useSelector(state => state.orders);
  
  // Get recent orders (last 5)
  const recentOrders = orders?.slice(0, 5) || [];

  return (
    <div className="space-y-8">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.name} className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    {stat.name}
                  </p>
                  <p className="text-3xl font-bold text-gray-900">
                    {stat.value}
                  </p>
                </div>
                <div className={`p-3 rounded-full ${stat.color}`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Orders */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              Recent Orders
            </h2>
            <Link
              to="/buyer/dashboard/orders"
              className="text-primary-600 hover:text-primary-700 text-sm font-medium"
            >
              View all orders
            </Link>
          </div>
        </div>
        
        <div className="p-6">
          {recentOrders.length > 0 ? (
            <div className="space-y-4">
              {recentOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center gap-4">
                    <img
                      src={order.items[0]?.image}
                      alt={order.items[0]?.name}
                      className="w-12 h-12 object-cover rounded-lg"
                    />
                    <div>
                      <p className="font-medium text-gray-900">
                        Order #{order.id}
                      </p>
                      <p className="text-sm text-gray-600">
                        {order.items.length} item{order.items.length > 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <p className="font-medium text-gray-900">
                      ₦{order.total.toLocaleString()}
                    </p>
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      order.status === 'completed' ? 'bg-green-100 text-green-800' :
                      order.status === 'shipped' ? 'bg-blue-100 text-blue-800' :
                      order.status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <ShoppingBagIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                No orders yet
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Start shopping to see your orders here.
              </p>
              <div className="mt-6">
                <Link
                  to="/"
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
                >
                  Start Shopping
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick Tips */}
      <div className="bg-gradient-to-r from-primary-50 to-primary-100 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-primary-900 mb-4">
          💡 Quick Tips
        </h3>
        <ul className="space-y-2 text-primary-800">
          <li>• Track your orders in real-time using the tracking page</li>
          <li>• Rate your purchases to help other buyers make informed decisions</li>
          <li>• Keep your delivery addresses updated for faster checkout</li>
          <li>• Contact sellers directly if you have questions about products</li>
        </ul>
      </div>
    </div>
  );
};

export default BuyerDashboard;