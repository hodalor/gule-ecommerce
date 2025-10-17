import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { fetchDashboardStatistics, fetchRecentActivities } from '../../store/slices/dashboardSlice';
import {
  UsersIcon,
  ShoppingBagIcon,
  CurrencyDollarIcon,
  ClipboardDocumentListIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  UserGroupIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  CubeIcon,
  ChartBarIcon,
  BellIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  TruckIcon,
  StarIcon
} from '@heroicons/react/24/outline';

const Dashboard = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { statistics, recentActivities, loading, error } = useSelector((state) => state.dashboard);

  useEffect(() => {
    dispatch(fetchDashboardStatistics());
    dispatch(fetchRecentActivities({ limit: 10 }));
  }, [dispatch]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">Error loading dashboard</div>
          <div className="text-gray-600 mb-4">{error}</div>
          <button 
            onClick={() => {
              dispatch(fetchDashboardStatistics());
              dispatch(fetchRecentActivities({ limit: 10 }));
            }}
            className="bg-primary-600 text-white px-4 py-2 rounded hover:bg-primary-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Transform statistics data for display
  const stats = [
    {
      name: 'Total Users',
      value: (statistics.users?.buyers?.total || 0) + (statistics.users?.sellers?.total || 0),
      change: '+12%',
      changeType: 'positive',
      icon: UsersIcon,
      color: 'bg-blue-500'
    },
    {
      name: 'Total Products',
      value: statistics.products?.total || 0,
      change: '+8%',
      changeType: 'positive',
      icon: ShoppingBagIcon,
      color: 'bg-green-500'
    },
    {
      name: 'Total Revenue',
      value: `$${(statistics.orders?.totalRevenue || 0).toLocaleString()}`,
      change: '+15%',
      changeType: 'positive',
      icon: CurrencyDollarIcon,
      color: 'bg-yellow-500'
    },
    {
      name: 'Total Orders',
      value: statistics.orders?.totalOrders || 0,
      change: '+10%',
      changeType: 'positive',
      icon: ChartBarIcon,
      color: 'bg-purple-500'
    },
    {
      name: 'Pending Orders',
      value: statistics.orders?.pendingOrders || 0,
      change: '-5%',
      changeType: 'negative',
      icon: TruckIcon,
      color: 'bg-orange-500'
    },
    {
      name: 'Average Rating',
      value: (statistics.reviews?.averageRating || 0).toFixed(1),
      change: '+0.2',
      changeType: 'positive',
      icon: StarIcon,
      color: 'bg-pink-500'
    }
  ];

  // Transform recent activities data for display
  const transformedActivities = recentActivities.map((activity, index) => ({
    id: activity._id || index,
    action: activity.action || 'Unknown action',
    user: activity.userId?.name || activity.userId?.email || 'System',
    time: new Date(activity.createdAt).toLocaleString(),
    type: activity.resourceType?.toLowerCase() || 'system',
    status: activity.severity === 'high' ? 'error' : 
            activity.severity === 'medium' ? 'warning' : 'success'
  }));

  const getActivityIcon = (type) => {
    switch (type) {
      case 'order':
        return <ShoppingBagIcon className="h-5 w-5 text-blue-500" />;
      case 'admin':
        return <UsersIcon className="h-5 w-5 text-green-500" />;
      case 'payment':
        return <CurrencyDollarIcon className="h-5 w-5 text-yellow-500" />;
      case 'review':
        return <ClipboardDocumentListIcon className="h-5 w-5 text-purple-500" />;
      case 'complaint':
        return <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />;
      case 'refund':
        return <ArrowPathIcon className="h-5 w-5 text-orange-500" />;
      case 'inventory':
        return <CubeIcon className="h-5 w-5 text-indigo-500" />;
      case 'user':
        return <UserGroupIcon className="h-5 w-5 text-blue-600" />;
      case 'store':
        return <ChartBarIcon className="h-5 w-5 text-purple-600" />;
      default:
        return <ClipboardDocumentListIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success':
      case 'completed':
      case 'approved':
        return <CheckCircleIcon className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <ClockIcon className="h-4 w-4 text-yellow-500" />;
      case 'pending':
        return <BellIcon className="h-4 w-4 text-blue-500" />;
      case 'error':
      case 'rejected':
        return <XCircleIcon className="h-4 w-4 text-red-500" />;
      default:
        return <ClockIcon className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Welcome back, {user?.fullName || 'Admin'}!
            </h1>
            <p className="text-gray-600 mt-1">
              Here's what's happening with your marketplace today.
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
            <p className="text-lg font-semibold text-gray-900">
              {user?.role || 'Admin'}
            </p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <Link 
            key={stat.name} 
            to={stat.link}
            className="bg-white shadow rounded-lg p-6 hover:shadow-lg transition-shadow duration-200 block"
          >
            <div className="flex items-center">
              <div className={`${stat.color} p-3 rounded-lg`}>
                <stat.icon className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4 flex-1">
                <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
            </div>
            <div className="mt-4 flex items-center">
              {stat.changeType === 'increase' ? (
                <ArrowTrendingUpIcon className="h-4 w-4 text-green-500" />
              ) : (
                  <ArrowTrendingDownIcon className="h-4 w-4 text-red-500" />
              )}
              <span
                className={`ml-1 text-sm font-medium ${
                  stat.changeType === 'increase' ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {stat.change}
              </span>
              <span className="ml-1 text-sm text-gray-500">from last month</span>
            </div>
          </Link>
        ))}
      </div>

      {/* Recent Activity and Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Recent Activity</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {transformedActivities.map((activity) => (
                <div key={activity.id} className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex-shrink-0">
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {activity.action}
                    </p>
                    <p className="text-sm text-gray-500">by {activity.user}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(activity.status)}
                    <div className="flex-shrink-0 text-sm text-gray-500">
                      {activity.time}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6">
              <button className="w-full text-center text-sm font-medium text-primary-600 hover:text-primary-500">
                View all activities
              </button>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Quick Actions</h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 gap-4">
              <Link 
                to="/admin/users"
                className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-blue-300 transition-all duration-200"
              >
                <UserGroupIcon className="h-8 w-8 text-blue-500 mb-2" />
                <span className="text-sm font-medium text-gray-900">Manage Users</span>
              </Link>
              <Link 
                to="/admin/complaints"
                className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-red-300 transition-all duration-200"
              >
                <ExclamationTriangleIcon className="h-8 w-8 text-red-500 mb-2" />
                <span className="text-sm font-medium text-gray-900">Handle Complaints</span>
              </Link>
              <Link 
                to="/admin/inventory"
                className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-indigo-300 transition-all duration-200"
              >
                <CubeIcon className="h-8 w-8 text-indigo-500 mb-2" />
                <span className="text-sm font-medium text-gray-900">Inventory</span>
              </Link>
              <Link 
                to="/admin/refunds"
                className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-orange-300 transition-all duration-200"
              >
                <ArrowPathIcon className="h-8 w-8 text-orange-500 mb-2" />
                <span className="text-sm font-medium text-gray-900">Process Refunds</span>
              </Link>
              <Link 
                to="/admin/stores"
                className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-purple-300 transition-all duration-200"
              >
                <ChartBarIcon className="h-8 w-8 text-purple-500 mb-2" />
                <span className="text-sm font-medium text-gray-900">Store Analytics</span>
              </Link>
              <Link 
                to="/admin/finance"
                className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-yellow-300 transition-all duration-200"
              >
                <CurrencyDollarIcon className="h-8 w-8 text-yellow-500 mb-2" />
                <span className="text-sm font-medium text-gray-900">Finance Panel</span>
              </Link>
              <Link 
                to="/admin/admins"
                className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-teal-300 transition-all duration-200"
              >
                <UsersIcon className="h-8 w-8 text-teal-500 mb-2" />
                <span className="text-sm font-medium text-gray-900">Admin Management</span>
              </Link>
              <Link 
                to="/admin/audit"
                className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all duration-200"
              >
                <ClipboardDocumentListIcon className="h-8 w-8 text-gray-500 mb-2" />
                <span className="text-sm font-medium text-gray-900">Audit Logs</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* System Status */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">System Status</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mb-3">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              </div>
              <h4 className="text-sm font-medium text-gray-900">API Status</h4>
              <p className="text-sm text-green-600">Operational</p>
            </div>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mb-3">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              </div>
              <h4 className="text-sm font-medium text-gray-900">Database</h4>
              <p className="text-sm text-green-600">Operational</p>
            </div>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-yellow-100 rounded-full mb-3">
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
              </div>
              <h4 className="text-sm font-medium text-gray-900">Payment Gateway</h4>
              <p className="text-sm text-yellow-600">Degraded</p>
            </div>
          </div>
        </div>
      </div>

      {/* System Alerts */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">System Alerts</h3>
            <BellIcon className="h-5 w-5 text-gray-400" />
          </div>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            <div className="flex items-start space-x-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-yellow-800">Low Stock Alert</p>
                <p className="text-sm text-yellow-700">15 products are running low on inventory</p>
                <Link to="/admin/inventory" className="text-sm text-yellow-600 hover:text-yellow-800 underline">
                  View Details
                </Link>
              </div>
            </div>
            <div className="flex items-start space-x-3 p-3 bg-red-50 border border-red-200 rounded-lg">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-500 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-800">Pending Complaints</p>
                <p className="text-sm text-red-700">8 complaints require immediate attention</p>
                <Link to="/admin/complaints" className="text-sm text-red-600 hover:text-red-800 underline">
                  Handle Now
                </Link>
              </div>
            </div>
            <div className="flex items-start space-x-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <BellIcon className="h-5 w-5 text-blue-500 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-800">New Seller Applications</p>
                <p className="text-sm text-blue-700">5 new sellers awaiting approval</p>
                <Link to="/admin/users" className="text-sm text-blue-600 hover:text-blue-800 underline">
                  Review Applications
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;