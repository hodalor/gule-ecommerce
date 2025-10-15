import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  ChartBarIcon,
  CurrencyDollarIcon,
  ShoppingBagIcon,
  UsersIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  EyeIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';
import { 
  fetchSellerReports, 
  fetchSalesData, 
  fetchProductPerformance 
} from '../../store/slices/reportsSlice';

const SellerAnalytics = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { 
    stats, 
    salesData, 
    productPerformance 
  } = useSelector((state) => state.reports);
  
  const [dateRange, setDateRange] = useState('7d');
  const [selectedMetric, setSelectedMetric] = useState('revenue');

  // Fetch analytics data on component mount and when dateRange changes
  useEffect(() => {
    if (user?.id) {
      dispatch(fetchSellerReports({ sellerId: user.id, dateRange }));
      dispatch(fetchSalesData({ sellerId: user.id, dateRange }));
      dispatch(fetchProductPerformance({ sellerId: user.id, dateRange }));
    }
  }, [dispatch, user?.id, dateRange]);

  // Clear errors on unmount
  useEffect(() => {
    return () => {
      // Clear any errors when component unmounts
    };
  }, []);

  const dateRangeOptions = [
    { value: '7d', label: 'Last 7 days' },
    { value: '30d', label: 'Last 30 days' },
    { value: '90d', label: 'Last 3 months' },
    { value: '1y', label: 'Last year' }
  ];

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatPercentage = (value) => {
    return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  const getChangeIcon = (change) => {
    return change > 0 ? (
      <ArrowTrendingUpIcon className="h-4 w-4 text-green-500" />
            ) : (
              <ArrowTrendingDownIcon className="h-4 w-4 text-red-500" />
    );
  };

  const getChangeColor = (change) => {
    return change > 0 ? 'text-green-600' : 'text-red-600';
  };

  // Simple chart component (in a real app, use a proper charting library like Chart.js or Recharts)
  const SimpleChart = ({ data, metric }) => {
    const maxValue = Math.max(...data.map(d => d[metric]));
    
    return (
      <div className="flex items-end justify-between h-32 gap-1">
        {data.map((item, index) => (
          <div key={index} className="flex flex-col items-center flex-1">
            <div
              className="bg-blue-500 rounded-t w-full min-h-[4px] transition-all duration-300"
              style={{
                height: `${(item[metric] / maxValue) * 100}%`
              }}
            />
            <span className="text-xs text-gray-500 mt-1">
              {new Date(item.date).toLocaleDateString('en-US', { weekday: 'short' })}
            </span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-600 mt-1">Track your store performance and insights</p>
        </div>
        <div className="flex gap-3">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {dateRangeOptions.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Export Report
          </button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center justify-between mb-2">
            <div className="bg-green-100 p-2 rounded-lg">
              <CurrencyDollarIcon className="h-6 w-6 text-green-600" />
            </div>
            {getChangeIcon(stats.revenueChange || 0)}
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">
              {formatCurrency(stats.totalRevenue || 0)}
            </p>
            <p className="text-sm text-gray-600">Total Revenue</p>
            <p className={`text-sm ${getChangeColor(stats.revenueChange || 0)}`}>
              {formatPercentage(stats.revenueChange || 0)}
            </p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center justify-between mb-2">
            <div className="bg-blue-100 p-2 rounded-lg">
              <ShoppingBagIcon className="h-6 w-6 text-blue-600" />
            </div>
            {getChangeIcon(stats.ordersChange || 0)}
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{stats.totalOrders || 0}</p>
            <p className="text-sm text-gray-600">Total Orders</p>
            <p className={`text-sm ${getChangeColor(stats.ordersChange || 0)}`}>
              {formatPercentage(stats.ordersChange || 0)}
            </p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center justify-between mb-2">
            <div className="bg-purple-100 p-2 rounded-lg">
              <UsersIcon className="h-6 w-6 text-purple-600" />
            </div>
            {getChangeIcon(stats.customersChange || 0)}
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{stats.totalCustomers || 0}</p>
            <p className="text-sm text-gray-600">Total Customers</p>
            <p className={`text-sm ${getChangeColor(stats.customersChange || 0)}`}>
              {formatPercentage(stats.customersChange || 0)}
            </p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center justify-between mb-2">
            <div className="bg-yellow-100 p-2 rounded-lg">
              <ChartBarIcon className="h-6 w-6 text-yellow-600" />
            </div>
            {getChangeIcon(stats.avgOrderValueChange || 0)}
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">
              {formatCurrency(stats.avgOrderValue || 0)}
            </p>
            <p className="text-sm text-gray-600">Avg Order Value</p>
            <p className={`text-sm ${getChangeColor(stats.avgOrderValueChange || 0)}`}>
              {formatPercentage(stats.avgOrderValueChange || 0)}
            </p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center justify-between mb-2">
            <div className="bg-indigo-100 p-2 rounded-lg">
              <ArrowTrendingUpIcon className="h-6 w-6 text-indigo-600" />
            </div>
            {getChangeIcon(0)}
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">0%</p>
            <p className="text-sm text-gray-600">Conversion Rate</p>
            <p className={`text-sm ${getChangeColor(0)}`}>
              {formatPercentage(0)}
            </p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center justify-between mb-2">
            <div className="bg-pink-100 p-2 rounded-lg">
              <EyeIcon className="h-6 w-6 text-pink-600" />
            </div>
            {getChangeIcon(0)}
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">0</p>
            <p className="text-sm text-gray-600">Total Views</p>
            <p className={`text-sm ${getChangeColor(0)}`}>
              {formatPercentage(0)}
            </p>
          </div>
        </div>
      </div>

      {/* Sales Chart */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Sales Trend</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedMetric('revenue')}
              className={`px-3 py-1 rounded text-sm ${
                selectedMetric === 'revenue'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Revenue
            </button>
            <button
              onClick={() => setSelectedMetric('orders')}
              className={`px-3 py-1 rounded text-sm ${
                selectedMetric === 'orders'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Orders
            </button>
            <button
              onClick={() => setSelectedMetric('customers')}
              className={`px-3 py-1 rounded text-sm ${
                selectedMetric === 'customers'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Customers
            </button>
          </div>
        </div>
        <SimpleChart data={salesData} metric={selectedMetric} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Top Performing Products</h2>
          <div className="space-y-4">
            {productPerformance && productPerformance.length > 0 ? (
              productPerformance.slice(0, 5).map((product, index) => (
                <div key={product.id || product._id || index} className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center gap-3 flex-1">
                    <span className="text-lg font-bold text-gray-400">#{index + 1}</span>
                    <img
                      src={product.image || '/placeholder-product.jpg'}
                      alt={product.name || 'Product'}
                      className="w-12 h-12 object-cover rounded-lg"
                    />
                    <div>
                      <h3 className="font-medium text-gray-900">{product.name || 'Unknown Product'}</h3>
                      <p className="text-sm text-gray-600">
                        {product.orders || 0} orders • {product.views || 0} views
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">{formatCurrency(product.revenue || 0)}</p>
                    <p className="text-sm text-gray-600">{product.conversionRate || 0}% conversion</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                No product performance data available
              </div>
            )}
          </div>
        </div>

        {/* Customer Insights */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Customer Insights</h2>
          <div className="space-y-6">
            {/* Customer Types */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Customer Types</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">{stats.newCustomers || 0}</p>
                  <p className="text-sm text-gray-600">New Customers</p>
                </div>
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">{stats.returningCustomers || 0}</p>
                  <p className="text-sm text-gray-600">Returning</p>
                </div>
              </div>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 gap-4">
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-600">Retention Rate</span>
                <span className="font-semibold text-gray-900">{stats.retentionRate || 0}%</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-600">Avg Lifetime Value</span>
                <span className="font-semibold text-gray-900">{formatCurrency(stats.avgLifetimeValue || 0)}</span>
              </div>
            </div>

            {/* Top Locations */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Top Locations</h3>
              <div className="space-y-2">
                {stats.topLocations && stats.topLocations.length > 0 ? (
                  stats.topLocations.slice(0, 3).map((location, index) => (
                    <div key={location.city || index} className="flex justify-between items-center">
                      <span className="text-sm text-gray-900">{location.city || 'Unknown'}</span>
                      <div className="text-right">
                        <span className="text-sm font-medium text-gray-900">{formatCurrency(location.revenue || 0)}</span>
                        <span className="text-xs text-gray-600 ml-2">({location.orders || 0} orders)</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 text-gray-500">
                    No location data available
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Traffic Sources */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Traffic Sources</h2>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {stats.trafficSources && stats.trafficSources.length > 0 ? (
            stats.trafficSources.map((source, index) => (
              <div key={source.source || index} className="text-center">
                <div className="bg-gray-100 rounded-lg p-4 mb-3">
                  <p className="text-2xl font-bold text-gray-900">{(source.visits || 0).toLocaleString()}</p>
                  <p className="text-sm text-gray-600">{source.percentage || 0}%</p>
                </div>
                <p className="text-sm font-medium text-gray-900">{source.source || 'Unknown'}</p>
              </div>
            ))
          ) : (
            <div className="col-span-5 text-center py-8 text-gray-500">
              No traffic source data available
            </div>
          )}
        </div>
      </div>

      {/* Performance Tips */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Performance Tips</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-lg">
            <div className="flex items-center gap-3 mb-2">
              <ArrowTrendingUpIcon className="h-5 w-5 text-green-500" />
              <h3 className="font-medium text-gray-900">Boost Conversions</h3>
            </div>
            <p className="text-sm text-gray-600">
              Consider optimizing product images and descriptions to improve conversion rates.
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg">
            <div className="flex items-center gap-3 mb-2">
              <EyeIcon className="h-5 w-5 text-blue-500" />
              <h3 className="font-medium text-gray-900">Increase Visibility</h3>
            </div>
            <p className="text-sm text-gray-600">
              Your top product has great conversion. Consider promoting similar items to increase overall sales.
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg">
            <div className="flex items-center gap-3 mb-2">
              <UsersIcon className="h-5 w-5 text-purple-500" />
              <h3 className="font-medium text-gray-900">Customer Retention</h3>
            </div>
            <p className="text-sm text-gray-600">
              {stats.retentionRate || 0}% retention rate. Consider loyalty programs to improve it further.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SellerAnalytics;